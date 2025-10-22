import logger from '../utils/logger.js';

/**
 * Performance Metrics Service
 * Handles collection, storage, and analysis of performance data
 */
class PerformanceMetrics {
  constructor() {
    this.apiMetrics = new Map(); // endpoint -> metrics array
    this.memoryMetrics = [];
    this.errorMetrics = [];
    this.systemMetrics = [];
    
    // Configuration
    this.maxMetricsHistory = 10000; // Keep last 10k metrics
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Record API response metrics
   */
  recordApiResponse(metrics) {
    const key = `${metrics.method} ${metrics.path}`;
    
    if (!this.apiMetrics.has(key)) {
      this.apiMetrics.set(key, []);
    }
    
    const endpointMetrics = this.apiMetrics.get(key);
    endpointMetrics.push({
      ...metrics,
      id: this.generateId()
    });
    
    // Keep only recent metrics
    if (endpointMetrics.length > this.maxMetricsHistory) {
      endpointMetrics.splice(0, endpointMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Record memory usage metrics
   */
  recordMemoryUsage(metrics) {
    this.memoryMetrics.push({
      ...metrics,
      id: this.generateId()
    });
    
    // Keep only recent metrics
    if (this.memoryMetrics.length > this.maxMetricsHistory) {
      this.memoryMetrics.splice(0, this.memoryMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Record error metrics
   */
  recordError(metrics) {
    this.errorMetrics.push({
      ...metrics,
      id: this.generateId()
    });
    
    // Keep only recent metrics
    if (this.errorMetrics.length > this.maxMetricsHistory) {
      this.errorMetrics.splice(0, this.errorMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Record system resource metrics
   */
  recordSystemMetrics(metrics) {
    this.systemMetrics.push({
      ...metrics,
      id: this.generateId()
    });
    
    // Keep only recent metrics
    if (this.systemMetrics.length > this.maxMetricsHistory) {
      this.systemMetrics.splice(0, this.systemMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Get API performance statistics
   */
  getApiStats(timeWindow = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const stats = {};

    for (const [endpoint, metrics] of this.apiMetrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp.getTime() > cutoff);
      
      if (recentMetrics.length === 0) continue;

      const responseTimes = recentMetrics.map(m => m.responseTime);
      const statusCodes = recentMetrics.map(m => m.statusCode);
      
      stats[endpoint] = {
        totalRequests: recentMetrics.length,
        averageResponseTime: this.calculateAverage(responseTimes),
        medianResponseTime: this.calculatePercentile(responseTimes, 50),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        minResponseTime: Math.min(...responseTimes),
        maxResponseTime: Math.max(...responseTimes),
        slowRequests: recentMetrics.filter(m => m.responseTime > 1000).length,
        errorRate: (statusCodes.filter(code => code >= 400).length / recentMetrics.length) * 100,
        requestsPerMinute: (recentMetrics.length / (timeWindow / 60000)).toFixed(2)
      };
    }

    return stats;
  }

  /**
   * Get slow requests (>1 second)
   */
  getSlowRequests(limit = 100, timeWindow = 3600000) {
    const cutoff = Date.now() - timeWindow;
    const slowRequests = [];

    for (const metrics of this.apiMetrics.values()) {
      const recentSlowRequests = metrics
        .filter(m => m.timestamp.getTime() > cutoff && m.responseTime > 1000)
        .sort((a, b) => b.responseTime - a.responseTime);
      
      slowRequests.push(...recentSlowRequests);
    }

    return slowRequests
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(timeWindow = 3600000) {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.memoryMetrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) return null;

    const heapUsed = recentMetrics.map(m => m.memoryUsage.heapUsed);
    const rss = recentMetrics.map(m => m.memoryUsage.rss);
    
    return {
      samples: recentMetrics.length,
      heapUsed: {
        current: recentMetrics[recentMetrics.length - 1].memoryUsage.heapUsed,
        average: this.calculateAverage(heapUsed),
        max: Math.max(...heapUsed),
        min: Math.min(...heapUsed)
      },
      rss: {
        current: recentMetrics[recentMetrics.length - 1].memoryUsage.rss,
        average: this.calculateAverage(rss),
        max: Math.max(...rss),
        min: Math.min(...rss)
      }
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(timeWindow = 3600000) {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = this.errorMetrics.filter(m => m.timestamp.getTime() > cutoff);
    
    const errorsByEndpoint = {};
    const errorsByType = {};
    
    recentErrors.forEach(error => {
      // Group by endpoint
      if (!errorsByEndpoint[error.endpoint]) {
        errorsByEndpoint[error.endpoint] = 0;
      }
      errorsByEndpoint[error.endpoint]++;
      
      // Group by error message
      if (!errorsByType[error.error]) {
        errorsByType[error.error] = 0;
      }
      errorsByType[error.error]++;
    });

    return {
      totalErrors: recentErrors.length,
      errorsByEndpoint,
      errorsByType,
      recentErrors: recentErrors.slice(-10) // Last 10 errors
    };
  }

  /**
   * Get system performance overview
   */
  getPerformanceOverview(timeWindow = 3600000) {
    const apiStats = this.getApiStats(timeWindow);
    const memoryStats = this.getMemoryStats(timeWindow);
    const errorStats = this.getErrorStats(timeWindow);
    
    // Calculate overall metrics
    const allEndpoints = Object.values(apiStats);
    const totalRequests = allEndpoints.reduce((sum, stats) => sum + stats.totalRequests, 0);
    const averageResponseTime = allEndpoints.length > 0 
      ? allEndpoints.reduce((sum, stats) => sum + stats.averageResponseTime, 0) / allEndpoints.length 
      : 0;
    const totalSlowRequests = allEndpoints.reduce((sum, stats) => sum + stats.slowRequests, 0);
    const averageErrorRate = allEndpoints.length > 0
      ? allEndpoints.reduce((sum, stats) => sum + stats.errorRate, 0) / allEndpoints.length
      : 0;

    return {
      timeWindow: timeWindow / 1000, // Convert to seconds
      timestamp: new Date().toISOString(),
      overview: {
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        slowRequestsCount: totalSlowRequests,
        slowRequestsPercentage: totalRequests > 0 ? ((totalSlowRequests / totalRequests) * 100).toFixed(2) : 0,
        averageErrorRate: averageErrorRate.toFixed(2),
        totalErrors: errorStats.totalErrors
      },
      endpoints: apiStats,
      memory: memoryStats,
      errors: errorStats
    };
  }

  /**
   * Generate endpoint performance report
   */
  generateEndpointReport(endpoint, timeWindow = 3600000) {
    const cutoff = Date.now() - timeWindow;
    const metrics = this.apiMetrics.get(endpoint);
    
    if (!metrics) {
      return { error: 'Endpoint not found' };
    }

    const recentMetrics = metrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) {
      return { error: 'No recent data available' };
    }

    const responseTimes = recentMetrics.map(m => m.responseTime);
    const statusCodes = recentMetrics.map(m => m.statusCode);
    
    // Group by time intervals (5-minute buckets)
    const buckets = {};
    const bucketSize = 5 * 60 * 1000; // 5 minutes
    
    recentMetrics.forEach(metric => {
      const bucketKey = Math.floor(metric.timestamp.getTime() / bucketSize) * bucketSize;
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(metric);
    });

    const timeSeries = Object.entries(buckets).map(([timestamp, metrics]) => ({
      timestamp: new Date(parseInt(timestamp)).toISOString(),
      requests: metrics.length,
      averageResponseTime: this.calculateAverage(metrics.map(m => m.responseTime)),
      errorRate: (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100
    }));

    return {
      endpoint,
      timeWindow: timeWindow / 1000,
      summary: {
        totalRequests: recentMetrics.length,
        averageResponseTime: this.calculateAverage(responseTimes),
        medianResponseTime: this.calculatePercentile(responseTimes, 50),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 99),
        slowRequests: recentMetrics.filter(m => m.responseTime > 1000).length,
        errorRate: (statusCodes.filter(code => code >= 400).length / recentMetrics.length) * 100
      },
      timeSeries,
      slowestRequests: recentMetrics
        .filter(m => m.responseTime > 1000)
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 10)
        .map(m => ({
          responseTime: m.responseTime,
          statusCode: m.statusCode,
          timestamp: m.timestamp.toISOString(),
          userId: m.userId
        }))
    };
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
   * Start cleanup interval to prevent memory leaks
   */
  startCleanupInterval() {
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      
      // Clean up old API metrics
      for (const [endpoint, metrics] of this.apiMetrics.entries()) {
        const filtered = metrics.filter(m => m.timestamp.getTime() > cutoff);
        if (filtered.length === 0) {
          this.apiMetrics.delete(endpoint);
        } else {
          this.apiMetrics.set(endpoint, filtered);
        }
      }
      
      // Clean up old memory metrics
      this.memoryMetrics = this.memoryMetrics.filter(m => m.timestamp.getTime() > cutoff);
      
      // Clean up old error metrics
      this.errorMetrics = this.errorMetrics.filter(m => m.timestamp.getTime() > cutoff);
      
      // Clean up old system metrics
      this.systemMetrics = this.systemMetrics.filter(m => m.timestamp.getTime() > cutoff);
      
      logger.debug('Performance metrics cleanup completed');
    }, this.cleanupInterval);
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.apiMetrics.clear();
    this.memoryMetrics = [];
    this.errorMetrics = [];
    this.systemMetrics = [];
    logger.info('Performance metrics reset');
  }
}

// Export singleton instance
export const performanceMetrics = new PerformanceMetrics();