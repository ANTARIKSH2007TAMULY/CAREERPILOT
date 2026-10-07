import { getRedisClient } from '../config/redis.js';

const TTL_SECONDS = 300;

export const cacheService = {
  async get(key) {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  },

  async set(key, value, ttlSeconds = TTL_SECONDS) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
      return true;
    } catch (error) {
      return false;
    }
  },

  async invalidate(key) {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      return false;
    }
  },
};

export const createJobSearchCacheKey = (query) => `jobs:${JSON.stringify(query)}`;
