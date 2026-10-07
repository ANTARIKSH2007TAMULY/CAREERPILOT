import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

const connection = getRedisClient();

export const createQueue = (name) => {
  if (!connection) return null;
  return new Queue(name, { connection });
};

export const jobSyncQueue = createQueue('jobSyncQueue');
export const aiQueue = createQueue('aiQueue');
export const notificationQueue = createQueue('notificationQueue');
