import { createLogger, format, transports } from 'winston';

const { colorize, combine, printf, timestamp } = format;

// Custom format for both console and file outputs
const customFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

const logger = createLogger({
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  level: 'error',
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