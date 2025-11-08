import logger from '../utils/logger.js';
import { performanceMetrics } from './performanceMetrics.js';

/**
 * Database Performance Monitoring Service
 * Tracks database query performance, connection pool usage, and slow queries
 */
class DatabaseMonitoring {
  constructor() {
    this.queryMetrics = [];
    this.connectionPoolMetrics = [];
    this.slowQueryThreshold = 1000; // 1 second
    this.maxMetricsHistory = 5000;
    
    // Connection pool monitoring
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastReset: new Date()
    };

    this.startConnectionPoolMonitoring();
  }

  /**
   * Record database query metrics
   */
  recordQuery(queryData) {
    const queryMetric = {
      id: this.generateId(),
      query: this.sanitizeQuery(queryData.query),
      params: queryData.params ? '[REDACTED]' : null,
      duration: queryData.duration,
      target: queryData.target,
      timestamp: new Date(queryData.timestamp),
      isSlow: queryData.duration > this.slowQueryThreshold
    };

    this.queryMetrics.push(queryMetric);
    this.connectionStats.totalQueries++;

    // Track slow queries
    if (queryMetric.isSlow) {
      this.connectionStats.slowQueries++;
      logger.warn('Slow database query detected', {
        duration: `${queryData.duration}ms`,
        target: queryData.target,
        query: this.sanitizeQuery(queryData.query, 200)
      });
    }

    // Update average query time
    this.updateAverageQueryTime(queryData.duration);

    // Record in performance metrics
    performanceMetrics.recordSystemMetrics({
      type: 'database_query',
      duration: queryData.duration,
      target: queryData.target,
      isSlow: queryMetric.isSlow,
      timestamp: queryMetric.timestamp
    });

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.splice(0, this.queryMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Record database error
   */
  recordError(errorData) {
    this.connectionStats.failedQueries++;
    
    logger.error('Database query error', {
      message: errorData.message,
      target: errorData.target,
      timestamp: errorData.timestamp
    });

    performanceMetrics.recordError({
      endpoint: 'DATABASE',
      error: errorData.message,
      timestamp: new Date(errorData.timestamp)
    });
  }

  /**
   * Get database performance statistics
   */
  getPerformanceStats(timeWindow = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const recentQueries = this.queryMetrics.filter(q => q.timestamp.getTime() > cutoff);
    
    if (recentQueries.length === 0) {
      return {
        timeWindow: timeWindow / 1000,
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        slowQueryPercentage: 0,
        queryDistribution: {}
      };
    }

    const durations = recentQueries.map(q => q.duration);
    const slowQueries = recentQueries.filter(q => q.isSlow);
    
    // Group queries by target (table/collection)
    const queryDistribution = {};
    recentQueries.forEach(query => {
      if (!queryDistribution[query.target]) {
        queryDistribution[query.target] = {
          count: 0,
          totalDuration: 0,
          slowCount: 0
        };
      }
      queryDistribution[query.target].count++;
      queryDistribution[query.target].totalDuration += query.duration;
      if (query.isSlow) {
        queryDistribution[query.target].slowCount++;
      }
    });

    // Calculate averages for each target
    Object.keys(queryDistribution).forEach(target => {
      const stats = queryDistribution[target];
      stats.averageDuration = stats.totalDuration / stats.count;
      stats.slowPercentage = (stats.slowCount / stats.count) * 100;
    });

    return {
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      totalQueries: recentQueries.length,
      averageQueryTime: this.calculateAverage(durations),
      medianQueryTime: this.calculatePercentile(durations, 50),
      p95QueryTime: this.calculatePercentile(durations, 95),
      p99QueryTime: this.calculatePercentile(durations, 99),
      slowQueries: slowQueries.length,
      slowQueryPercentage: (slowQueries.length / recentQueries.length) * 100,
      queryDistribution,
      connectionPool: this.getConnectionPoolStats()
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 50, timeWindow = 3600000) {
    const cutoff = Date.now() - timeWindow;
    const slowQueries = this.queryMetrics
      .filter(q => q.timestamp.getTime() > cutoff && q.isSlow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);

    return {
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      slowQueries: slowQueries.map(q => ({
        duration: q.duration,
        target: q.target,
        query: q.query,
        timestamp: q.timestamp.toISOString()
      }))
    };
  }

  /**
   * Get connection pool statistics
   */
  getConnectionPoolStats() {
    return {
      ...this.connectionStats,
      slowQueryPercentage: this.connectionStats.totalQueries > 0 
        ? ((this.connectionStats.slowQueries / this.connectionStats.totalQueries) * 100).toFixed(2)
        : 0,
      failureRate: this.connectionStats.totalQueries > 0
        ? ((this.connectionStats.failedQueries / this.connectionStats.totalQueries) * 100).toFixed(2)
        : 0,
      uptime: Date.now() - this.connectionStats.lastReset.getTime()
    };
  }

  /**
   * Monitor connection pool metrics
   */
  startConnectionPoolMonitoring() {
    // Monitor connection pool every minute
    setInterval(() => {
      const poolMetric = {
        timestamp: new Date(),
        ...this.connectionStats
      };
      
      this.connectionPoolMetrics.push(poolMetric);
      
      // Keep only last 24 hours of connection pool metrics
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      this.connectionPoolMetrics = this.connectionPoolMetrics.filter(
        m => m.timestamp.getTime() > cutoff
      );

      // Log warning if performance is degrading
      if (this.connectionStats.totalQueries > 100) {
        const slowQueryPercentage = (this.connectionStats.slowQueries / this.connectionStats.totalQueries) * 100;
        if (slowQueryPercentage > 10) {
          logger.warn('High percentage of slow database queries', {
            slowQueryPercentage: slowQueryPercentage.toFixed(2),
            totalQueries: this.connectionStats.totalQueries,
            slowQueries: this.connectionStats.slowQueries
          });
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Update average query time using exponential moving average
   */
  updateAverageQueryTime(newDuration) {
    if (this.connectionStats.averageQueryTime === 0) {
      this.connectionStats.averageQueryTime = newDuration;
    } else {
      // Use exponential moving average with alpha = 0.1
      this.connectionStats.averageQueryTime = 
        (0.1 * newDuration) + (0.9 * this.connectionStats.averageQueryTime);
    }
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  sanitizeQuery(query, maxLength = 500) {
    if (!query) return '[UNKNOWN]';
    
    let sanitized = query
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/password\s*=\s*"[^"]*"/gi, 'password="[REDACTED]"')
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .replace(/token\s*=\s*"[^"]*"/gi, 'token="[REDACTED]"');
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
    }
    
    return sanitized;
  }

  /**
   * Calculate average of an array
   */
  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  /**
   * Calculate percentile of an array
   */
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Reset statistics
   */
  reset() {
    this.queryMetrics = [];
    this.connectionPoolMetrics = [];
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      lastReset: new Date()
    };
    logger.info('Database monitoring statistics reset');
  }
}

// Export singleton instance
export const databaseMonitoring = new DatabaseMonitoring();