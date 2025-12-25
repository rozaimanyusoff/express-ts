import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler';
import * as logsController from './logsController';

const router = Router();

/**
 * Admin logs management endpoints
 * All endpoints require admin authentication (handled via middleware in app.ts)
 */

// Get list of all log files with metadata
router.get('/files', asyncHandler(logsController.getAllLogFiles));

// Get logs by date range with optional filters
// ?startDate=2025-12-20&endDate=2025-12-26&userId=123&action=login&status=success
router.get('/by-date-range', asyncHandler(logsController.getLogsByDateRange));

// Get today's logs
// ?userId=123 (optional, to filter by user)
router.get('/today', asyncHandler(logsController.getTodayLogs));

// Get logs for a specific user
// /user/123?days=7&action=login&status=fail
router.get('/user/:userId', asyncHandler(logsController.getUserLogs));

// Get log summary statistics
// ?days=7
router.get('/summary', asyncHandler(logsController.getLogSummary));

// Get suspicious activity (failed attempts above threshold)
// ?days=7&threshold=5
router.get('/suspicious', asyncHandler(logsController.getSuspiciousActivity));

// Download a specific log file
// /download/auth_2025-12-26.jsonl
router.get('/download/:filename', asyncHandler(logsController.downloadLogFile));

// Archive old log files
// POST with body: { daysToKeep: 90 }
router.post('/archive', asyncHandler(logsController.archiveOldLogFiles));

export default router;
