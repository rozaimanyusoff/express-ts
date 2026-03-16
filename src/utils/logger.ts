import { createLogger, format, transports } from 'winston';
import Transport from 'winston-transport';
import { logErrorToFile } from './fileErrorLogger';

const { colorize, combine, printf, timestamp } = format;

// Custom format for console output
const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Custom daily JSONL transport — mirrors the auth logs file-based approach
class DailyJsonlTransport extends Transport {
  override log(info: { level?: string; message?: unknown; timestamp?: string; stack?: string }, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    logErrorToFile({
      level: info.level ?? 'error',
      message: String(info.message ?? ''),
      stack: info.stack ?? null,
      created_at: info.timestamp ?? new Date().toISOString(),
    }).catch(() => { });

    callback();
  }
}

const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  level: 'error',
  transports: [
    // Console transport with colorized output
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      ),
    }),
    // Daily JSONL file transport — writes to uploads/logs/errors/error_YYYY-MM-DD.jsonl
    new DailyJsonlTransport(),
  ],
});

export default logger;