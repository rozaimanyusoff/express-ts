import * as dotenv from 'dotenv';

dotenv.config();

export const redisConfig = {
  // Check if Redis is enabled via environment variable
  enabled: process.env.REDIS_ENABLED !== 'false', // Default: true (enabled)
  
  // Redis connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  
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
