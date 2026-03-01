import { REDIS_DB, REDIS_ENABLED, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from './env';

export const redisConfig = {
  // Check if Redis is enabled via environment variable
  enabled: REDIS_ENABLED,

  // Redis connection settings
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  db: REDIS_DB,

  // Redis retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Redis connection options
  enableReadyCheck: false,
  enableOfflineQueue: true,
  lazyConnect: true,
};

export default redisConfig;
