import cron from 'node-cron';
import { pool } from '../utils/db.js';
import * as assetModel from '../p.asset/assetModel.js';
import logger from '../utils/logger.js';

const LOCK_NAME = 'asset_transfer_processing';
const LOCK_TIMEOUT = 10; // seconds, should be less than cron interval

/**
 * Acquire a distributed lock to ensure only one PM2 instance processes transfers
 * Uses MySQL GET_LOCK which is atomic and works across cluster
 */
const acquireLock = async (): Promise<boolean> => {
  try {
    const [result] = await pool.query(
      `SELECT GET_LOCK(?, ?) as lock_acquired`,
      [LOCK_NAME, LOCK_TIMEOUT]
    );
    const lockAcquired = (result as any[])[0]?.lock_acquired === 1;
    if (lockAcquired) {
      logger.info(`🔒 Lock acquired for asset transfer processing`);
    } else {
      logger.debug(`⏳ Another instance is processing, skipping...`);
    }
    return lockAcquired;
  } catch (err) {
    logger.error('Error acquiring lock:', err);
    return false;
  }
};

/**
 * Release the distributed lock
 */
const releaseLock = async (): Promise<void> => {
  try {
    await pool.query(`SELECT RELEASE_LOCK(?) as released`, [LOCK_NAME]);
    logger.info(`🔓 Lock released`);
  } catch (err) {
    logger.error('Error releasing lock:', err);
  }
};

/**
 * Initialize the asset transfer processing scheduled job
 * Runs daily at 3 AM to process transfers with effective_date <= NOW()
 */
export const initAssetTransferJob = () => {
  // Cron expression: 0 3 * * * (at 3:00 AM every day)
  // Format: minute hour day month dayOfWeek
  const task = cron.schedule('0 3 * * *', async () => {
    logger.info('🔄 [Asset Transfer Job] Starting scheduled processing...');
    
    const lockAcquired = await acquireLock();
    if (!lockAcquired) {
      logger.debug('⏭️  [Asset Transfer Job] Skipping - another instance is processing');
      return;
    }

    try {
      const processed = await assetModel.processAcceptedTransfers();
      logger.info(`✅ [Asset Transfer Job] Successfully processed ${processed} transfers`);
    } catch (err) {
      logger.error('❌ [Asset Transfer Job] Processing failed:', err);
    } finally {
      await releaseLock();
    }
  });

  // Optionally validate that task is running
  logger.info('📅 [Asset Transfer Job] Scheduled for 3:00 AM daily');
  
  return task;
};

/**
 * Alternative: Manual trigger endpoint can call this directly for testing/admin use
 */
export const manualProcessAssetTransfers = async () => {
  logger.info('🔄 [Manual Trigger] Starting asset transfer processing...');
  
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    throw new Error('Could not acquire lock - another instance is processing');
  }

  try {
    const processed = await assetModel.processAcceptedTransfers();
    logger.info(`✅ [Manual Trigger] Successfully processed ${processed} transfers`);
    return { status: 'success', processed };
  } catch (err) {
    logger.error('❌ [Manual Trigger] Processing failed:', err);
    throw err;
  } finally {
    await releaseLock();
  }
};
