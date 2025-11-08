/**
 * Frontend Logging Service
 * Provides structured logging for frontend applications with backend integration
 */

import apiClient from '../lib/axios.js';

/**
 * Log Levels
 */
export const LogLevels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Log Categories
 */
export const LogCategories = {
  USER_ACTION: 'user_action',
  API_ERROR: 'api_error',
  COMPONENT_ERROR: 'component_error',
  NAVIGATION: 'navigation',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  BUSINESS: 'business'
};

/**
 * Frontend Logging Service Class
 */
class LoggingService {
  constructor() {
    this.isEnabled = true;
    this.logQueue = [];
    this.maxQueueSize = 100;
    this.flushInterval = 30000; // 30 seconds
    this.batchSize = 10;
    this.isOnline = navigator.onLine;
    
    this.initializeService();
  }

  /**
   * Initialize the logging service
   */
  initializeService() {
    // Set up online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushLogs();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Set up periodic log flushing
    setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flushLogs(true);
    });

    // Set up global error handler
    window.addEventListener('error', (event) => {
      this.error('Global error caught', {
        message: event.error?.message || event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        category: LogCategories.COMPONENT_ERROR
      });
    });

    // Set up unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        category: LogCategories.COMPONENT_ERROR
      });
    });
  }

  /**
   * Generate correlation ID
   */
  generateCorrelationId() {
    return `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user context
   */
  getUserContext() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        userId: user.id || 'anonymous',
        userRole: user.role || 'unknown',
        userName: user.name || 'unknown'
      };
    } catch (error) {
      return {
        userId: 'anonymous',
        userRole: 'unknown',
        userName: 'unknown'
      };
    }
  }

  /**
   * Create log entry
   */
  createLogEntry(level, message, context = {}) {
    const userContext = this.getUserContext();
    
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId || this.generateCorrelationId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...userContext,
      category: context.category || LogCategories.USER_ACTION,
      component: context.component || 'unknown',
      action: context.action,
      data: context.data,
      error: context.error,
      stack: context.stack,
      performance: context.performance,
      sessionId: this.getSessionId()
    };
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('logging_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('logging_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Add log to queue
   */
  addToQueue(logEntry) {
    if (!this.isEnabled) return;

    this.logQueue.push(logEntry);

    // Remove oldest entries if queue is too large
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize);
    }

    // Auto-flush for errors
    if (logEntry.level === LogLevels.ERROR) {
      setTimeout(() => this.flushLogs(), 1000);
    }
  }

  /**
   * Log error message
   */
  error(message, context = {}) {
    const logEntry = this.createLogEntry(LogLevels.ERROR, message, context);
    
    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${logEntry.correlationId}] ${message}`, context);
    }

    this.addToQueue(logEntry);
    return logEntry.correlationId;
  }

  /**
   * Log warning message
   */
  warn(message, context = {}) {
    const logEntry = this.createLogEntry(LogLevels.WARN, message, context);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${logEntry.correlationId}] ${message}`, context);
    }

    this.addToQueue(logEntry);
    return logEntry.correlationId;
  }

  /**
   * Log info message
   */
  info(message, context = {}) {
    const logEntry = this.createLogEntry(LogLevels.INFO, message, context);
    
    if (process.env.NODE_ENV === 'development') {
      console.info(`[${logEntry.correlationId}] ${message}`, context);
    }

    this.addToQueue(logEntry);
    return logEntry.correlationId;
  }

  /**
   * Log debug message
   */
  debug(message, context = {}) {
    // Only log debug messages in development
    if (process.env.NODE_ENV !== 'development') return;

    const logEntry = this.createLogEntry(LogLevels.DEBUG, message, context);
    console.debug(`[${logEntry.correlationId}] ${message}`, context);
    
    this.addToQueue(logEntry);
    return logEntry.correlationId;
  }

  /**
   * Log user action
   */
  logUserAction(action, component, data = {}) {
    return this.info(`User action: ${action}`, {
      category: LogCategories.USER_ACTION,
      component,
      action,
      data
    });
  }

  /**
   * Log API error
   */
  logApiError(error, endpoint, method = 'unknown') {
    return this.error(`API error: ${method} ${endpoint}`, {
      category: LogCategories.API_ERROR,
      component: 'api_client',
      error: {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      },
      endpoint,
      method
    });
  }

  /**
   * Log component error
   */
  logComponentError(error, component, action = 'render') {
    return this.error(`Component error in ${component}`, {
      category: LogCategories.COMPONENT_ERROR,
      component,
      action,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
  }

  /**
   * Log navigation event
   */
  logNavigation(from, to, method = 'unknown') {
    return this.info(`Navigation: ${from} -> ${to}`, {
      category: LogCategories.NAVIGATION,
      component: 'router',
      action: 'navigate',
      data: { from, to, method }
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(metric, value, component = 'unknown') {
    return this.info(`Performance: ${metric}`, {
      category: LogCategories.PERFORMANCE,
      component,
      performance: {
        metric,
        value,
        timestamp: performance.now()
      }
    });
  }

  /**
   * Log security event
   */
  logSecurity(event, details = {}) {
    return this.warn(`Security event: ${event}`, {
      category: LogCategories.SECURITY,
      component: 'security',
      action: event,
      data: details
    });
  }

  /**
   * Log business event
   */
  logBusiness(event, data = {}) {
    return this.info(`Business event: ${event}`, {
      category: LogCategories.BUSINESS,
      component: 'business',
      action: event,
      data
    });
  }

  /**
   * Flush logs to backend
   */
  async flushLogs(force = false) {
    if (!this.isOnline && !force) return;
    if (this.logQueue.length === 0) return;

    const logsToSend = this.logQueue.splice(0, this.batchSize);

    try {
      await apiClient.post('/api/v1/logs/frontend', {
        logs: logsToSend,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      });

      if (process.env.NODE_ENV === 'development') {
        console.debug(`Flushed ${logsToSend.length} logs to backend`);
      }
    } catch (error) {
      // Put logs back in queue if sending failed
      this.logQueue.unshift(...logsToSend);
      
      console.warn('Failed to send logs to backend:', error.message);
      
      // Store logs locally as backup
      this.storeLogsLocally(logsToSend);
    }
  }

  /**
   * Store logs locally as backup
   */
  storeLogsLocally(logs) {
    try {
      const existingLogs = JSON.parse(localStorage.getItem('frontend_logs') || '[]');
      const allLogs = [...existingLogs, ...logs];
      
      // Keep only last 100 logs
      const recentLogs = allLogs.slice(-100);
      localStorage.setItem('frontend_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('Failed to store logs locally:', error.message);
    }
  }

  /**
   * Get stored logs
   */
  getStoredLogs() {
    try {
      return JSON.parse(localStorage.getItem('frontend_logs') || '[]');
    } catch (error) {
      console.warn('Failed to retrieve stored logs:', error.message);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs() {
    try {
      localStorage.removeItem('frontend_logs');
      this.logQueue = [];
    } catch (error) {
      console.warn('Failed to clear stored logs:', error.message);
    }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.logQueue = [];
    }
  }

  /**
   * Get logging statistics
   */
  getStats() {
    return {
      queueSize: this.logQueue.length,
      isEnabled: this.isEnabled,
      isOnline: this.isOnline,
      sessionId: this.getSessionId(),
      storedLogsCount: this.getStoredLogs().length
    };
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Add constants as static properties for easy access
loggingService.LogLevels = LogLevels;
loggingService.LogCategories = LogCategories;

// Export service instance as default
export default loggingService;