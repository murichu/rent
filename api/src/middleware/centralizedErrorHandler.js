import logger, { securityLog, SecuritySeverity, sanitizePII } from '../utils/logger.js';

/**
 * Error Classification System
 */
const ErrorTypes = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  DATABASE: 'database',
  EXTERNAL_SERVICE: 'external_service',
  INTERNAL: 'internal',
  SECURITY: 'security'
};

const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Centralized Error Handler Middleware
 * Provides consistent error processing, classification, and response formatting
 */
export class CentralizedErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.suspiciousPatterns = new Map();
  }

  /**
   * Main error handling middleware
   */
  handle = (error, req, res, next) => {
    try {
      // Extract request context
      const context = this.extractRequestContext(req);
      
      // Classify the error
      const classification = this.classifyError(error);
      
      // Track error patterns for security monitoring
      this.trackErrorPattern(error, context);
      
      // Log the error with appropriate level
      this.logError(error, context, classification);
      
      // Check for security implications
      this.checkSecurityImplications(error, context, classification);
      
      // Format and send response
      const response = this.formatErrorResponse(error, classification, context);
      
      res.status(classification.statusCode).json(response);
    } catch (handlerError) {
      // Fallback error handling
      logger.error('Error in centralized error handler', {
        originalError: error.message,
        handlerError: handlerError.message,
        correlationId: req.correlationId,
        type: 'error_handler_failure'
      });
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        correlationId: req.correlationId
      });
    }
  };

  /**
   * Extract request context for error handling
   */
  extractRequestContext(req) {
    return {
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || req.user?.userId || 'anonymous',
      userRole: req.user?.role || 'unknown',
      timestamp: new Date().toISOString(),
      headers: sanitizePII(req.headers),
      query: sanitizePII(req.query),
      body: sanitizePII(req.body)
    };
  }

  /**
   * Classify error type and determine appropriate response
   */
  classifyError(error) {
    const classification = {
      type: ErrorTypes.INTERNAL,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 500,
      userMessage: 'An unexpected error occurred',
      logLevel: 'error',
      shouldAlert: false
    };

    // Validation errors
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      classification.type = ErrorTypes.VALIDATION;
      classification.severity = ErrorSeverity.LOW;
      classification.statusCode = 400;
      classification.userMessage = 'Invalid request data';
      classification.logLevel = 'warn';
    }

    // Authentication errors
    else if (error.statusCode === 401 || error.name === 'UnauthorizedError') {
      classification.type = ErrorTypes.AUTHENTICATION;
      classification.severity = ErrorSeverity.MEDIUM;
      classification.statusCode = 401;
      classification.userMessage = 'Authentication required';
      classification.logLevel = 'warn';
      classification.shouldAlert = true;
    }

    // Authorization errors
    else if (error.statusCode === 403 || error.name === 'ForbiddenError') {
      classification.type = ErrorTypes.AUTHORIZATION;
      classification.severity = ErrorSeverity.MEDIUM;
      classification.statusCode = 403;
      classification.userMessage = 'Access denied';
      classification.logLevel = 'warn';
      classification.shouldAlert = true;
    }

    // Not found errors
    else if (error.statusCode === 404 || error.name === 'NotFoundError') {
      classification.type = ErrorTypes.NOT_FOUND;
      classification.severity = ErrorSeverity.LOW;
      classification.statusCode = 404;
      classification.userMessage = 'Resource not found';
      classification.logLevel = 'info';
    }

    // Rate limiting errors
    else if (error.statusCode === 429) {
      classification.type = ErrorTypes.RATE_LIMIT;
      classification.severity = ErrorSeverity.HIGH;
      classification.statusCode = 429;
      classification.userMessage = 'Too many requests';
      classification.logLevel = 'warn';
      classification.shouldAlert = true;
    }

    // Database errors
    else if (error.name === 'PrismaClientKnownRequestError' || 
             error.name === 'DatabaseError' ||
             error.code === 'P2002') {
      classification.type = ErrorTypes.DATABASE;
      classification.severity = ErrorSeverity.HIGH;
      classification.statusCode = 500;
      classification.userMessage = 'Database operation failed';
      classification.logLevel = 'error';
      classification.shouldAlert = true;
    }

    // External service errors
    else if (error.name === 'AxiosError' || error.code === 'ECONNREFUSED') {
      classification.type = ErrorTypes.EXTERNAL_SERVICE;
      classification.severity = ErrorSeverity.MEDIUM;
      classification.statusCode = 503;
      classification.userMessage = 'External service unavailable';
      classification.logLevel = 'error';
    }

    // Security-related errors
    else if (this.isSecurityError(error)) {
      classification.type = ErrorTypes.SECURITY;
      classification.severity = ErrorSeverity.CRITICAL;
      classification.statusCode = error.statusCode || 400;
      classification.userMessage = 'Security violation detected';
      classification.logLevel = 'error';
      classification.shouldAlert = true;
    }

    return classification;
  }

  /**
   * Check if error indicates security issue
   */
  isSecurityError(error) {
    const securityKeywords = [
      'injection', 'xss', 'csrf', 'malicious', 'attack',
      'unauthorized', 'forbidden', 'suspicious', 'blocked'
    ];

    const message = error.message?.toLowerCase() || '';
    return securityKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Track error patterns for anomaly detection
   */
  trackErrorPattern(error, context) {
    const patternKey = `${context.ip}:${error.statusCode || 'unknown'}`;
    const currentCount = this.errorCounts.get(patternKey) || 0;
    this.errorCounts.set(patternKey, currentCount + 1);

    // Check for suspicious patterns
    if (currentCount > 10) { // More than 10 errors from same IP
      const suspiciousKey = `${context.ip}:suspicious_activity`;
      this.suspiciousPatterns.set(suspiciousKey, {
        count: currentCount,
        lastSeen: new Date(),
        errors: error.message
      });

      // Log security alert
      securityLog('suspicious_error_pattern', {
        ip: context.ip,
        errorCount: currentCount,
        errorType: error.statusCode,
        pattern: 'high_error_rate'
      }, SecuritySeverity.HIGH, context.correlationId);
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      this.cleanupOldPatterns();
    }
  }

  /**
   * Clean up old error pattern tracking
   */
  cleanupOldPatterns() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [key, value] of this.suspiciousPatterns.entries()) {
      if (value.lastSeen.getTime() < oneHourAgo) {
        this.suspiciousPatterns.delete(key);
      }
    }

    // Reset error counts periodically
    if (this.errorCounts.size > 1000) {
      this.errorCounts.clear();
    }
  }

  /**
   * Log error with appropriate context and level
   */
  logError(error, context, classification) {
    const logData = {
      error: {
        message: error.message,
        name: error.name,
        statusCode: error.statusCode || error.status,
        type: classification.type,
        severity: classification.severity
      },
      context: {
        method: context.method,
        url: context.url,
        userId: context.userId,
        userRole: context.userRole,
        ip: context.ip,
        userAgent: context.userAgent
      },
      correlationId: context.correlationId,
      timestamp: context.timestamp,
      category: 'error_handling'
    };

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
      logData.error.stack = error.stack;
    }

    // Log with appropriate level
    logger[classification.logLevel]('Centralized error handler', logData);
  }

  /**
   * Check for security implications and log accordingly
   */
  checkSecurityImplications(error, context, classification) {
    // Authentication/Authorization failures
    if (classification.type === ErrorTypes.AUTHENTICATION || 
        classification.type === ErrorTypes.AUTHORIZATION) {
      securityLog('access_control_violation', {
        errorType: classification.type,
        url: context.url,
        method: context.method,
        userId: context.userId,
        ip: context.ip
      }, SecuritySeverity.MEDIUM, context.correlationId);
    }

    // Rate limiting violations
    if (classification.type === ErrorTypes.RATE_LIMIT) {
      securityLog('rate_limit_violation', {
        url: context.url,
        method: context.method,
        userId: context.userId,
        ip: context.ip
      }, SecuritySeverity.HIGH, context.correlationId);
    }

    // Security errors
    if (classification.type === ErrorTypes.SECURITY) {
      securityLog('security_error_detected', {
        error: error.message,
        url: context.url,
        method: context.method,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent
      }, SecuritySeverity.CRITICAL, context.correlationId);
    }

    // Database errors that might indicate attacks
    if (classification.type === ErrorTypes.DATABASE && 
        (error.message?.includes('syntax') || error.message?.includes('injection'))) {
      securityLog('potential_sql_injection', {
        error: error.message,
        url: context.url,
        method: context.method,
        userId: context.userId,
        ip: context.ip
      }, SecuritySeverity.CRITICAL, context.correlationId);
    }
  }

  /**
   * Format error response for client
   */
  formatErrorResponse(error, classification, context) {
    const response = {
      success: false,
      error: classification.userMessage,
      type: classification.type,
      correlationId: context.correlationId,
      timestamp: context.timestamp
    };

    // Add specific error details for validation errors
    if (classification.type === ErrorTypes.VALIDATION && error.errors) {
      response.details = error.errors;
    }

    // Add retry information for rate limiting
    if (classification.type === ErrorTypes.RATE_LIMIT) {
      response.retryAfter = error.retryAfter || 60;
      response.message = 'Rate limit exceeded. Please try again later.';
    }

    // Add development-specific information
    if (process.env.NODE_ENV !== 'production') {
      response.debug = {
        originalError: error.message,
        stack: error.stack?.split('\n').slice(0, 5) // Limit stack trace
      };
    }

    return response;
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats() {
    const stats = {
      totalPatterns: this.errorCounts.size,
      suspiciousPatterns: this.suspiciousPatterns.size,
      topErrors: []
    };

    // Get top error patterns
    const sortedErrors = Array.from(this.errorCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    stats.topErrors = sortedErrors.map(([pattern, count]) => ({
      pattern,
      count
    }));

    return stats;
  }
}

// Create singleton instance
const centralizedErrorHandler = new CentralizedErrorHandler();

// Export the middleware function
export const centralizedErrorHandlerMiddleware = centralizedErrorHandler.handle;

// Export error types and classes for use in other modules
export { ErrorTypes, ErrorSeverity };

// Export custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, type = ErrorTypes.INTERNAL) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400, ErrorTypes.VALIDATION);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, ErrorTypes.NOT_FOUND);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, ErrorTypes.AUTHENTICATION);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, ErrorTypes.AUTHORIZATION);
  }
}

export class SecurityError extends AppError {
  constructor(message = "Security violation detected") {
    super(message, 400, ErrorTypes.SECURITY);
  }
}

export default centralizedErrorHandler;