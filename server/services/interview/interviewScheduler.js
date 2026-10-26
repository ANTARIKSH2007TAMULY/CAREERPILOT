import Interview from '../../models/Interview.js';
import Application from '../../models/Application.js';
import User from '../../models/User.js';
import { isMongoConnected } from '../../config/db.js';
import {
  findDemoInterviewById,
  findDemoInterviewsByUser,
  getDemoInterviewsStore,
  updateDemoInterview,
} from '../../config/demoInterviews.js';
import { findDemoApplicationById } from '../../config/demoApplications.js';
import { findDemoUserById } from '../../config/demoUsers.js';
import { notificationQueue } from '../../queues/queue.js';
import {
  buildInterviewReminderEmail,
  canSendEmail,
  hasResendCredentials,
  sendEmail,
} from '../email/resendService.js';
import { safeErrorMessage } from '../../utils/redact.js';

export const REMINDER_OFFSETS_MS = {
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1h': 1 * 60 * 60 * 1000,
};

export const INTERVAL_KEYS = ['3d', '1d', '6h', '1h'];

export const generateReminderJobId = (interviewId, interval) =>
  `reminder:${String(interviewId)}:${interval}`;

export const calculateReminders = ({
  startTime,
  preferences = {},
  now = new Date(),
}) => {
  const startMs = new Date(startTime).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  return INTERVAL_KEYS.map((interval) => {
    const offset = REMINDER_OFFSETS_MS[interval];
    const dueTime = new Date(startMs - offset);
    const enabled = preferences[interval] !== false;

    let status = 'SCHEDULED';
    let error = null;

    if (!enabled) {
      status = 'SKIPPED';
      error = 'Reminder disabled by user preference';
    } else if (dueTime.getTime() <= nowMs) {
      status = 'SKIPPED';
      error = 'Reminder due time has already passed';
    }

    return {
      interval,
      dueTime,
      enabled,
      status,
      jobId: '',
      sentAt: null,
      error,
      attempts: 0,
      resendId: null,
    };
  });
};

export const scheduleRemindersForInterview = async (
  interview,
  { now = new Date() } = {}
) => {
  if (!interview || !Array.isArray(interview.reminders)) return [];
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const scheduledJobs = [];

  for (const reminder of interview.reminders) {
    if (reminder.status !== 'SCHEDULED' || reminder.enabled === false) {
      continue;
    }

    const dueMs = new Date(reminder.dueTime).getTime();
    if (dueMs <= nowMs) {
      reminder.status = 'SKIPPED';
      reminder.error = 'Reminder due time has already passed';
      continue;
    }

    const jobId = generateReminderJobId(interview._id, reminder.interval);
    reminder.jobId = jobId;

    if (notificationQueue) {
      const delay = Math.max(0, dueMs - nowMs);
      try {
        await notificationQueue.add(
          'interview-reminder',
          {
            interviewId: String(interview._id),
            interval: reminder.interval,
            userId: String(interview.user),
            allowSend: true,
          },
          {
            jobId,
            delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        );
        scheduledJobs.push(jobId);
      } catch (err) {
        console.warn(`[BullMQ] Failed to enqueue reminder ${jobId}:`, safeErrorMessage(err));
      }
    }
  }

  return scheduledJobs;
};

export const cancelRemindersForInterview = async (interview) => {
  if (!interview || !Array.isArray(interview.reminders)) return;

  for (const reminder of interview.reminders) {
    if (reminder.status === 'SCHEDULED') {
      reminder.status = 'CANCELLED';

      if (notificationQueue && reminder.jobId) {
        try {
          const job = await notificationQueue.getJob(reminder.jobId);
          if (job) {
            await job.remove();
          }
        } catch (err) {
          console.warn(`[BullMQ] Notice removing job ${reminder.jobId}:`, safeErrorMessage(err));
        }
      }
    }
  }
};

export const sendInterviewReminderNow = async ({
  interviewId,
  interval,
  allowSend = true,
}) => {
  let interview = null;
  let application = null;
  let user = null;

  if (isMongoConnected()) {
    interview = await Interview.findById(interviewId);
    if (!interview) {
      return { success: false, skipped: true, reason: 'interview-not-found' };
    }
    application = await Application.findById(interview.application);
    user = await User.findById(interview.user);
  } else {
    interview = findDemoInterviewById(interviewId);
    if (!interview) {
      return { success: false, skipped: true, reason: 'interview-not-found' };
    }
    application = findDemoApplicationById(interview.application, interview.user);
    user = findDemoUserById(interview.user);
  }

  // Verify interview is still active and scheduled
  if (interview.status !== 'SCHEDULED') {
    return {
      success: true,
      skipped: true,
      reason: `interview-status-is-${interview.status}`,
    };
  }

  const reminder = (interview.reminders || []).find((r) => r.interval === interval);
  if (!reminder) {
    return { success: false, skipped: true, reason: 'reminder-not-found' };
  }

  if (reminder.status === 'SENT') {
    return { success: true, duplicate: true, id: reminder.resendId };
  }

  if (reminder.status === 'CANCELLED' || reminder.status === 'SKIPPED') {
    return { success: true, skipped: true, reason: `reminder-was-${reminder.status}` };
  }

  if (reminder.enabled === false) {
    reminder.status = 'SKIPPED';
    reminder.error = 'Reminder disabled';
    if (isMongoConnected()) await interview.save();
    return { success: true, skipped: true, reason: 'reminder-disabled' };
  }

  // Check user notification preferences
  if (!canSendEmail(user, 'interviewReminders')) {
    reminder.status = 'SKIPPED';
    reminder.error = 'User disabled interview email notifications';
    if (isMongoConnected()) await interview.save();
    return { success: true, skipped: true, reason: 'user-notifications-disabled' };
  }

  // Duplicate-delivery lease: mark as SENDING or check attempt count
  reminder.attempts = (reminder.attempts || 0) + 1;

  const payload = buildInterviewReminderEmail({
    user,
    application,
    interview,
    interval,
  });

  if (!allowSend) {
    return { success: true, dryRun: true, subject: payload.subject };
  }

  try {
    const sent = await sendEmail(payload, { allowSend: true });
    reminder.status = 'SENT';
    reminder.sentAt = new Date();
    reminder.resendId = sent.id;
    reminder.error = null;

    if (isMongoConnected()) {
      await interview.save();
    } else {
      updateDemoInterview(interview._id, { reminders: interview.reminders });
    }

    return { success: true, duplicate: sent.duplicate, id: sent.id };
  } catch (err) {
    reminder.status = 'FAILED';
    reminder.error = safeErrorMessage(err);

    if (isMongoConnected()) {
      await interview.save();
    } else {
      updateDemoInterview(interview._id, { reminders: interview.reminders });
    }

    throw err;
  }
};

export const reconcilePendingReminders = async () => {
  if (!notificationQueue) {
    console.log('[Scheduler] Redis queue offline; reminder reconciliation deferred.');
    return { reconciled: 0, skipped: 0 };
  }

  const now = new Date();
  let countReconciled = 0;
  let countSkipped = 0;

  try {
    if (isMongoConnected()) {
      const pendingInterviews = await Interview.find({
        status: 'SCHEDULED',
        'reminders.status': 'SCHEDULED',
      });

      for (const interview of pendingInterviews) {
        let changed = false;
        for (const reminder of interview.reminders) {
          if (reminder.status === 'SCHEDULED' && reminder.enabled !== false) {
            const dueMs = new Date(reminder.dueTime).getTime();
            if (dueMs <= now.getTime()) {
              reminder.status = 'SKIPPED';
              reminder.error = 'Scheduled time passed while server was offline';
              changed = true;
              countSkipped += 1;
            } else {
              const jobId = generateReminderJobId(interview._id, reminder.interval);
              reminder.jobId = jobId;
              const delay = Math.max(0, dueMs - now.getTime());
              await notificationQueue.add(
                'interview-reminder',
                {
                  interviewId: String(interview._id),
                  interval: reminder.interval,
                  userId: String(interview.user),
                  allowSend: true,
                },
                {
                  jobId,
                  delay,
                  attempts: 3,
                  backoff: { type: 'exponential', delay: 2000 },
                }
              );
              countReconciled += 1;
              changed = true;
            }
          }
        }
        if (changed) {
          await interview.save();
        }
      }
    } else {
      // Demo store reconciliation
      const demoList = getDemoInterviewsStore().filter((i) => i.status === 'SCHEDULED');
      for (const interview of demoList) {
        for (const reminder of interview.reminders || []) {
          if (reminder.status === 'SCHEDULED' && reminder.enabled !== false) {
            const dueMs = new Date(reminder.dueTime).getTime();
            if (dueMs <= now.getTime()) {
              reminder.status = 'SKIPPED';
              reminder.error = 'Scheduled time passed while server was offline';
              countSkipped += 1;
            } else {
              const jobId = generateReminderJobId(interview._id, reminder.interval);
              reminder.jobId = jobId;
              countReconciled += 1;
            }
          }
        }
      }
    }

    console.log(
      `[Scheduler] Reconciled reminders: ${countReconciled} queued, ${countSkipped} skipped.`
    );
    return { reconciled: countReconciled, skipped: countSkipped };
  } catch (err) {
    console.warn('[Scheduler] Reconciliation notice:', safeErrorMessage(err));
    return { reconciled: 0, skipped: 0, error: safeErrorMessage(err) };
  }
};
