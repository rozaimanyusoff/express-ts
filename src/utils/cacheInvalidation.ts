import { cacheService } from './cacheService';
import logger from '../utils/logger';

/**
 * Invalidate all asset-related cache keys
 * Call this after any asset creation, update, or deletion
 */
export const invalidateAssetCache = async () => {
  try {
    await cacheService.delPattern('assets:*');
  } catch (error) {
    logger.error('Failed to invalidate asset cache:', error);
  }
};

export default invalidateAssetCache;
