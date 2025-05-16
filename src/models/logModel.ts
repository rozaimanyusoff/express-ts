import pool from '../utils/db';
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
