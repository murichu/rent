import logger from '../utils/logger.js';
import { performanceMetrics } from './performanceMetrics.js';

/**
 * Memory Optimizer Service
 * Monitors memory usage and implements optimization strategies
 */
class MemoryOptimizer {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.memoryThresholds = {
      warning: 0.7,  // 70% of heap limit
      critical: 0.85, // 85% of heap limit
      emergency: 0.95 // 95% of heap limit
    };
    this.gcStats = {
      lastGC: null,
      gcCount: 0,
      totalGCTime: 0
    };
    this.memoryHistory = [];
    this.maxHistorySize = 1000; // Keep last 1000 memory readings
    
    // Bind methods
    this.handleMemoryPressure = this.handleMemoryPressure.bind(this);
    this.performGarbageCollection = this.performGarbageCollection.bind(this);
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(interval = 60000) { // Default 1 minute
    if (this.isMonitoring) {
      logger.warn('Memory monitoring already started');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, interval);

    this.isMonitoring = true;
    logger.info('Memory monitoring started', { interval });

    // Set up process memory warnings if available
    if (process.memoryUsage.rss) {
      process.on('warning', (warning) => {
        if (warning.name === 'MaxListenersExceededWarning') {
          logger.warn('Memory warning detected', {
            name: warning.name,
            message: warning.message
          });
        }
      });
    }
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Memory monitoring stopped');
  }

  /**
   * Check current memory usage and take action if needed
   */
  checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const heapTotal = memoryUsage.heapTotal;
    const rss = memoryUsage.rss;
    const external = memoryUsage.external;

    // Calculate heap usage percentage
    const heapUsagePercent = heapUsed / heapTotal;
    
    // Store memory history
    const memorySnapshot = {
      timestamp: new Date(),
      heapUsed,
      heapTotal,
      rss,
      external,
      heapUsagePercent,
      arrayBuffers: memoryUsage.arrayBuffers || 0
    };

    this.memoryHistory.push(memorySnapshot);
    
    // Keep history size manageable
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Record metrics
    performanceMetrics.recordMemoryUsage({
      endpoint: 'system',
      memoryUsage,
      memoryDelta: this.calculateMemoryDelta(),
      timestamp: new Date()
    });

    // Check thresholds and take action
    if (heapUsagePercent >= this.memoryThresholds.emergency) {
      this.handleMemoryPressure('emergency', memorySnapshot);
    } else if (heapUsagePercent >= this.memoryThresholds.critical) {
      this.handleMemoryPressure('critical', memorySnapshot);
    } else if (heapUsagePercent >= this.memoryThresholds.warning) {
      this.handleMemoryPressure('warning', memorySnapshot);
    }

    // Log memory stats periodically (every 10 checks)
    if (this.memoryHistory.length % 10 === 0) {
      this.logMemoryStats(memorySnapshot);
    }
  }

  /**
   * Handle memory pressure situations
   */
  handleMemoryPressure(level, memorySnapshot) {
    const { heapUsed, heapTotal, rss, heapUsagePercent } = memorySnapshot;
    
    logger.warn(`Memory pressure detected: ${level}`, {
      level,
      heapUsed: Math.round(heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(rss / 1024 / 1024) + 'MB',
      heapUsagePercent: (heapUsagePercent * 100).toFixed(2) + '%'
    });

    switch (level) {
      case 'warning':
        // Light cleanup
        this.performLightCleanup();
        break;
        
      case 'critical':
        // Aggressive cleanup
        this.performAggressiveCleanup();
        this.performGarbageCollection();
        break;
        
      case 'emergency':
        // Emergency measures
        this.performEmergencyCleanup();
        this.performGarbageCollection();
        this.alertAdministrators(memorySnapshot);
        break;
    }
  }

  /**
   * Perform light memory cleanup
   */
  performLightCleanup() {
    try {
      // Clear old performance metrics
      if (performanceMetrics.reset) {
        // Only clear if we have too much data
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
          performanceMetrics.reset();
          logger.info('Performance metrics cleared for memory optimization');
        }
      }

      // Clear old memory history
      if (this.memoryHistory.length > this.maxHistorySize / 2) {
        this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize / 2);
        logger.info('Memory history trimmed');
      }

    } catch (error) {
      logger.error('Light cleanup failed:', error);
    }
  }

  /**
   * Perform aggressive memory cleanup
   */
  performAggressiveCleanup() {
    try {
      // Clear more data
      this.performLightCleanup();
      
      // Clear Node.js internal caches if possible
      if (require.cache) {
        // Don't clear core modules, just clear some cached modules
        const cacheKeys = Object.keys(require.cache);
        const clearableModules = cacheKeys.filter(key => 
          key.includes('node_modules') && 
          !key.includes('express') && 
          !key.includes('prisma')
        );
        
        // Clear up to 10% of clearable modules
        const toClear = clearableModules.slice(0, Math.floor(clearableModules.length * 0.1));
        toClear.forEach(key => {
          delete require.cache[key];
        });
        
        if (toClear.length > 0) {
          logger.info(`Cleared ${toClear.length} cached modules`);
        }
      }

    } catch (error) {
      logger.error('Aggressive cleanup failed:', error);
    }
  }

  /**
   * Perform emergency memory cleanup
   */
  performEmergencyCleanup() {
    try {
      this.performAggressiveCleanup();
      
      // Clear all non-essential memory history
      this.memoryHistory = this.memoryHistory.slice(-100); // Keep only last 100 entries
      
      // Force garbage collection multiple times
      for (let i = 0; i < 3; i++) {
        this.performGarbageCollection();
      }

      logger.warn('Emergency memory cleanup performed');

    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
    }
  }

  /**
   * Perform garbage collection if available
   */
  performGarbageCollection() {
    if (global.gc) {
      const startTime = Date.now();
      
      try {
        global.gc();
        
        const gcTime = Date.now() - startTime;
        this.gcStats.lastGC = new Date();
        this.gcStats.gcCount++;
        this.gcStats.totalGCTime += gcTime;
        
        logger.info('Garbage collection performed', {
          gcTime: gcTime + 'ms',
          totalGCs: this.gcStats.gcCount
        });
        
      } catch (error) {
        logger.error('Garbage collection failed:', error);
      }
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc flag)');
    }
  }

  /**
   * Calculate memory delta from previous reading
   */
  calculateMemoryDelta() {
    if (this.memoryHistory.length < 2) {
      return {
        rss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0
      };
    }

    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const previous = this.memoryHistory[this.memoryHistory.length - 2];

    return {
      rss: current.rss - previous.rss,
      heapUsed: current.heapUsed - previous.heapUsed,
      heapTotal: current.heapTotal - previous.heapTotal,
      external: current.external - previous.external
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const currentMemory = process.memoryUsage();
    const recentHistory = this.memoryHistory.slice(-60); // Last 60 readings
    
    if (recentHistory.length === 0) {
      return {
        current: currentMemory,
        trend: 'unknown',
        gcStats: this.gcStats
      };
    }

    // Calculate trends
    const heapUsedTrend = this.calculateTrend(recentHistory.map(h => h.heapUsed));
    const rssTrend = this.calculateTrend(recentHistory.map(h => h.rss));

    return {
      current: currentMemory,
      history: {
        samples: recentHistory.length,
        timespan: recentHistory.length > 1 
          ? recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp
          : 0
      },
      trends: {
        heapUsed: heapUsedTrend,
        rss: rssTrend
      },
      thresholds: this.memoryThresholds,
      gcStats: this.gcStats,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Log memory statistics
   */
  logMemoryStats(memorySnapshot) {
    const { heapUsed, heapTotal, rss, external, heapUsagePercent } = memorySnapshot;
    
    logger.info('Memory statistics', {
      heapUsed: Math.round(heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(rss / 1024 / 1024) + 'MB',
      external: Math.round(external / 1024 / 1024) + 'MB',
      heapUsagePercent: (heapUsagePercent * 100).toFixed(2) + '%',
      gcCount: this.gcStats.gcCount,
      lastGC: this.gcStats.lastGC
    });
  }

  /**
   * Alert administrators about memory issues
   */
  async alertAdministrators(memorySnapshot) {
    try {
      const heapUsedMB = Math.round(memorySnapshot.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memorySnapshot.heapTotal / 1024 / 1024);
      const heapUsagePercent = (memorySnapshot.heapUsagePercent * 100).toFixed(2);

      logger.error('CRITICAL: Memory usage at emergency levels', {
        heapUsed: heapUsedMB + 'MB',
        heapTotal: heapTotalMB + 'MB',
        heapUsagePercent: heapUsagePercent + '%',
        timestamp: memorySnapshot.timestamp.toISOString()
      });

      // Send email alert
      try {
        const emailService = (await import('./email.js')).default;
        
        const emailContent = `
          <h2>🚨 Critical Memory Alert</h2>
          <p>The Haven API server is experiencing critical memory usage.</p>
          
          <h3>Memory Statistics:</h3>
          <ul>
            <li><strong>Heap Used:</strong> ${heapUsedMB} MB</li>
            <li><strong>Heap Total:</strong> ${heapTotalMB} MB</li>
            <li><strong>Usage Percentage:</strong> ${heapUsagePercent}%</li>
            <li><strong>Timestamp:</strong> ${memorySnapshot.timestamp.toISOString()}</li>
          </ul>
          
          <h3>Recommended Actions:</h3>
          <ul>
            <li>Check for memory leaks in the application</li>
            <li>Review recent deployments or code changes</li>
            <li>Consider restarting the server if usage continues to increase</li>
            <li>Monitor server logs for errors or unusual activity</li>
          </ul>
          
          <p><em>This is an automated alert from Haven Property Management System.</em></p>
        `;

        // Get admin emails from environment or database
        const adminEmails = process.env.ADMIN_ALERT_EMAILS?.split(',') || [];
        
        if (adminEmails.length > 0) {
          for (const email of adminEmails) {
            await emailService.sendEmail({
              to: email.trim(),
              subject: '🚨 Critical Memory Alert - Haven API',
              html: emailContent
            });
          }
          
          logger.info('Memory alert emails sent', { 
            recipients: adminEmails.length 
          });
        } else {
          logger.warn('No admin emails configured for memory alerts');
        }

      } catch (emailError) {
        logger.error('Failed to send memory alert email', { 
          error: emailError.message 
        });
      }

      // Send SMS alert if configured
      try {
        const smsService = (await import('./sms.js')).default;
        const adminPhones = process.env.ADMIN_ALERT_PHONES?.split(',') || [];
        
        if (adminPhones.length > 0) {
          const smsMessage = `CRITICAL: Haven API memory usage at ${heapUsagePercent}% (${heapUsedMB}MB). Immediate attention required.`;
          
          for (const phone of adminPhones) {
            await smsService.sendSMS({
              to: phone.trim(),
              message: smsMessage
            });
          }
          
          logger.info('Memory alert SMS sent', { 
            recipients: adminPhones.length 
          });
        }

      } catch (smsError) {
        logger.error('Failed to send memory alert SMS', { 
          error: smsError.message 
        });
      }

    } catch (error) {
      logger.error('Failed to send memory alerts', { 
        error: error.message 
      });
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks() {
    if (this.memoryHistory.length < 100) {
      return { hasLeak: false, confidence: 0 };
    }

    const recent = this.memoryHistory.slice(-100);
    const heapUsedValues = recent.map(h => h.heapUsed);
    
    // Check for consistent upward trend
    let increasingCount = 0;
    for (let i = 1; i < heapUsedValues.length; i++) {
      if (heapUsedValues[i] > heapUsedValues[i - 1]) {
        increasingCount++;
      }
    }

    const increasingPercentage = increasingCount / (heapUsedValues.length - 1);
    const hasLeak = increasingPercentage > 0.8; // 80% of readings show increase
    
    return {
      hasLeak,
      confidence: increasingPercentage,
      trend: this.calculateTrend(heapUsedValues),
      recommendation: hasLeak 
        ? 'Potential memory leak detected. Consider restarting the application.'
        : 'Memory usage appears normal.'
    };
  }

  /**
   * Get memory optimization recommendations
   */
  getOptimizationRecommendations() {
    const stats = this.getMemoryStats();
    const leakDetection = this.detectMemoryLeaks();
    const recommendations = [];

    // Check current usage
    const currentUsagePercent = stats.current.heapUsed / stats.current.heapTotal;
    
    if (currentUsagePercent > 0.8) {
      recommendations.push({
        priority: 'high',
        action: 'Immediate garbage collection needed',
        description: 'Memory usage is above 80% of heap limit'
      });
    }

    if (stats.trends.heapUsed === 'increasing') {
      recommendations.push({
        priority: 'medium',
        action: 'Monitor memory growth',
        description: 'Heap usage is consistently increasing'
      });
    }

    if (leakDetection.hasLeak) {
      recommendations.push({
        priority: 'critical',
        action: 'Investigate memory leak',
        description: `Potential memory leak detected (${(leakDetection.confidence * 100).toFixed(1)}% confidence)`
      });
    }

    if (stats.gcStats.gcCount === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Enable garbage collection',
        description: 'Run application with --expose-gc flag for better memory management'
      });
    }

    return {
      recommendations,
      leakDetection,
      currentStats: stats
    };
  }
}

// Export singleton instance
const memoryOptimizer = new MemoryOptimizer();
export default memoryOptimizer;