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
 * Enhanced logging methods with context and security features
 */

// Generate correlation ID for request tracking
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * PII Sanitization - Remove sensitive information from logs
 */
function sanitizePII(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'ssn', 'social', 'credit_card', 'creditCard', 'cvv',
    'email', 'phone', 'phoneNumber', 'address', 'ip',
    'firstName', 'lastName', 'fullName', 'name'
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const sanitizeValue = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      // Check if field name contains sensitive keywords
      const isSensitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );

      if (isSensitive) {
        if (typeof value === 'string') {
          // Mask email addresses
          if (value.includes('@')) {
            const [username, domain] = value.split('@');
            obj[key] = `${username.substring(0, 2)}***@${domain}`;
          }
          // Mask phone numbers
          else if (/^\+?[\d\s\-\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 10) {
            obj[key] = `***-***-${value.slice(-4)}`;
          }
          // Mask other sensitive strings
          else if (value.length > 4) {
            obj[key] = `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
          } else {
            obj[key] = '***';
          }
        } else {
          obj[key] = '[REDACTED]';
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitizeValue(value, fullPath);
      }
    }
  };

  sanitizeValue(sanitized);
  return sanitized;
}

/**
 * Log rotation configuration
 */
const logRotationConfig = {
  maxSize: '20m',
  maxFiles: '14d',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true
};

/**
 * Security event severity levels
 */
const SecuritySeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Audit logger for sensitive operations with PII sanitization
 */
export function auditLog(action, userId, details = {}, correlationId = null) {
  const sanitizedDetails = sanitizePII(details);
  
  logger.warn('AUDIT', {
    action,
    userId,
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'audit',
    category: 'security',
    ...sanitizedDetails,
  });
}

/**
 * Enhanced security event logger with severity levels
 */
export function securityLog(event, details = {}, severity = SecuritySeverity.HIGH, correlationId = null) {
  const sanitizedDetails = sanitizePII(details);
  
  const logLevel = severity === SecuritySeverity.CRITICAL ? 'error' : 'warn';
  
  logger[logLevel]('SECURITY_EVENT', {
    event,
    details: sanitizedDetails,
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'security',
    severity,
    category: 'security_incident',
    requiresAttention: severity === SecuritySeverity.CRITICAL || severity === SecuritySeverity.HIGH
  });

  // For critical security events, also log to separate security log
  if (severity === SecuritySeverity.CRITICAL) {
    logger.error('CRITICAL_SECURITY_ALERT', {
      event,
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
      correlationId,
      alert: true,
      escalate: true
    });
  }
}

/**
 * Authentication event logger
 */
export function authLog(event, userId, details = {}, correlationId = null) {
  const sanitizedDetails = sanitizePII(details);
  
  logger.info('AUTH_EVENT', {
    event,
    userId,
    details: sanitizedDetails,
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'authentication',
    category: 'auth'
  });
}

/**
 * Authorization event logger
 */
export function authzLog(event, userId, resource, action, result, correlationId = null) {
  logger.info('AUTHZ_EVENT', {
    event,
    userId,
    resource,
    action,
    result,
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'authorization',
    category: 'access_control'
  });
}

/**
 * Data access logger for sensitive operations
 */
export function dataAccessLog(operation, userId, resource, details = {}, correlationId = null) {
  const sanitizedDetails = sanitizePII(details);
  
  logger.info('DATA_ACCESS', {
    operation,
    userId,
    resource,
    details: sanitizedDetails,
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'data_access',
    category: 'data_governance'
  });
}

/**
 * Rate limiting event logger
 */
export function rateLimitLog(event, clientId, endpoint, details = {}, correlationId = null) {
  logger.warn('RATE_LIMIT', {
    event,
    clientId,
    endpoint,
    details,
    timestamp: new Date().toISOString(),
    correlationId,
    type: 'rate_limit',
    category: 'security'
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
 * Enhanced request logging middleware with security context
 */
export const requestLogger = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Extract user context for logging
  const userId = req.user?.id || req.user?.userId || 'anonymous';
  const userRole = req.user?.role || 'unknown';
  
  // Sanitize request data for logging
  const sanitizedHeaders = sanitizePII(req.headers);
  const sanitizedQuery = sanitizePII(req.query);
  
  // Log request start with security context
  logger.info('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId,
    userRole,
    headers: sanitizedHeaders,
    query: sanitizedQuery,
    correlationId,
    type: 'request_start',
    category: 'http_request'
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
      userId,
      userRole,
      correlationId,
      type: 'request_end',
      category: 'http_request'
    });
    
    // Log slow requests with performance category
    if (duration > 1000) {
      performanceLog('slow_request', duration, {
        method: req.method,
        url: req.url,
        userId,
        correlationId
      });
    }

    // Log suspicious activity
    if (res.statusCode === 401 || res.statusCode === 403) {
      securityLog('access_denied', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, SecuritySeverity.MEDIUM, correlationId);
    }

    // Log potential attacks
    if (res.statusCode === 429) {
      securityLog('rate_limit_exceeded', {
        method: req.method,
        url: req.url,
        userId,
        ip: req.ip
      }, SecuritySeverity.HIGH, correlationId);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Enhanced error logging middleware with security context
 */
export const errorLogger = (error, req, res, next) => {
  const userId = req.user?.id || req.user?.userId || 'anonymous';
  const userRole = req.user?.role || 'unknown';
  
  // Sanitize error details
  const sanitizedError = {
    message: error.message,
    name: error.name,
    statusCode: error.statusCode || error.status,
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  };

  logger.error('Request error', {
    error: sanitizedError,
    method: req.method,
    url: req.url,
    userId,
    userRole,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    correlationId: req.correlationId,
    type: 'request_error',
    category: 'application_error'
  });

  // Log security-related errors with higher severity
  if (error.statusCode === 401 || error.statusCode === 403) {
    securityLog('authentication_error', {
      error: error.message,
      method: req.method,
      url: req.url,
      userId,
      ip: req.ip
    }, SecuritySeverity.MEDIUM, req.correlationId);
  }

  // Log validation errors that might indicate attacks
  if (error.statusCode === 400 && error.name === 'ValidationError') {
    securityLog('validation_error', {
      error: error.message,
      method: req.method,
      url: req.url,
      userId,
      ip: req.ip
    }, SecuritySeverity.LOW, req.correlationId);
  }
  
  next(error);
};

/**
 * Morgan stream for HTTP logs
 */
export const morganStream = {
  write: (message) => logger.http(message.trim()),
};

// Export security severity levels
export { SecuritySeverity };

// Export enhanced logging functions
export {
  sanitizePII
};

export default logger;
