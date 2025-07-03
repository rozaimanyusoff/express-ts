import {pool} from '../utils/db';
import logger from '../utils/logger';
import { io } from '../server';
import { getAdminUserIds } from '../p.user/userModel';

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

    // Emit the notification event via WebSocket
    io.emit('notification', { userId, type, message });
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

export const createAdminNotification = async ({ type, message }: { type: string; message: string }) => {
  const adminIds = await getAdminUserIds();
  for (const adminId of adminIds) {
    await createNotification({ userId: adminId, type, message });
  }
};
