import responseTime from 'response-time';
import logger from '../utils/logger.js';
import { performanceMetrics } from '../services/performanceMetrics.js';

// Slow request threshold in milliseconds
const SLOW_REQUEST_THRESHOLD = 1000;

/**
 * Performance monitoring middleware for tracking API response times
 */
export const performanceMiddleware = responseTime((req, res, time) => {
  const responseTimeMs = Math.round(time);
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const statusCode = res.statusCode;
  const userId = req.user?.id;
  const agencyId = req.user?.agencyId;

  // Record performance metrics
  performanceMetrics.recordApiResponse({
    endpoint,
    method: req.method,
    path: req.path,
    responseTime: responseTimeMs,
    statusCode,
    userId,
    agencyId,
    timestamp: new Date(),
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });

  // Log slow requests
  if (responseTimeMs > SLOW_REQUEST_THRESHOLD) {
    logger.warn('Slow API request detected', {
      endpoint,
      responseTime: `${responseTimeMs}ms`,
      statusCode,
      userId,
      agencyId,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      query: req.query,
      body: req.method !== 'GET' ? '[REDACTED]' : undefined
    });
  }

  // Log all requests in debug mode
  if (process.env.NODE_ENV === 'development' || process.env.LOG_ALL_REQUESTS === 'true') {
    logger.debug('API request completed', {
      endpoint,
      responseTime: `${responseTimeMs}ms`,
      statusCode,
      userId
    });
  }
});

/**
 * Middleware to track memory usage per request
 */
export const memoryTrackingMiddleware = (req, res, next) => {
  const startMemory = process.memoryUsage();
  
  res.on('finish', () => {
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };

    // Log significant memory usage changes
    if (Math.abs(memoryDelta.heapUsed) > 10 * 1024 * 1024) { // 10MB threshold
      logger.debug('Significant memory usage change', {
        endpoint: `${req.method} ${req.path}`,
        memoryDelta,
        currentMemory: endMemory
      });
    }

    // Record memory metrics
    performanceMetrics.recordMemoryUsage({
      endpoint: `${req.method} ${req.path}`,
      memoryUsage: endMemory,
      memoryDelta,
      timestamp: new Date()
    });
  });

  next();
};

/**
 * Error tracking middleware for performance monitoring
 */
export const errorTrackingMiddleware = (err, req, res, next) => {
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  // Record error metrics
  performanceMetrics.recordError({
    endpoint,
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    userId: req.user?.id,
    agencyId: req.user?.agencyId,
    timestamp: new Date()
  });

  // Continue with normal error handling
  next(err);
};