import pool from '../utils/db';
import logger from '../utils/logger';

export interface Notification {
  userId: number;
  type: string;
  message: string;
}

export const createNotification = async ({ userId, type, message }: Notification): Promise<void> => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [userId, type, message]
    );
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};
