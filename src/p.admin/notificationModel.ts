import { getAdminUserIds } from '../p.user/userModel';
import { io } from '../server';
import {pool} from '../utils/db';
import logger from '../utils/logger';
import { sendWebhook } from '../utils/webhook';

export interface Notification {
  message: string;
  type: string;
  userId: number;
}

interface PaginationParams { limit: number; offset: number }

export const getNotificationsByUser = async (userId: number, { limit, offset }: PaginationParams): Promise<{ rows: any[]; total: number }> => {
  const [rows]: any[] = await pool.query('SELECT id, user_id, type, message, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
  const [countRows]: any[] = await pool.query('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ?', [userId]);
  return { rows, total: countRows[0]?.cnt || 0 };
};

export const markNotificationsRead = async (userId: number, ids: number[]): Promise<void> => {
  if (!ids.length) return;
  await pool.query(`UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [userId, ...ids]);
};

export const markAllRead = async (userId: number): Promise<void> => {
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [userId]);
};

export const getUnreadCount = async (userId: number): Promise<number> => {
  const [rows]: any[] = await pool.query('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]);
  return rows[0]?.cnt || 0;
};

export const createNotification = async ({ message, type, userId }: Notification): Promise<void> => {
  try {
    const [result]: any = await pool.query(
      'INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)',
      [userId, type, message]
    );

    const payload = { created_at: new Date().toISOString(), id: result.insertId, message, type, userId };
    // Emit only to specific user room
    io.to(`user:${userId}`).emit('notification', payload);

    // Forward to configured webhook (if any) - fire-and-forget
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        // do not await to avoid blocking main flow; sendWebhook handles its own errors
        sendWebhook(webhookUrl, { createdAt: new Date().toISOString(), message, type, userId }, { fireAndForget: true });
      } catch (err) {
        // sendWebhook should swallow errors when fireAndForget is true, but log defensively
        logger.error('Notification webhook call failed (synchronous):', err);
      }
    }
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

export const createAdminNotification = async ({ message, type }: { message: string; type: string; }) => {
  const adminIds = await getAdminUserIds();
  if (!adminIds.length) return;
  // Bulk insert
  const values: any[] = [];
  const placeholders = adminIds.map(id => { values.push(id, type, message); return '(?, ?, ?)' }).join(',');
  const [result]: any = await pool.query(`INSERT INTO notifications (user_id, type, message) VALUES ${placeholders}`, values);
  // Emit to all admin rooms
  for (const adminId of adminIds) {
    io.to(`user:${adminId}`).emit('notification', { created_at: new Date().toISOString(), id: null, message, type, userId: adminId });
  }
};
