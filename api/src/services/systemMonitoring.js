import os from 'os';
import logger from '../utils/logger.js';
import { performanceMetrics } from './performanceMetrics.js';

/**
 * System Resource Monitoring Service
 * Tracks memory usage, CPU utilization, and system health metrics
 */
class SystemMonitoring {
  constructor() {
    this.memoryMetrics = [];
    this.cpuMetrics = [];
    this.gcMetrics = [];
    this.maxMetricsHistory = 1440; // 24 hours of minute-by-minute data
    
    // Memory thresholds
    this.memoryWarningThreshold = 0.8; // 80%
    this.memoryCriticalThreshold = 0.9; // 90%
    
    // CPU thresholds
    this.cpuWarningThreshold = 0.8; // 80%
    this.cpuCriticalThreshold = 0.9; // 90%
    
    // System information
    this.systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      uptime: process.uptime()
    };

    // Start monitoring intervals
    this.startMemoryMonitoring();
    this.startCpuMonitoring();
    this.startGcMonitoring();
  }

  /**
   * Start memory monitoring (every minute)
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };
      
      const memoryMetric = {
        timestamp: new Date(),
        process: memoryUsage,
        system: systemMemory,
        processMemoryPercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        systemMemoryPercent: (systemMemory.used / systemMemory.total) * 100
      };

      this.memoryMetrics.push(memoryMetric);
      
      // Record in performance metrics
      performanceMetrics.recordSystemMetrics({
        type: 'memory',
        ...memoryMetric,
        timestamp: memoryMetric.timestamp
      });

      // Check for memory warnings
      this.checkMemoryThresholds(memoryMetric);

      // Keep only recent metrics
      if (this.memoryMetrics.length > this.maxMetricsHistory) {
        this.memoryMetrics.splice(0, this.memoryMetrics.length - this.maxMetricsHistory);
      }
    }, 60000); // Every minute
  }

  /**
   * Start CPU monitoring (every minute)
   */
  startCpuMonitoring() {
    let previousCpuUsage = process.cpuUsage();
    let previousTime = process.hrtime.bigint();

    setInterval(() => {
      const currentCpuUsage = process.cpuUsage();
      const currentTime = process.hrtime.bigint();
      
      // Calculate CPU usage percentage
      const timeDiff = Number(currentTime - previousTime) / 1000000; // Convert to milliseconds
      const userCpuDiff = currentCpuUsage.user - previousCpuUsage.user;
      const systemCpuDiff = currentCpuUsage.system - previousCpuUsage.system;
      
      const cpuPercent = ((userCpuDiff + systemCpuDiff) / timeDiff) * 100;
      
      // Get system load averages
      const loadAvg = os.loadavg();
      
      const cpuMetric = {
        timestamp: new Date(),
        process: {
          user: currentCpuUsage.user,
          system: currentCpuUsage.system,
          percent: Math.min(cpuPercent, 100) // Cap at 100%
        },
        system: {
          loadAvg1: loadAvg[0],
          loadAvg5: loadAvg[1],
          loadAvg15: loadAvg[2],
          cpuCount: os.cpus().length
        },
        uptime: {
          process: process.uptime(),
          system: os.uptime()
        }
      };

      this.cpuMetrics.push(cpuMetric);
      
      // Record in performance metrics
      performanceMetrics.recordSystemMetrics({
        type: 'cpu',
        ...cpuMetric,
        timestamp: cpuMetric.timestamp
      });

      // Check for CPU warnings
      this.checkCpuThresholds(cpuMetric);

      // Update for next iteration
      previousCpuUsage = currentCpuUsage;
      previousTime = currentTime;

      // Keep only recent metrics
      if (this.cpuMetrics.length > this.maxMetricsHistory) {
        this.cpuMetrics.splice(0, this.cpuMetrics.length - this.maxMetricsHistory);
      }
    }, 60000); // Every minute
  }

  /**
   * Start garbage collection monitoring
   */
  startGcMonitoring() {
    // Enable GC monitoring if available
    if (global.gc) {
      const originalGc = global.gc;
      global.gc = () => {
        const startTime = process.hrtime.bigint();
        const beforeMemory = process.memoryUsage();
        
        originalGc();
        
        const endTime = process.hrtime.bigint();
        const afterMemory = process.memoryUsage();
        const gcDuration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        const gcMetric = {
          timestamp: new Date(),
          duration: gcDuration,
          memoryBefore: beforeMemory,
          memoryAfter: afterMemory,
          memoryFreed: beforeMemory.heapUsed - afterMemory.heapUsed
        };

        this.gcMetrics.push(gcMetric);
        
        // Log significant GC events
        if (gcDuration > 100) { // More than 100ms
          logger.warn('Long garbage collection detected', {
            duration: `${gcDuration.toFixed(2)}ms`,
            memoryFreed: `${(gcMetric.memoryFreed / 1024 / 1024).toFixed(2)}MB`
          });
        }

        // Keep only recent metrics
        if (this.gcMetrics.length > this.maxMetricsHistory) {
          this.gcMetrics.splice(0, this.gcMetrics.length - this.maxMetricsHistory);
        }
      };
    }

    // Monitor for potential memory leaks
    setInterval(() => {
      this.detectMemoryLeaks();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Check memory usage thresholds
   */
  checkMemoryThresholds(memoryMetric) {
    const processMemoryPercent = memoryMetric.processMemoryPercent / 100;
    const systemMemoryPercent = memoryMetric.systemMemoryPercent / 100;

    if (processMemoryPercent > this.memoryCriticalThreshold) {
      logger.error('Critical process memory usage', {
        processMemoryPercent: `${(processMemoryPercent * 100).toFixed(2)}%`,
        heapUsed: `${(memoryMetric.process.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryMetric.process.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });
    } else if (processMemoryPercent > this.memoryWarningThreshold) {
      logger.warn('High process memory usage', {
        processMemoryPercent: `${(processMemoryPercent * 100).toFixed(2)}%`,
        heapUsed: `${(memoryMetric.process.heapUsed / 1024 / 1024).toFixed(2)}MB`
      });
    }

    if (systemMemoryPercent > this.memoryCriticalThreshold) {
      logger.error('Critical system memory usage', {
        systemMemoryPercent: `${(systemMemoryPercent * 100).toFixed(2)}%`,
        usedMemory: `${(memoryMetric.system.used / 1024 / 1024 / 1024).toFixed(2)}GB`,
        totalMemory: `${(memoryMetric.system.total / 1024 / 1024 / 1024).toFixed(2)}GB`
      });
    }
  }

  /**
   * Check CPU usage thresholds
   */
  checkCpuThresholds(cpuMetric) {
    const cpuPercent = cpuMetric.process.percent / 100;
    const loadAvg1 = cpuMetric.system.loadAvg1;
    const cpuCount = cpuMetric.system.cpuCount;

    if (cpuPercent > this.cpuCriticalThreshold) {
      logger.error('Critical CPU usage', {
        cpuPercent: `${(cpuPercent * 100).toFixed(2)}%`,
        loadAvg1: loadAvg1.toFixed(2)
      });
    } else if (cpuPercent > this.cpuWarningThreshold) {
      logger.warn('High CPU usage', {
        cpuPercent: `${(cpuPercent * 100).toFixed(2)}%`,
        loadAvg1: loadAvg1.toFixed(2)
      });
    }

    // Check system load average
    if (loadAvg1 > cpuCount * 0.8) {
      logger.warn('High system load average', {
        loadAvg1: loadAvg1.toFixed(2),
        cpuCount,
        loadPerCpu: (loadAvg1 / cpuCount).toFixed(2)
      });
    }
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks() {
    if (this.memoryMetrics.length < 10) return;

    // Get last 10 memory measurements
    const recentMetrics = this.memoryMetrics.slice(-10);
    const heapUsages = recentMetrics.map(m => m.process.heapUsed);
    
    // Check if memory is consistently increasing
    let increasingCount = 0;
    for (let i = 1; i < heapUsages.length; i++) {
      if (heapUsages[i] > heapUsages[i - 1]) {
        increasingCount++;
      }
    }

    // If memory increased in 8 out of 10 measurements, potential leak
    if (increasingCount >= 8) {
      const memoryIncrease = heapUsages[heapUsages.length - 1] - heapUsages[0];
      const increasePercent = (memoryIncrease / heapUsages[0]) * 100;
      
      if (increasePercent > 20) { // More than 20% increase
        logger.warn('Potential memory leak detected', {
          memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
          increasePercent: `${increasePercent.toFixed(2)}%`,
          currentHeapUsed: `${(heapUsages[heapUsages.length - 1] / 1024 / 1024).toFixed(2)}MB`
        });
      }
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(timeWindow = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.memoryMetrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) return null;

    const heapUsed = recentMetrics.map(m => m.process.heapUsed);
    const systemUsed = recentMetrics.map(m => m.system.used);
    
    return {
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      samples: recentMetrics.length,
      process: {
        current: recentMetrics[recentMetrics.length - 1].process,
        heapUsed: {
          average: this.calculateAverage(heapUsed),
          max: Math.max(...heapUsed),
          min: Math.min(...heapUsed),
          trend: this.calculateTrend(heapUsed)
        }
      },
      system: {
        current: recentMetrics[recentMetrics.length - 1].system,
        used: {
          average: this.calculateAverage(systemUsed),
          max: Math.max(...systemUsed),
          min: Math.min(...systemUsed),
          trend: this.calculateTrend(systemUsed)
        }
      }
    };
  }

  /**
   * Get CPU statistics
   */
  getCpuStats(timeWindow = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.cpuMetrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) return null;

    const cpuPercents = recentMetrics.map(m => m.process.percent);
    const loadAvg1 = recentMetrics.map(m => m.system.loadAvg1);
    
    return {
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      samples: recentMetrics.length,
      process: {
        current: recentMetrics[recentMetrics.length - 1].process,
        percent: {
          average: this.calculateAverage(cpuPercents),
          max: Math.max(...cpuPercents),
          min: Math.min(...cpuPercents),
          trend: this.calculateTrend(cpuPercents)
        }
      },
      system: {
        current: recentMetrics[recentMetrics.length - 1].system,
        loadAvg1: {
          average: this.calculateAverage(loadAvg1),
          max: Math.max(...loadAvg1),
          min: Math.min(...loadAvg1),
          trend: this.calculateTrend(loadAvg1)
        }
      }
    };
  }

  /**
   * Get garbage collection statistics
   */
  getGcStats(timeWindow = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.gcMetrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) return null;

    const durations = recentMetrics.map(m => m.duration);
    const memoryFreed = recentMetrics.map(m => m.memoryFreed);
    
    return {
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      totalGcEvents: recentMetrics.length,
      duration: {
        total: durations.reduce((sum, d) => sum + d, 0),
        average: this.calculateAverage(durations),
        max: Math.max(...durations),
        min: Math.min(...durations)
      },
      memoryFreed: {
        total: memoryFreed.reduce((sum, m) => sum + m, 0),
        average: this.calculateAverage(memoryFreed),
        max: Math.max(...memoryFreed),
        min: Math.min(...memoryFreed)
      }
    };
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      ...this.systemInfo,
      currentUptime: {
        process: process.uptime(),
        system: os.uptime()
      },
      currentMemory: process.memoryUsage(),
      currentCpu: process.cpuUsage()
    };
  }

  /**
   * Calculate average of an array
   */
  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
  }

  /**
   * Calculate trend (positive = increasing, negative = decreasing)
   */
  calculateTrend(arr) {
    if (arr.length < 2) return 0;
    
    const first = arr[0];
    const last = arr[arr.length - 1];
    return ((last - first) / first) * 100;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.memoryMetrics = [];
    this.cpuMetrics = [];
    this.gcMetrics = [];
    logger.info('System monitoring metrics reset');
  }
}

// Export singleton instance
export const systemMonitoring = new SystemMonitoring();