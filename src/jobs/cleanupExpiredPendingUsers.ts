import { pool } from '../utils/db.js';
import logger from '../utils/logger.js';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run every hour
const PENDING_USERS_TABLE = 'pending_users';
const LOCK_NAME = 'pending_user_cleanup';
const LOCK_TIMEOUT = 30; // seconds

/**
 * Acquire a MySQL distributed lock so only one PM2 cluster instance
 * runs this cleanup at a time (same pattern as processAssetTransfers).
 */
const acquireLock = async (): Promise<boolean> => {
   try {
      const [result] = await pool.query(
         `SELECT GET_LOCK(?, ?) as lock_acquired`,
         [LOCK_NAME, LOCK_TIMEOUT]
      );
      return (result as any[])[0]?.lock_acquired === 1;
   } catch (err) {
      logger.error('[PendingUserCleanup] Error acquiring lock:', err);
      return false;
   }
};

const releaseLock = async (): Promise<void> => {
   try {
      await pool.query(`SELECT RELEASE_LOCK(?) as released`, [LOCK_NAME]);
   } catch (err) {
      logger.error('[PendingUserCleanup] Error releasing lock:', err);
   }
};

/**
 * Cleanup expired pending user accounts
 * Deletes pending_users records where activation_expires_at has passed
 * (i.e., 24-hour activation window expired and user never activated)
 */
export const cleanupExpiredPendingUsers = async (): Promise<void> => {
   try {
      const now = new Date();

      // Delete pending users where activation code has expired
      const [result]: any[] = await pool.query(
         `DELETE FROM ${PENDING_USERS_TABLE} 
       WHERE activation_expires_at IS NOT NULL 
       AND activation_expires_at < ?`,
         [now]
      );

      const deletedCount = result?.affectedRows || 0;

      if (deletedCount > 0) {
         logger.info(`[PendingUserCleanup] Removed ${deletedCount} expired pending user(s) with expired activation codes`);
      }
   } catch (error: any) {
      // Ignore column not found errors (migration may not have run yet)
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('activation_expires_at')) {
         logger.warn('[PendingUserCleanup] activation_expires_at column not found. Please run migration: db/migrations/add_activation_expires_at_to_pending_users.sql');
         return;
      }
      logger.error('[PendingUserCleanup] Error during cleanup:', error);
   }
};

/**
 * Initialize the cleanup scheduler
 * Runs every hour to clean up expired pending accounts.
 * Uses MySQL GET_LOCK so only one PM2 cluster instance executes per interval.
 */
export const initializePendingUserCleanup = (): void => {
   const runWithLock = async () => {
      const lockAcquired = await acquireLock();
      if (!lockAcquired) {
         logger.debug('[PendingUserCleanup] Skipping — another instance is running cleanup');
         return;
      }
      try {
         await cleanupExpiredPendingUsers();
      } finally {
         await releaseLock();
      }
   };

   try {
      // Run cleanup immediately on startup
      runWithLock().catch(err =>
         logger.error('[PendingUserCleanup] Initial cleanup failed:', err)
      );

      // Schedule recurring cleanup every hour
      const cleanupInterval = setInterval(() => {
         runWithLock().catch(err =>
            logger.error('[PendingUserCleanup] Scheduled cleanup failed:', err)
         );
      }, CLEANUP_INTERVAL);

      // Prevent this timer from blocking process exit
      cleanupInterval.unref();

      logger.info('[PendingUserCleanup] Scheduler initialized (runs every 1 hour, cluster-safe)');
   } catch (error) {
      logger.error('[PendingUserCleanup] Failed to initialize scheduler:', error);
   }
};

export default cleanupExpiredPendingUsers;
