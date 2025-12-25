import { promises as fs } from 'fs';
import path from 'path';
import logger from './logger';

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || './uploads';
const AUTH_LOGS_DIR = path.join(UPLOAD_BASE_PATH, 'logs', 'auth');

/**
 * Interface for auth activity log entry
 */
export interface AuthLogEntry {
  user_id: number;
  action: string;
  status: 'success' | 'fail';
  ip: string | null;
  user_agent: string | null;
  details: string | null;
  created_at: string; // ISO timestamp
}

/**
 * Get the log filename for a specific date (YYYY-MM-DD format)
 */
function getLogFilename(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `auth_${year}-${month}-${day}.jsonl`;
}

/**
 * Ensure the auth logs directory exists
 */
async function ensureAuthLogsDir(): Promise<void> {
  try {
    await fs.mkdir(AUTH_LOGS_DIR, { recursive: true });
  } catch (error) {
    logger.error('Error creating auth logs directory:', error);
    throw error;
  }
}

/**
 * Log an authentication activity to file (JSONL format - one JSON object per line)
 */
export async function logAuthActivityToFile(entry: AuthLogEntry): Promise<void> {
  try {
    await ensureAuthLogsDir();
    
    const filename = getLogFilename();
    const filepath = path.join(AUTH_LOGS_DIR, filename);
    
    // Append the entry as a JSON line
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(filepath, logLine, 'utf-8');
  } catch (error) {
    logger.error('Error writing auth log to file:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Retrieve auth logs for a specific date range
 */
export async function getAuthLogsForDateRange(
  startDate: Date,
  endDate: Date
): Promise<AuthLogEntry[]> {
  const logs: AuthLogEntry[] = [];
  
  try {
    await ensureAuthLogsDir();
    
    // Generate list of dates in range
    const dateList: Date[] = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateList.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Read logs from each day
    for (const date of dateList) {
      const filename = getLogFilename(date);
      const filepath = path.join(AUTH_LOGS_DIR, filename);
      
      try {
        const content = await fs.readFile(filepath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuthLogEntry;
            logs.push(entry);
          } catch (e) {
            logger.warn('Failed to parse auth log line:', e);
          }
        }
      } catch (error: any) {
        // File might not exist for this date, which is OK
        if (error.code !== 'ENOENT') {
          logger.warn(`Error reading auth log for ${filename}:`, error);
        }
      }
    }
    
    return logs;
  } catch (error) {
    logger.error('Error retrieving auth logs:', error);
    throw error;
  }
}

/**
 * Get auth logs for a specific user within a date range
 */
export async function getUserAuthLogsForDateRange(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<AuthLogEntry[]> {
  const allLogs = await getAuthLogsForDateRange(startDate, endDate);
  return allLogs.filter(log => log.user_id === userId);
}

/**
 * Retrieve all auth logs from today
 */
export async function getTodayAuthLogs(): Promise<AuthLogEntry[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return getAuthLogsForDateRange(today, tomorrow);
}

/**
 * Get today's auth logs for a specific user
 */
export async function getUserTodayAuthLogs(userId: number): Promise<AuthLogEntry[]> {
  const todayLogs = await getTodayAuthLogs();
  return todayLogs.filter(log => log.user_id === userId);
}

/**
 * Archive old log files (older than specified days)
 */
export async function archiveOldLogs(daysToKeep: number = 90): Promise<number> {
  try {
    await ensureAuthLogsDir();
    
    const files = await fs.readdir(AUTH_LOGS_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let archivedCount = 0;
    
    for (const file of files) {
      if (!file.startsWith('auth_') || !file.endsWith('.jsonl')) {
        continue;
      }
      
      // Extract date from filename (auth_YYYY-MM-DD.jsonl)
      const dateMatch = file.match(/auth_(\d{4})-(\d{2})-(\d{2})\.jsonl/);
      if (!dateMatch) continue;
      
      const fileDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
      
      if (fileDate < cutoffDate) {
        const filepath = path.join(AUTH_LOGS_DIR, file);
        const archiveDir = path.join(AUTH_LOGS_DIR, 'archive');
        await fs.mkdir(archiveDir, { recursive: true });
        await fs.rename(filepath, path.join(archiveDir, file));
        archivedCount++;
        logger.info(`Archived auth log: ${file}`);
      }
    }
    
    return archivedCount;
  } catch (error) {
    logger.error('Error archiving old logs:', error);
    throw error;
  }
}
