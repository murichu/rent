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
 * Enhanced logging methods with context
 */

// Generate correlation ID for request tracking
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Audit logger for sensitive operations
 */
export function auditLog(action, userId, details = {}) {
  logger.warn('AUDIT', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    type: 'audit',
    ...details,
  });
}

/**
 * Security event logger
 */
export function securityLog(event, details = {}) {
  logger.error('SECURITY_EVENT', {
    event,
    details,
    timestamp: new Date().toISOString(),
    type: 'security',
    severity: 'high'
  });
}

/**
 * Performance logger
 */
export function performanceLog(operation, duration, details = {}) {
  logger.info('PERFORMANCE', {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString(),
    type: 'performance'
  });
}

/**
 * Business event logger
 */
export function businessLog(event, data = {}) {
  logger.info('BUSINESS_EVENT', {
    event,
    data,
    timestamp: new Date().toISOString(),
    type: 'business'
  });
}

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Log request start
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId,
    type: 'request_start'
  });
  
  // Capture response time
  const startTime = Date.now();
  
  // Log response end
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId,
      type: 'request_end'
    });
    
    // Log slow requests
    if (duration > 1000) {
      performanceLog('slow_request', duration, {
        method: req.method,
        url: req.url,
        correlationId
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (error, req, res, next) => {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    correlationId: req.correlationId,
    type: 'request_error'
  });
  
  next(error);
};

/**
 * Morgan stream for HTTP logs
 */
export const morganStream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
