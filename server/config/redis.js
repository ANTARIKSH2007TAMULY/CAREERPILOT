import { createClient } from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: false,
        connectTimeout: 1500,
        lazyConnect: true,
      },
    });

    redisClient.on('error', (error) => {
      console.warn('Redis warning:', error.message);
    });

    await redisClient.connect();
    console.log('Redis connected successfully');
    return redisClient;
  } catch (error) {
    console.warn('Redis unavailable. Continuing without cache.');
    redisClient = null;
    return null;
  }
};

export const getRedisClient = () => redisClient;
