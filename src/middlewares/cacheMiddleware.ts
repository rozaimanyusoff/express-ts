import { Request, Response, NextFunction } from 'express';
import redis from '../utils/redis';
import redisConfig from '../utils/redisConfig';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

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
    redis.get(cacheKey).then((cached: string | null) => {
      if (cached) {
        logger.debug(`Cache hit: ${cacheKey}`);
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
        return;
      }

      // Store original json method - bind it to res context
      const originalJson = res.json.bind(res);

      // Override json to cache response
      res.json = function (data: unknown) {
        try {
          if (res.statusCode === 200) {
            redis.setex(cacheKey, ttl, JSON.stringify(data)).catch((err: unknown) => {
              logger.error(`Failed to cache response: ${getErrorMessage(err)}`);
            });
          }
        } catch (error) {
          logger.error(`Cache middleware set error: ${getErrorMessage(error)}`);
        }

        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    }).catch((error: unknown) => {
      logger.error(`Cache middleware get error: ${getErrorMessage(error)}`);
      next();
    });
  };
};

export default createCacheMiddleware;
