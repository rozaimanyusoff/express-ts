import Redis from 'ioredis';
import logger from './logger';
import redisConfig from './redisConfig';

// Create a dummy Redis instance that simulates being connected but doesn't do anything
class DummyRedis {
  async connect() {
    logger.info('Redis is disabled (REDIS_ENABLED=false)');
    return;
  }

  async disconnect() {
    return;
  }

  async setex(key: string, ttl: number, value: string) {
    logger.debug(`[Redis Disabled] Would cache: ${key} for ${ttl}s`);
    return 'OK';
  }

  async get(key: string) {
    logger.debug(`[Redis Disabled] Would get: ${key}`);
    return null;
  }

  async del(...keys: string[]) {
    logger.debug(`[Redis Disabled] Would delete: ${keys.join(', ')}`);
    return keys.length;
  }

  async keys(pattern: string) {
    logger.debug(`[Redis Disabled] Would find keys: ${pattern}`);
    return [];
  }

  async exists(key: string) {
    return 0;
  }

  async incrby(key: string, increment: number) {
    return 0;
  }

  async decrby(key: string, decrement: number) {
    return 0;
  }

  on(event: string, callback: Function) {
    return this;
  }
}

// Initialize Redis based on config
let redis: any;

if (redisConfig.enabled) {
  redis = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    retryStrategy: redisConfig.retryStrategy,
    enableReadyCheck: redisConfig.enableReadyCheck,
    enableOfflineQueue: redisConfig.enableOfflineQueue,
    lazyConnect: redisConfig.lazyConnect,
  });

  redis.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redis.on('error', (err: any) => {
    logger.error(`Redis connection error: ${err.message}`);
  });

  redis.on('close', () => {
    logger.info('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });
} else {
  redis = new DummyRedis();
}

export default redis;
