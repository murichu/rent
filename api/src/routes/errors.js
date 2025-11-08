import express from 'express';
import logger, { securityLog, SecuritySeverity } from '../utils/logger.js';
import { AppError } from '../middleware/centralizedErrorHandler.js';

const router = express.Router();

/**
 * Frontend error reporting endpoint
 */
router.post('/frontend', async (req, res, next) => {
  try {
    const {
      type,
      message,
      stack,
      componentStack,
      errorId,
      timestamp,
      url,
      userAgent,
      level,
      component,
      category,
      correlationId,
      errorDetails
    } = req.body;

    // Validate required fields
    if (!message || !type) {
      throw new AppError('Missing required fields: message and type', 400);
    }

    // Log the frontend error
    logger.error('Frontend error reported', {
      type,
      message,
      stack,
      componentStack,
      errorId,
      timestamp,
      url,
      userAgent,
      level: level || 'error',
      component: component || 'unknown',
      category: category || 'frontend_error',
      correlationId,
      errorDetails,
      userId: req.user?.id || 'anonymous',
      reportedAt: new Date().toISOString()
    });

    // Log security events for suspicious frontend errors
    if (message.toLowerCase().includes('script') || 
        message.toLowerCase().includes('injection') ||
        message.toLowerCase().includes('xss')) {
      securityLog('suspicious_frontend_error', {
        message,
        url,
        userAgent,
        userId: req.user?.id || 'anonymous',
        correlationId
      }, SecuritySeverity.HIGH, correlationId);
    }

    res.json({
      success: true,
      message: 'Error report received',
      errorId,
      correlationId: req.correlationId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Frontend log batch endpoint
 */
router.post('/frontend-logs', async (req, res, next) => {
  try {
    const { logs, metadata } = req.body;

    if (!Array.isArray(logs)) {
      throw new AppError('Logs must be an array', 400);
    }

    // Process each log entry
    logs.forEach(logEntry => {
      const {
        level,
        message,
        timestamp,
        correlationId,
        category,
        component,
        action,
        data,
        error,
        performance
      } = logEntry;

      // Log with appropriate level
      const logLevel = level || 'info';
      logger[logLevel]('Frontend log', {
        message,
        timestamp,
        correlationId,
        category: category || 'frontend',
        component: component || 'unknown',
        action,
        data,
        error,
        performance,
        userId: req.user?.id || 'anonymous',
        metadata,
        source: 'frontend'
      });
    });

    res.json({
      success: true,
      message: `Processed ${logs.length} log entries`,
      correlationId: req.correlationId
    });
  } catch (error) {
    next(error);
  }
});

export { router as errorRouter };