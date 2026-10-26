import { Queue } from 'bullmq';
import { getBullmqConnection } from '../config/redis.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

export const createQueue = (name) => {
  const connection = getBullmqConnection();
  if (!connection) return null;
  try {
    const queue = new Queue(name, { connection, defaultJobOptions });
    queue.on('error', (err) => {
      console.warn(`[BullMQ] ${name} connection warning:`, err.message);
    });
    return queue;
  } catch (error) {
    console.warn(`[BullMQ] failed to initialize queue ${name}:`, error.message);
    return null;
  }
};

export const jobSyncQueue = createQueue('jobSyncQueue');
export const aiQueue = createQueue('aiQueue');
export const notificationQueue = createQueue('notificationQueue');

export const enqueueUnique = async (queue, name, data, jobId) => {
  if (!queue) return null;
  return queue.add(name, data, {
    jobId,
    ...defaultJobOptions,
  });
};

export const closeQueues = async () => {
  const active = [jobSyncQueue, aiQueue, notificationQueue].filter(Boolean);
  await Promise.all(active.map((q) => q.close().catch(() => {})));
};
