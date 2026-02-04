import { Request, Response, NextFunction } from 'express';
import redis from '../utils/redis';
import redisConfig from '../utils/redisConfig';
import logger from '../utils/logger';

export const createCacheMiddleware = (
  ttl: number = 300,
  keyPrefix: string = 'route'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip caching if Redis is disabled
    if (!redisConfig.enabled) {
      logger.debug('[Cache Disabled] Skipping cache middleware');
      return next();
    }

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;

    // Try to get from cache asynchronously
    redis.get(cacheKey).then((cached: any) => {
      if (cached) {
        logger.debug(`Cache hit: ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        res.json(JSON.parse(cached));
        return;
      }

      // Store original json method - bind it to res context
      const originalJson = res.json.bind(res);

      // Override json to cache response
      res.json = function (data: any) {
        try {
          if (res.statusCode === 200) {
            redis.setex(cacheKey, ttl, JSON.stringify(data)).catch((err: any) => {
              logger.error(`Failed to cache response: ${err.message}`);
            });
          }
        } catch (error) {
          logger.error(`Cache middleware set error: ${(error as any).message}`);
        }

        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    }).catch((error: any) => {
      logger.error(`Cache middleware get error: ${(error as any).message}`);
      next();
    });
  };
};

export default createCacheMiddleware;
