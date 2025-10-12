import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create transports
const transports = [
  // Write all logs to console
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // Write all logs to combined.log
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format,
  }),
  // Write error logs to error.log
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log'),
    }),
  ],
});

/**
 * Audit logger for sensitive operations
 */
export function auditLog(action, userId, details = {}) {
  logger.info('AUDIT', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

/**
 * Morgan stream for HTTP logs
 */
export const morganStream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
