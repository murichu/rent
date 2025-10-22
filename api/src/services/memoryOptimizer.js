import logger from "../utils/logger.js";
import { performance } from "perf_hooks";

/**
 * Memory and Resource Optimization Service
 * Provides memory monitoring, garbage collection optimization, and memory leak detection
 */

class MemoryOptimizer {
  constructor() {
    this.memoryStats = [];
    this.gcStats = [];
    this.monitoringInterval = null;
    this.memoryThreshold = 0.8; // 80% memory usage threshold
    this.gcThreshold = 0.9; // 90% memory usage triggers GC
    this.maxStatsHistory = 1000; // Keep last 1000 memory readings
    this.isMonitoring = false;
  }

  /**
   * Start memory monitoring with configurable interval
   */
  startMonitoring(intervalMs = 60000) { // Default: 1 minute
    if (this.isMonitoring) {
      logger.warn('Memory monitoring already started');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting memory monitoring', { intervalMs });

    this.monitoringInterval = setInterval(() => {
      this.collectMemoryStats();
    }, intervalMs);

    // Initial collection
    this.collectMemoryStats();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      logger.info('Memory monitoring stopped');
    }
  }

  /**
   * Collect current memory statistics
   */
  collectMemoryStats() {
    const memUsage = process.memoryUsage();
    const timestamp = new Date();
    
    const stats = {
      timestamp,
      rss: memUsage.rss, // Resident Set Size
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      heapUtilization: memUsage.heapUsed / memUsage.heapTotal,
      rssUtilization: memUsage.rss / (1024 * 1024 * 1024), // Convert to GB
      uptime: process.uptime()
    };

    // Add to history
    this.memoryStats.push(stats);
    
    // Keep only recent stats
    if (this.memoryStats.length > this.maxStatsHistory) {
      this.memoryStats = this.memoryStats.slice(-this.maxStatsHistory);
    }

    // Check for memory issues
    this.checkMemoryThresholds(stats);
    
    // Log memory stats periodically
    if (this.memoryStats.length % 10 === 0) { // Every 10 minutes with 1-minute intervals
      logger.info('Memory usage stats', {
        heapUsed: `${Math.round(stats.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(stats.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(stats.rss / 1024 / 1024)}MB`,
        heapUtilization: `${Math.round(stats.heapUtilization * 100)}%`,
        uptime: `${Math.round(stats.uptime / 3600)}h`
      });
    }

    return stats;
  }

  /**
   * Check memory thresholds and trigger actions
   */
  checkMemoryThresholds(stats) {
    // High memory usage warning
    if (stats.heapUtilization > this.memoryThreshold) {
      logger.warn('High memory usage detected', {
        heapUtilization: `${Math.round(stats.heapUtilization * 100)}%`,
        heapUsed: `${Math.round(stats.heapUsed / 1024 / 1024)}MB`,
        threshold: `${Math.round(this.memoryThreshold * 100)}%`
      });
    }

    // Critical memory usage - trigger garbage collection
    if (stats.heapUtilization > this.gcThreshold) {
      logger.error('Critical memory usage - triggering garbage collection', {
        heapUtilization: `${Math.round(stats.heapUtilization * 100)}%`,
        heapUsed: `${Math.round(stats.heapUsed / 1024 / 1024)}MB`
      });
      
      this.forceGarbageCollection();
    }
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (global.gc) {
      const beforeGC = process.memoryUsage();
      const startTime = performance.now();
      
      global.gc();
      
      const afterGC = process.memoryUsage();
      const duration = performance.now() - startTime;
      
      const gcStats = {
        timestamp: new Date(),
        duration,
        beforeHeapUsed: beforeGC.heapUsed,
        afterHeapUsed: afterGC.heapUsed,
        memoryFreed: beforeGC.heapUsed - afterGC.heapUsed,
        heapReduction: ((beforeGC.heapUsed - afterGC.heapUsed) / beforeGC.heapUsed) * 100
      };
      
      this.gcStats.push(gcStats);
      
      // Keep only recent GC stats
      if (this.gcStats.length > 100) {
        this.gcStats = this.gcStats.slice(-100);
      }
      
      logger.info('Garbage collection completed', {
        duration: `${Math.round(duration)}ms`,
        memoryFreed: `${Math.round(gcStats.memoryFreed / 1024 / 1024)}MB`,
        heapReduction: `${Math.round(gcStats.heapReduction)}%`
      });
      
      return gcStats;
    } else {
      logger.warn('Garbage collection not available - start Node.js with --expose-gc flag');
      return null;
    }
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks() {
    if (this.memoryStats.length < 10) {
      return { hasLeak: false, message: 'Insufficient data for leak detection' };
    }

    const recent = this.memoryStats.slice(-10);
    const older = this.memoryStats.slice(-20, -10);
    
    if (older.length === 0) {
      return { hasLeak: false, message: 'Insufficient historical data' };
    }

    const recentAvg = recent.reduce((sum, stat) => sum + stat.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, stat) => sum + stat.heapUsed, 0) / older.length;
    
    const growthRate = (recentAvg - olderAvg) / olderAvg;
    const isGrowing = growthRate > 0.1; // 10% growth threshold
    
    // Check for consistent growth pattern
    let consistentGrowth = true;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].heapUsed < recent[i - 1].heapUsed) {
        consistentGrowth = false;
        break;
      }
    }

    const hasLeak = isGrowing && consistentGrowth && growthRate > 0.2; // 20% growth with consistent pattern
    
    const result = {
      hasLeak,
      growthRate: Math.round(growthRate * 100),
      recentAverage: Math.round(recentAvg / 1024 / 1024),
      olderAverage: Math.round(olderAvg / 1024 / 1024),
      consistentGrowth,
      message: hasLeak 
        ? `Potential memory leak detected: ${Math.round(growthRate * 100)}% growth rate`
        : 'No memory leak detected'
    };

    if (hasLeak) {
      logger.error('Memory leak detected', result);
    }

    return result;
  }

  /**
   * Get current memory statistics
   */
  getCurrentStats() {
    return this.collectMemoryStats();
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(limit = 100) {
    return this.memoryStats.slice(-limit);
  }

  /**
   * Get garbage collection history
   */
  getGCHistory(limit = 50) {
    return this.gcStats.slice(-limit);
  }

  /**
   * Generate memory usage report
   */
  generateMemoryReport() {
    const current = this.getCurrentStats();
    const leakDetection = this.detectMemoryLeaks();
    const history = this.getMemoryHistory(60); // Last hour with 1-minute intervals
    
    const avgHeapUsage = history.length > 0 
      ? history.reduce((sum, stat) => sum + stat.heapUsed, 0) / history.length
      : current.heapUsed;
    
    const maxHeapUsage = history.length > 0
      ? Math.max(...history.map(stat => stat.heapUsed))
      : current.heapUsed;
    
    const minHeapUsage = history.length > 0
      ? Math.min(...history.map(stat => stat.heapUsed))
      : current.heapUsed;

    return {
      timestamp: new Date(),
      current: {
        heapUsed: Math.round(current.heapUsed / 1024 / 1024),
        heapTotal: Math.round(current.heapTotal / 1024 / 1024),
        rss: Math.round(current.rss / 1024 / 1024),
        heapUtilization: Math.round(current.heapUtilization * 100),
        uptime: Math.round(current.uptime / 3600)
      },
      statistics: {
        averageHeapUsage: Math.round(avgHeapUsage / 1024 / 1024),
        maxHeapUsage: Math.round(maxHeapUsage / 1024 / 1024),
        minHeapUsage: Math.round(minHeapUsage / 1024 / 1024),
        dataPoints: history.length
      },
      leakDetection,
      garbageCollection: {
        totalCollections: this.gcStats.length,
        recentCollections: this.gcStats.slice(-10),
        averageDuration: this.gcStats.length > 0
          ? Math.round(this.gcStats.reduce((sum, gc) => sum + gc.duration, 0) / this.gcStats.length)
          : 0
      },
      recommendations: this.generateRecommendations(current, leakDetection)
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(current, leakDetection) {
    const recommendations = [];
    
    if (current.heapUtilization > 0.8) {
      recommendations.push('High memory usage detected - consider optimizing queries or implementing result streaming');
    }
    
    if (leakDetection.hasLeak) {
      recommendations.push('Potential memory leak detected - review recent code changes and check for unclosed resources');
    }
    
    if (this.gcStats.length > 0) {
      const recentGC = this.gcStats.slice(-5);
      const avgDuration = recentGC.reduce((sum, gc) => sum + gc.duration, 0) / recentGC.length;
      
      if (avgDuration > 100) {
        recommendations.push('Garbage collection taking too long - consider reducing object creation or optimizing data structures');
      }
    }
    
    if (current.uptime > 86400 && current.heapUtilization > 0.7) { // 24 hours uptime
      recommendations.push('Long-running process with high memory usage - consider periodic restarts or memory cleanup');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Memory usage is within normal parameters');
    }
    
    return recommendations;
  }

  /**
   * Optimize memory usage by cleaning up old data
   */
  optimizeMemory() {
    const beforeOptimization = process.memoryUsage();
    
    // Clear old statistics
    if (this.memoryStats.length > this.maxStatsHistory / 2) {
      this.memoryStats = this.memoryStats.slice(-this.maxStatsHistory / 2);
    }
    
    if (this.gcStats.length > 50) {
      this.gcStats = this.gcStats.slice(-50);
    }
    
    // Force garbage collection if available
    const gcResult = this.forceGarbageCollection();
    
    const afterOptimization = process.memoryUsage();
    
    const optimization = {
      timestamp: new Date(),
      beforeHeapUsed: beforeOptimization.heapUsed,
      afterHeapUsed: afterOptimization.heapUsed,
      memoryFreed: beforeOptimization.heapUsed - afterOptimization.heapUsed,
      gcTriggered: gcResult !== null
    };
    
    logger.info('Memory optimization completed', {
      memoryFreed: `${Math.round(optimization.memoryFreed / 1024 / 1024)}MB`,
      gcTriggered: optimization.gcTriggered
    });
    
    return optimization;
  }
}

// Create singleton instance
const memoryOptimizer = new MemoryOptimizer();

export default memoryOptimizer;