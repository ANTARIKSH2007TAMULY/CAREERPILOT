import { Worker } from 'bullmq';
import { getBullmqConnection, pingRedis } from '../config/redis.js';
import { searchAggregatedJobs } from '../services/jobs/jobAggregator.js';
import { analyzeResume } from '../services/ai/aiService.js';
import {
  buildApplicationReminderEmail,
  buildInterviewReminderEmail,
  buildJobAlertEmail,
  canSendEmail,
  sendEmail,
} from '../services/email/resendService.js';
import { sendInterviewReminderNow } from '../services/interview/interviewScheduler.js';
import { safeErrorMessage } from '../utils/redact.js';

let workers = [];

const workerOptions = {
  concurrency: 2,
  lockDuration: 30000,
};

const processJobSync = async (job) => {
  const result = await searchAggregatedJobs({
    keyword: job.data?.keyword || '',
    location: job.data?.location || '',
    page: 1,
    source: job.data?.source || 'all',
    phase: job.data?.phase || 'primary',
  });
  return {
    success: true,
    task: job.name,
    counts: result.providers,
  };
};

const processAiTask = async (job) => {
  if (job.name === 'resume-analysis') {
    const analysis = await analyzeResume({ user: job.data?.user || {} });
    return { success: true, provider: analysis.provider };
  }
  return { success: true, task: job.name, skipped: true };
};

const processNotification = async (job) => {
  const user = job.data?.user;

  if (job.name === 'job-alert') {
    if (!canSendEmail(user, 'jobAlerts')) {
      return { success: true, skipped: true, reason: 'notifications-disabled' };
    }
    const payload = buildJobAlertEmail({ user, jobs: job.data?.jobs || [] });
    if (!job.data?.allowSend) {
      return { success: true, dryRun: true, subject: payload.subject };
    }
    const sent = await sendEmail(payload, { allowSend: true });
    return { success: true, duplicate: sent.duplicate, id: sent.id };
  }

  if (job.name === 'interview-reminder') {
    if (job.data?.interviewId) {
      return sendInterviewReminderNow({
        interviewId: job.data.interviewId,
        interval: job.data.interval || '1d',
        allowSend: job.data.allowSend !== false,
      });
    }
    if (!canSendEmail(user, 'interviewReminders')) {
      return { success: true, skipped: true, reason: 'notifications-disabled' };
    }
    const payload = buildInterviewReminderEmail({ user, application: job.data?.application });
    if (!job.data?.allowSend) {
      return { success: true, dryRun: true, subject: payload.subject };
    }
    const sent = await sendEmail(payload, { allowSend: true });
    return { success: true, duplicate: sent.duplicate, id: sent.id };
  }

  if (job.name === 'application-reminder') {
    if (!canSendEmail(user, 'applicationReminders')) {
      return { success: true, skipped: true, reason: 'notifications-disabled' };
    }
    const payload = buildApplicationReminderEmail({ user, application: job.data?.application });
    if (!job.data?.allowSend) {
      return { success: true, dryRun: true, subject: payload.subject };
    }
    const sent = await sendEmail(payload, { allowSend: true });
    return { success: true, duplicate: sent.duplicate, id: sent.id };
  }

  return { success: true, task: job.name, skipped: true };
};

export const startWorkers = async () => {
  const connection = getBullmqConnection();
  const redisOk = await pingRedis();
  if (!connection || !redisOk) {
    console.log('BullMQ workers skipped because Redis is unavailable.');
    return [];
  }

  workers = [
    new Worker('jobSyncQueue', processJobSync, { connection, ...workerOptions }),
    new Worker('aiQueue', processAiTask, { connection, ...workerOptions }),
    new Worker('notificationQueue', processNotification, { connection, ...workerOptions }),
  ];

  workers.forEach((worker) => {
    worker.on('failed', (job, err) => {
      console.error(`Worker ${job?.queueName || 'unknown'}/${job?.name || 'unknown'} failed:`, safeErrorMessage(err));
    });
  });

  const shutdown = async () => {
    await Promise.all(workers.map((worker) => worker.close()));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  console.log('BullMQ workers started: jobSyncQueue, aiQueue, notificationQueue');
  return workers;
};

export const closeWorkers = async () => {
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
};

export const getWorkerNames = () => ['jobSyncQueue', 'aiQueue', 'notificationQueue'];
