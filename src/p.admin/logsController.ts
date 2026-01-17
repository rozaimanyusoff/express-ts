import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger';
import {
  getAuthLogsForDateRange,
  getUserAuthLogsForDateRange,
  getTodayAuthLogs,
  getUserTodayAuthLogs,
  archiveOldLogs,
  AuthLogEntry
} from '../utils/fileAuthLogger';

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || './uploads';
const AUTH_LOGS_DIR = path.join(UPLOAD_BASE_PATH, 'logs', 'auth');

/**
 * Get list of all available log files with metadata
 */
export const getAllLogFiles = async (req: Request, res: Response): Promise<Response> => {
  try {
    const files = await fs.readdir(AUTH_LOGS_DIR);
    
    const logFiles = await Promise.all(
      files
        .filter(file => file.startsWith('auth_') && file.endsWith('.jsonl'))
        .map(async (file) => {
          const filepath = path.join(AUTH_LOGS_DIR, file);
          const stats = await fs.stat(filepath);
          const dateMatch = file.match(/auth_(\d{4})-(\d{2})-(\d{2})\.jsonl/);
          
          // Count lines in file
          const content = await fs.readFile(filepath, 'utf-8');
          const lineCount = content.split('\n').filter(line => line.trim()).length;
          
          return {
            filename: file,
            date: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null,
            size: stats.size,
            entries: lineCount,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
    );
    
    // Sort by date descending (newest first)
    logFiles.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });
    
    return res.json({
      status: 'success',
      data: {
        totalFiles: logFiles.length,
        files: logFiles
      }
    });
  } catch (error) {
    logger.error('Error getting log files:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve log files'
    });
  }
};

/**
 * Get logs for a specific date range with optional filtering
 */
export const getLogsByDateRange = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { startDate, endDate, userId, action, status } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate are required'
      });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Get logs for date range
    let logs = userId
      ? await getUserAuthLogsForDateRange(parseInt(userId as string), start, end)
      : await getAuthLogsForDateRange(start, end);
    
    // Apply filters
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    if (status) {
      logs = logs.filter(log => log.status === status);
    }
    
    return res.json({
      status: 'success',
      data: {
        count: logs.length,
        filters: { startDate, endDate, userId, action, status },
        logs
      }
    });
  } catch (error) {
    logger.error('Error getting logs by date range:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve logs'
    });
  }
};

/**
 * Get today's logs with optional user filter
 */
export const getTodayLogs = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.query;
    
    const logs = userId
      ? await getUserTodayAuthLogs(parseInt(userId as string))
      : await getTodayAuthLogs();
    
    return res.json({
      status: 'success',
      data: {
        date: new Date().toISOString().split('T')[0],
        count: logs.length,
        logs
      }
    });
  } catch (error) {
    logger.error('Error getting today logs:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve today logs'
    });
  }
};

/**
 * Get logs for a specific user
 */
export const getUserLogs = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId } = req.params;
    const { days = 7, action, status } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));
    
    let logs = await getUserAuthLogsForDateRange(
      parseInt(userId as string),
      startDate,
      endDate
    );
    
    // Apply filters
    if (action) {
      logs = logs.filter(log => log.action === (action as string));
    }
    if (status) {
      logs = logs.filter(log => log.status === (status as string));
    }
    
    // Aggregate stats
    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      successCount: 0,
      failCount: 0
    };
    
    logs.forEach(log => {
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      if (log.status === 'success') stats.successCount++;
      if (log.status === 'fail') stats.failCount++;
    });
    
    return res.json({
      status: 'success',
      data: {
        userId,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        stats,
        logs
      }
    });
  } catch (error) {
    logger.error('Error getting user logs:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user logs'
    });
  }
};

/**
 * Get log summary statistics
 */
export const getLogSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { days = 7 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));
    
    const logs = await getAuthLogsForDateRange(startDate, endDate);
    
    // Calculate statistics
    const stats = {
      totalEntries: logs.length,
      dateRange: {
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        days: parseInt(days as string)
      },
      byAction: {} as Record<string, { success: number; fail: number; total: number }>,
      byStatus: {
        success: 0,
        fail: 0
      },
      uniqueUsers: new Set<number>(),
      uniqueIPs: new Set<string>(),
      failureRate: 0
    };
    
    logs.forEach(log => {
      // Action stats
      if (!stats.byAction[log.action]) {
        stats.byAction[log.action] = { success: 0, fail: 0, total: 0 };
      }
      stats.byAction[log.action].total++;
      if (log.status === 'success') {
        stats.byAction[log.action].success++;
      } else {
        stats.byAction[log.action].fail++;
      }
      
      // Status stats
      if (log.status === 'success') {
        stats.byStatus.success++;
      } else {
        stats.byStatus.fail++;
      }
      
      // Unique tracking
      stats.uniqueUsers.add(log.user_id);
      if (log.ip) stats.uniqueIPs.add(log.ip);
    });
    
    // Convert Sets to counts
    const uniqueUsers = stats.uniqueUsers.size;
    const uniqueIPs = stats.uniqueIPs.size;
    
    const failureRate = stats.totalEntries > 0
      ? Math.round((stats.byStatus.fail / stats.totalEntries) * 100 * 100) / 100
      : 0;
    
    return res.json({
      status: 'success',
      data: {
        ...stats,
        uniqueUsers,
        uniqueIPs,
        failureRate,
        byAction: Object.entries(stats.byAction).reduce((acc, [key, val]) => {
          acc[key] = {
            ...val,
            successRate: val.total > 0 ? Math.round((val.success / val.total) * 100) : 0
          };
          return acc;
        }, {} as any)
      }
    });
  } catch (error) {
    logger.error('Error getting log summary:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve log summary'
    });
  }
};

/**
 * Archive old log files (older than specified days)
 */
export const archiveOldLogFiles = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { daysToKeep = 90 } = req.body;
    
    if (typeof daysToKeep !== 'number' || daysToKeep < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'daysToKeep must be a positive number'
      });
    }
    
    const archivedCount = await archiveOldLogs(daysToKeep);
    
    return res.json({
      status: 'success',
      data: {
        message: `Archived ${archivedCount} log files older than ${daysToKeep} days`,
        archivedCount,
        daysToKeep
      }
    });
  } catch (error) {
    logger.error('Error archiving logs:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to archive logs'
    });
  }
};

/**
 * Download a log file
 */
export const downloadLogFile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { filename } = req.params;
    const fn = filename as string;
    
    // Validate filename to prevent directory traversal
    if (!fn.startsWith('auth_') || !fn.endsWith('.jsonl')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid filename'
      });
    }
    
    const filepath = path.join(AUTH_LOGS_DIR, fn);
    
    // Verify file exists
    await fs.access(filepath);
    
    // Read and send file
    const content = await fs.readFile(filepath, 'utf-8');
    
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
    
    return res.send(content);
  } catch (error) {
    logger.error('Error downloading log file:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to download log file'
    });
  }
};

/**
 * Get suspicious activity (failed attempts, repeated failures, etc)
 */
export const getSuspiciousActivity = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { days = 7, threshold = 5 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));
    
    const logs = await getAuthLogsForDateRange(startDate, endDate);
    
    // Track failed attempts per user/IP
    const failedAttempts: Record<string, any> = {};
    
    logs.forEach(log => {
      if (log.status === 'fail') {
        const key = `user_${log.user_id}`;
        if (!failedAttempts[key]) {
          failedAttempts[key] = {
            userId: log.user_id,
            action: log.action,
            failCount: 0,
            lastAttempt: log.created_at,
            ips: new Set<string>(),
            details: []
          };
        }
        failedAttempts[key].failCount++;
        failedAttempts[key].lastAttempt = log.created_at;
        if (log.ip) failedAttempts[key].ips.add(log.ip);
        failedAttempts[key].details.push({
          action: log.action,
          ip: log.ip,
          created_at: log.created_at,
          details: log.details
        });
      }
    });
    
    // Filter suspicious activity (above threshold)
    const suspiciousActivities = Object.values(failedAttempts)
      .filter((activity: any) => activity.failCount >= parseInt(threshold as string))
      .map((activity: any) => ({
        ...activity,
        ips: Array.from(activity.ips),
        ipCount: activity.ips.size
      }))
      .sort((a: any, b: any) => b.failCount - a.failCount);
    
    return res.json({
      status: 'success',
      data: {
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        threshold: parseInt(threshold as string),
        suspiciousCount: suspiciousActivities.length,
        activities: suspiciousActivities
      }
    });
  } catch (error) {
    logger.error('Error getting suspicious activity:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve suspicious activity'
    });
  }
};
