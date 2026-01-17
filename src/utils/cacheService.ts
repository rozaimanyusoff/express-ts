import redis from './redis';
import logger from './logger';
import redisConfig from './redisConfig';

export const cacheService = {
  // Check if caching is enabled
  isEnabled(): boolean {
    return redisConfig.enabled;
  },

  // Set cache with TTL (seconds)
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!redisConfig.enabled) {
      logger.debug(`[Cache Disabled] Would set: ${key}`);
      return;
    }
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}: ${(error as any).message}`);
    }
  },

  // Get from cache
  async get<T>(key: string): Promise<T | null> {
    if (!redisConfig.enabled) {
      logger.debug(`[Cache Disabled] Would get: ${key}`);
      return null;
    }
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}: ${(error as any).message}`);
      return null;
    }
  },

  // Delete cache
  async del(key: string): Promise<void> {
    if (!redisConfig.enabled) {
      logger.debug(`[Cache Disabled] Would delete: ${key}`);
      return;
    }
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}: ${(error as any).message}`);
    }
  },

  // Clear pattern (e.g., 'assets:*')
  async delPattern(pattern: string): Promise<void> {
    if (!redisConfig.enabled) {
      logger.debug(`[Cache Disabled] Would delete pattern: ${pattern}`);
      return;
    }
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}: ${(error as any).message}`);
    }
  },

  // Check existence
  async exists(key: string): Promise<boolean> {
    if (!redisConfig.enabled) {
      return false;
    }
    try {
      return (await redis.exists(key)) === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}: ${(error as any).message}`);
      return false;
    }
  },

  // Get with refresh
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached) {
        logger.debug(`Cache hit: ${key}`);
        return cached;
      }

      const fresh = await fetchFn();
      await this.set(key, fresh, ttl);
      return fresh;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}: ${(error as any).message}`);
      // Fallback: fetch without cache if Redis fails
      return await fetchFn();
    }
  },

  // Increment counter
  async increment(key: string, by: number = 1): Promise<number> {
    if (!redisConfig.enabled) {
      return 0;
    }
    try {
      return await redis.incrby(key, by);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}: ${(error as any).message}`);
      return 0;
    }
  },

  // Decrement counter
  async decrement(key: string, by: number = 1): Promise<number> {
    if (!redisConfig.enabled) {
      return 0;
    }
    try {
      return await redis.decrby(key, by);
    } catch (error) {
      logger.error(`Cache decrement error for key ${key}: ${(error as any).message}`);
      return 0;
    }
  },

  // Get all keys matching pattern with values
  async getPatternValues<T>(pattern: string): Promise<Record<string, T>> {
    if (!redisConfig.enabled) {
      return {};
    }
    try {
      const keys = await redis.keys(pattern);
      const result: Record<string, T> = {};

      for (const key of keys) {
        const data = await this.get<T>(key);
        if (data) {
          result[key] = data;
        }
      }

      return result;
    } catch (error) {
      logger.error(`Cache getPatternValues error for ${pattern}: ${(error as any).message}`);
      return {};
    }
  },
};

export default cacheService;
