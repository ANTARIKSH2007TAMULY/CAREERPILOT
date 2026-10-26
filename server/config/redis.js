import { createClient } from 'redis';

let redisClient = null;
let redisEnabled = false;

export const getBullmqConnection = ({ force = false } = {}) => {
  if (!process.env.REDIS_URL) return null;
  if (!force && !isRedisEnabled()) return null;
  return {
    url: process.env.REDIS_URL,
    maxRetriesPerRequest: null,
  };
};

export const connectRedis = async () => {
  if (!process.env.REDIS_URL) return null;
  if (redisClient?.isOpen) return redisClient;

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 1500,
      },
    });

    redisClient.on('error', (error) => {
      console.warn('Redis warning:', error.message);
    });

    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connect timed out')), 2000);
      }),
    ]);
    redisEnabled = true;
    console.log('Redis connected successfully');
    return redisClient;
  } catch (error) {
    console.warn('Redis unavailable. Continuing without cache.');
    try {
      await redisClient?.disconnect();
    } catch {
      // ignore
    }
    redisClient = null;
    redisEnabled = false;
    return null;
  }
};

export const pingRedis = async () => {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};

export const getRedisClient = () => (redisClient?.isOpen ? redisClient : null);
export const isRedisEnabled = () => redisEnabled && Boolean(getRedisClient());
