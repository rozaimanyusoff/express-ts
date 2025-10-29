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

// Batched time spent computation for multiple users
// Returns total seconds spent per user based on login/logout pairs.
// Semantics match the controller's original getUserTimeSpent logic:
// - Consecutive logins: ignore subsequent logins until a logout occurs
// - If still logged in (no following logout), count up to NOW()
export const getTimeSpentByUsers = async (userIds: number[]): Promise<Array<{ user_id: number; time_spent: number }>> => {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  try {
    const [rows]: any[] = await pool.query(
      `SELECT user_id, action, created_at
       FROM logs_auth
       WHERE user_id IN (?) AND action IN ('login','logout')
       ORDER BY user_id, created_at ASC`,
      [userIds]
    );

    const resultMap = new Map<number, number>();
    let currentUser: number | null = null;
    let lastLogin: Date | null = null;

    const flushUser = (userId: number) => {
      if (!resultMap.has(userId)) resultMap.set(userId, 0);
      // if session still open at boundary switch, add until now
      if (lastLogin) {
        const add = Math.max(0, Math.round((Date.now() - lastLogin.getTime()) / 1000));
        resultMap.set(userId, (resultMap.get(userId) || 0) + add);
      }
      lastLogin = null;
    };

    for (const row of rows as Array<{ user_id: number; action: string; created_at: Date | string }>) {
      const uid = Number(row.user_id);
      if (currentUser === null) currentUser = uid;
      if (uid !== currentUser) {
        // finalize previous user before switching
        flushUser(currentUser);
        currentUser = uid;
      }

      const action = String(row.action);
      const ts = new Date(row.created_at);

      if (action === 'login') {
        if (!lastLogin) {
          lastLogin = ts;
        }
      } else if (action === 'logout') {
        if (lastLogin) {
          const diff = Math.max(0, Math.round((ts.getTime() - lastLogin.getTime()) / 1000));
          resultMap.set(uid, (resultMap.get(uid) || 0) + diff);
          lastLogin = null;
        }
      }
    }

    if (currentUser !== null) {
      // finalize last user after loop
      flushUser(currentUser);
    }

    return Array.from(resultMap.entries()).map(([user_id, time_spent]) => ({ user_id, time_spent }));
  } catch (error) {
    logger.error('Database error in getTimeSpentByUsers:', error);
    throw error;
  }
};
