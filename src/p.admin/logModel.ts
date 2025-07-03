import {pool} from '../utils/db';
import logger from '../utils/logger';

export type AuthAction = 'login' | 'logout' | 'register' | 'activate' | 'reset_password' | 'request_reset' | 'other';

export const logAuthActivity = async (
  userId: number,
  action: AuthAction,
  status: 'success' | 'fail',
  reason: any = {},
  req?: any
): Promise<void> => {
  try {
    let ip = null;
    let userAgent = null;
    if (req) {
      ip = req.headers && (req.headers['x-forwarded-for'] as string) || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
      userAgent = req.headers && req.headers['user-agent'] || null;
    }
    // Ensure details is always a non-empty string (use null if empty object)
    let details = null;
    if (reason && (typeof reason !== 'object' || Object.keys(reason).length > 0)) {
      details = JSON.stringify(reason);
    }
    await pool.query(
      `INSERT INTO logs_auth (user_id, action, status, ip, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, status, ip, userAgent, details]
    );
  } catch (error) {
    logger.error('Error logging auth activity:', error);
  }
};

// Get authentication logs for all users (for admin view)
export const getAuthLogs = async (): Promise<any[]> => {
    try {
        const [rows]: any[] = await pool.query(
            'SELECT * FROM logs_auth ORDER BY created_at DESC'
        );
        return rows;
    } catch (error) {
        logger.error('Database error in getAuthLogs:', error);
        throw error;
    }
};

// Get authentication logs for a user (for admin view)
export const getUserAuthLogs = async (userId: number): Promise<any[]> => {
    try {
        const [rows]: any[] = await pool.query(
            'SELECT id, user_id, action, status, ip, user_agent, details, created_at FROM logs_auth WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    } catch (error) {
        logger.error('Database error in getUserAuthLogs:', error);
        throw error;
    }
};
