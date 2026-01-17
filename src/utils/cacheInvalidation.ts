import { cacheService } from './cacheService';

/**
 * Invalidate all asset-related cache keys
 * Call this after any asset creation, update, or deletion
 */
export const invalidateAssetCache = async () => {
  try {
    await cacheService.delPattern('assets:*');
  } catch (error) {
    console.error('Failed to invalidate asset cache:', error);
  }
};

export default invalidateAssetCache;
