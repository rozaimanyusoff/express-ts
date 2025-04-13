import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize } = format;

// Custom format for both console and file outputs
const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = createLogger({
  level: 'error',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Console transport with colorized output (development only)
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
      ),
    }),
    // File transport with plain text formatting (no JSON)
    new transports.File({
      filename: 'error.log',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat // <-- plain text for the file log
      )
    }),
  ],
});

export default logger;