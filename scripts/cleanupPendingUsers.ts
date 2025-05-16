import * as dotenv from 'dotenv';
import pool from '../src/utils/db';
import logger from '../src/utils/logger';

dotenv.config();

// Default: delete pending_users older than 7 days (can override with env var)
const DAYS_OLD = parseInt(process.env.PENDING_USERS_CLEANUP_DAYS || '7', 10);

async function cleanupPendingUsers() {
    const cutoff = new Date(Date.now() - DAYS_OLD * 24 * 60 * 60 * 1000);
    try {
        const [result] = await pool.query(
            'DELETE FROM pending_users WHERE created_at < ?',
            [cutoff]
        );
        logger.info(`pending_users cleanup: deleted ${(result as any).affectedRows || 0} records older than ${DAYS_OLD} days.`);
        console.log(`pending_users cleanup: deleted ${(result as any).affectedRows || 0} records older than ${DAYS_OLD} days.`);
        process.exit(0);
    } catch (err) {
        logger.error('pending_users cleanup error:', err);
        console.error('pending_users cleanup error:', err);
        process.exit(1);
    }
}

cleanupPendingUsers();
