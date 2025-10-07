import { Request, Response } from 'express';
import * as notificationModel from '../p.admin/notificationModel';
import logger from '../utils/logger';

// Get notifications for current user (paginated)
export const getNotifications = async (req: Request, res: Response) => {
   const authUserId = (req as any).user?.id;
   if (!authUserId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

   // Optional ?user_id= for admin viewing another user's notifications
   let targetUserId = authUserId;
   if (req.query.user_id) {
      const requested = Number(req.query.user_id);
      if (!Number.isNaN(requested) && requested !== authUserId) {
         try {
            // Fetch authenticated user's role
            const authUser = await require('../p.user/userModel').getUserById(authUserId);
            if (!authUser || authUser.role !== 1) {
               return res.status(403).json({ status: 'error', message: 'Forbidden: only admins can view other users\' notifications' });
            }
            targetUserId = requested;
         } catch (e) {
            logger.error('Authorization role check failed', e);
            return res.status(500).json({ status: 'error', message: 'Internal server error' });
         }
      }
   }

   const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
   const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10), 1), 100);
   const offset = (page - 1) * limit;
   try {
      const { rows, total } = await notificationModel.getNotificationsByUser(targetUserId, { limit, offset });
      return res.json({
         status: 'success',
         data: rows,
         pagination: { page, limit, total, pages: Math.ceil(total / limit) },
         meta: { targetUserId }
      });
   } catch (err) {
      logger.error('getNotifications error', err);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
   }
};

// Mark specific notifications as read
export const markRead = async (req: Request, res: Response) => {
   const userId = (req as any).user?.id;
   if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
   const ids: any[] = Array.isArray(req.body.ids) ? req.body.ids : [];
   if (!ids.length) return res.status(400).json({ status: 'error', message: 'ids must be a non-empty array' });
   try {
      await notificationModel.markNotificationsRead(userId, ids.map(Number).filter(n => !Number.isNaN(n)));
      return res.json({ status: 'success', message: 'Notifications marked as read' });
   } catch (err) {
      logger.error('markRead error', err);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
   }
};

// Mark all notifications as read
export const markAllRead = async (req: Request, res: Response) => {
   const userId = (req as any).user?.id;
   if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
   try {
      await notificationModel.markAllRead(userId);
      return res.json({ status: 'success', message: 'All notifications marked as read' });
   } catch (err) {
      logger.error('markAllRead error', err);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
   }
};

// Get unread count
export const getUnreadCount = async (req: Request, res: Response) => {
   const userId = (req as any).user?.id;
   if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
   try {
      const count = await notificationModel.getUnreadCount(userId);
      return res.json({ status: 'success', data: { unread: count } });
   } catch (err) {
      logger.error('getUnreadCount error', err);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
   }
};

// Send a test notification to the authenticated user
export const sendTestNotification = async (req: Request, res: Response) => {
   const userId = (req as any).user?.id;
   if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
   const { message, type } = req.body || {};
   const finalMessage = message || '🔔 Test notification from backend';
   const finalType = type || 'test';
   try {
      await notificationModel.createNotification({ userId, type: finalType, message: finalMessage });
      return res.status(201).json({ status: 'success', message: 'Test notification sent' });
   } catch (err) {
      logger.error('sendTestNotification error', err);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
   }
};
