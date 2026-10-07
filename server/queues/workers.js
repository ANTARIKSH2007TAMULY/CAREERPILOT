import { Worker } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

export const startWorkers = async () => {
  const connection = getRedisClient();
  if (!connection) {
    console.log('BullMQ workers skipped because Redis is unavailable.');
    return;
  }

  const workers = [
    new Worker(
      'jobSyncQueue',
      async (job) => {
        console.log('Processing job sync task:', job.name);
        return { success: true, task: job.name };
      },
      { connection }
    ),
    new Worker(
      'aiQueue',
      async (job) => {
        console.log('Processing AI task:', job.name);
        return { success: true, task: job.name };
      },
      { connection }
    ),
    new Worker(
      'notificationQueue',
      async (job) => {
        console.log('Processing notification task:', job.name);
        return { success: true, task: job.name };
      },
      { connection }
    ),
  ];

  workers.forEach((worker) => {
    worker.on('failed', (job, err) => {
      console.error(`Worker ${job?.name || 'unknown'} failed:`, err.message);
    });
  });

  return workers;
};
