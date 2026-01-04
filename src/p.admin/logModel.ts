import {pool} from '../utils/db';
import logger from '../utils/logger';
import { logAuthActivityToFile, getTodayAuthLogs, getUserTodayAuthLogs } from '../utils/fileAuthLogger';

export type AuthAction = 'activate' | 'login' | 'logout' | 'other' | 'register' | 'request_reset' | 'reset_password';

export const logAuthActivity = async (
  userId: number,
  action: AuthAction,
  status: 'fail' | 'success',
  reason: any = {},
  req?: any
): Promise<void> => {
  try {
    let ip = null;
    let userAgent = null;
    if (req) {
      ip = req.headers && (req.headers['x-forwarded-for'] as string) || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      userAgent = req.headers?.['user-agent'] || null;
    }
    // Ensure details is always a non-empty string (use null if empty object)
    let details = null;
    if (reason && (typeof reason !== 'object' || Object.keys(reason).length > 0)) {
      details = JSON.stringify(reason);
    }
    
    // Log to file (primary logging mechanism)
    const entry = {
      user_id: userId,
      action,
      status,
      ip,
      user_agent: userAgent,
      details,
      created_at: new Date().toISOString()
    };
    
    await logAuthActivityToFile(entry);
    
    // File-based logging is now the primary mechanism
    // logs_auth table is deprecated and no longer used
  } catch (error) {
    logger.error('Error logging auth activity:', error);
  }
};

// Get authentication logs for all users (for admin view)
// Now uses file-based logging instead of database
export const getAuthLogs = async (): Promise<any[]> => {
    try {
        const logs = await getTodayAuthLogs();
        // Return sorted by created_at descending
        return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
        logger.error('Error retrieving auth logs from file:', error);
        throw error;
    }
};

// Get authentication logs for a user (for admin view)
// Now uses file-based logging instead of database
export const getUserAuthLogs = async (userId: number): Promise<any[]> => {
    try {
        const logs = await getUserTodayAuthLogs(userId);
        // Return sorted by created_at descending
        return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
        logger.error('Error retrieving user auth logs from file:', error);
        throw error;
    }
};

// Batched time spent computation for multiple users
// Returns time_spent from users table (optimized - no longer queries logs_auth with millions of entries)
export const getTimeSpentByUsers = async (userIds: number[]): Promise<{ time_spent: number; user_id: number; }[]> => {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  try {
    // Query time_spent directly from users table
    const placeholders = userIds.map(() => '?').join(',');
    const [rows]: any[] = await pool.query(
      `SELECT id as user_id, COALESCE(time_spent, 0) as time_spent
       FROM auth.users
       WHERE id IN (${placeholders})`,
      userIds
    );

    return rows.map((row: any) => ({
      user_id: Number(row.user_id),
      time_spent: Number(row.time_spent) || 0
    }));
  } catch (error) {
    logger.error('Database error in getTimeSpentByUsers:', error);
    throw error;
  }
};
