import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || './uploads';
const ERROR_LOGS_DIR = path.join(UPLOAD_BASE_PATH, 'logs', 'errors');

export interface ErrorLogEntry {
   level: string;
   message: string;
   stack?: string | null;
   created_at: string;
}

function getLogFilename(date?: Date): string {
   const d = date || new Date();
   const year = d.getFullYear();
   const month = String(d.getMonth() + 1).padStart(2, '0');
   const day = String(d.getDate()).padStart(2, '0');
   return `error_${year}-${month}-${day}.jsonl`;
}

async function ensureErrorLogsDir(): Promise<void> {
   await fs.mkdir(ERROR_LOGS_DIR, { recursive: true });
}

/**
 * Log an error entry to a daily JSONL file (one JSON object per line)
 */
export async function logErrorToFile(entry: ErrorLogEntry): Promise<void> {
   try {
      await ensureErrorLogsDir();
      const filename = getLogFilename();
      const filepath = path.join(ERROR_LOGS_DIR, filename);
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(filepath, logLine, 'utf-8');
   } catch {
      // Silently swallow — logging failures must not crash the application
   }
}

/**
 * Retrieve error logs for a specific date range
 */
export async function getErrorLogsForDateRange(
   startDate: Date,
   endDate: Date
): Promise<ErrorLogEntry[]> {
   const logs: ErrorLogEntry[] = [];

   try {
      await ensureErrorLogsDir();

      const dateList: Date[] = [];
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
         dateList.push(new Date(currentDate));
         currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const date of dateList) {
         const filename = getLogFilename(date);
         const filepath = path.join(ERROR_LOGS_DIR, filename);

         try {
            const content = await fs.readFile(filepath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());

            for (const line of lines) {
               try {
                  const entry = JSON.parse(line) as ErrorLogEntry;
                  logs.push(entry);
               } catch {
                  // Skip malformed lines
               }
            }
         } catch (error: unknown) {
            // File might not exist for this date, which is OK
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
               console.error(`Error reading error log for ${filename}:`, error);
            }
         }
      }

      return logs;
   } catch (error) {
      console.error('Error retrieving error logs:', error);
      throw error;
   }
}

/**
 * Retrieve all error logs from today
 */
export async function getTodayErrorLogs(): Promise<ErrorLogEntry[]> {
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const tomorrow = new Date(today);
   tomorrow.setDate(tomorrow.getDate() + 1);
   return getErrorLogsForDateRange(today, tomorrow);
}

/**
 * Archive error log files older than the specified number of days
 */
export async function archiveOldErrorLogs(daysToKeep: number = 90): Promise<number> {
   try {
      await ensureErrorLogsDir();

      const files = await fs.readdir(ERROR_LOGS_DIR);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let archivedCount = 0;

      for (const file of files) {
         if (!file.startsWith('error_') || !file.endsWith('.jsonl')) {
            continue;
         }

         const dateMatch = file.match(/error_(\d{4})-(\d{2})-(\d{2})\.jsonl/);
         if (!dateMatch) continue;

         const fileDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);

         if (fileDate < cutoffDate) {
            const filepath = path.join(ERROR_LOGS_DIR, file);
            const archiveDir = path.join(ERROR_LOGS_DIR, 'archive');
            await fs.mkdir(archiveDir, { recursive: true });
            await fs.rename(filepath, path.join(archiveDir, file));
            archivedCount++;
         }
      }

      return archivedCount;
   } catch (error) {
      console.error('Error archiving old error logs:', error);
      throw error;
   }
}
