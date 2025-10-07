import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import tokenValidator from '../middlewares/tokenValidator';
import { getNotifications, markRead, markAllRead, getUnreadCount, sendTestNotification } from './notificationController';

const router = Router();

// All routes require auth
router.get('/', tokenValidator, asyncHandler(getNotifications));
router.get('/unread-count', tokenValidator, asyncHandler(getUnreadCount));
router.post('/mark-read', tokenValidator, asyncHandler(markRead));
router.post('/mark-all-read', tokenValidator, asyncHandler(markAllRead));
router.post('/test', tokenValidator, asyncHandler(sendTestNotification));

export default router;
