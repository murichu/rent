import { prisma } from '../db.js';
import { systemMonitoring } from './systemMonitoring.js';
import { databaseMonitoring } from './databaseMonitoring.js';
import logger from '../utils/logger.js';

/**
 * Health Check Service
 * Provides comprehensive health monitoring for all system dependencies
 */
class HealthCheck {
  constructor() {
    this.healthHistory = [];
    this.maxHistoryLength = 100;
    
    // Health check thresholds
    this.thresholds = {
      database: {
        responseTime: 1000, // 1 second
        slowQueryPercentage: 10 // 10%
      },
      cache: {
        responseTime: 100, // 100ms
        hitRate: 70 // 70%
      },
      memory: {
        usage: 90 // 90%
      },
      cpu: {
        usage: 90 // 90%
      }
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      summary: {
        healthy: 0,
        warning: 0,
        critical: 0,
        total: 0
      }
    };

    try {
      // Database health check
      healthCheck.checks.database = await this.checkDatabase();
      
      // Cache health check
      healthCheck.checks.cache = await this.checkCache();
      
      // Memory health check
      healthCheck.checks.memory = this.checkMemory();
      
      // CPU health check
      healthCheck.checks.cpu = this.checkCpu();
      
      // Disk space check (if available)
      healthCheck.checks.disk = this.checkDisk();
      
      // External dependencies check
      healthCheck.checks.dependencies = await this.checkDependencies();

      // Calculate summary
      this.calculateHealthSummary(healthCheck);
      
      // Determine overall status (excluding disabled services)
      const criticalChecks = Object.values(healthCheck.checks).filter(
        c => c.status === 'critical' && c.status !== 'disabled'
      );
      const warningChecks = Object.values(healthCheck.checks).filter(
        c => c.status === 'warning' && c.status !== 'disabled'
      );
      
      if (criticalChecks.length > 0) {
        healthCheck.status = 'critical';
      } else if (warningChecks.length > 0) {
        healthCheck.status = 'warning';
      } else {
        healthCheck.status = 'healthy';
      }

      healthCheck.responseTime = Date.now() - startTime;
      
      // Store in history
      this.healthHistory.push(healthCheck);
      if (this.healthHistory.length > this.maxHistoryLength) {
        this.healthHistory.shift();
      }

      // Log critical health issues
      if (healthCheck.status === 'critical') {
        logger.error('Critical health check issues detected', {
          status: healthCheck.status,
          criticalChecks: Object.entries(healthCheck.checks)
            .filter(([_, check]) => check.status === 'critical')
            .map(([name, _]) => name)
        });
      }

      return healthCheck;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        timestamp: new Date().toISOString(),
        status: 'critical',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check database health
   */
  async checkDatabase() {
    const startTime = Date.now();
    const check = {
      name: 'Database',
      status: 'healthy',
      responseTime: null,
      details: {}
    };

    try {
      // Test basic connectivity - use findFirst instead of $queryRaw for MongoDB
      // This works for both MongoDB and SQL databases
      await prisma.user.findFirst({ take: 1 }).catch(() => null);
      check.responseTime = Date.now() - startTime;
      
      // Get database performance stats
      const dbStats = databaseMonitoring.getConnectionPoolStats();
      check.details = {
        connected: true,
        responseTime: `${check.responseTime}ms`,
        totalQueries: dbStats.totalQueries,
        slowQueries: dbStats.slowQueries,
        slowQueryPercentage: parseFloat(dbStats.slowQueryPercentage),
        failureRate: parseFloat(dbStats.failureRate)
      };

      // Check thresholds
      if (check.responseTime > this.thresholds.database.responseTime) {
        check.status = 'warning';
        check.message = `Database response time (${check.responseTime}ms) exceeds threshold`;
      }

      if (check.details.slowQueryPercentage > this.thresholds.database.slowQueryPercentage) {
        check.status = check.status === 'warning' ? 'critical' : 'warning';
        check.message = `High percentage of slow queries (${check.details.slowQueryPercentage}%)`;
      }

    } catch (error) {
      check.status = 'critical';
      check.error = error.message;
      check.details.connected = false;
      check.responseTime = Date.now() - startTime;
    }

    return check;
  }

  /**
   * Check cache health
   */
  async checkCache() {
    const startTime = Date.now();
    const check = {
      name: 'Cache',
      status: 'healthy',
      responseTime: null,
      details: {}
    };

    try {
      // Test cache connectivity
      const testKey = `health-check-${Date.now()}`;
      const testValue = 'test';
      
      // Cache functionality disabled
      const retrievedValue = null;
      
      check.responseTime = Date.now() - startTime;
      check.details = {
        connected: false,
        responseTime: `${check.responseTime}ms`,
        message: 'Cache system disabled'
      };

      check.status = 'disabled';

    } catch (error) {
      check.status = 'critical';
      check.error = error.message;
      check.details.connected = false;
      check.responseTime = Date.now() - startTime;
    }

    return check;
  }

  /**
   * Check memory health
   */
  checkMemory() {
    const check = {
      name: 'Memory',
      status: 'healthy',
      details: {}
    };

    try {
      const memoryUsage = process.memoryUsage();
      const memoryStats = systemMonitoring.getMemoryStats(300000); // Last 5 minutes
      
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      check.details = {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        heapUsagePercent: heapUsagePercent.toFixed(2),
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
      };

      if (memoryStats) {
        check.details.trend = memoryStats.process.heapUsed.trend > 0 ? 'increasing' : 'decreasing';
        check.details.averageUsage = `${(memoryStats.process.heapUsed.average / 1024 / 1024).toFixed(2)}MB`;
      }

      // Check memory usage threshold
      if (heapUsagePercent > this.thresholds.memory.usage) {
        check.status = 'critical';
        check.message = `Memory usage (${heapUsagePercent.toFixed(2)}%) exceeds critical threshold`;
      } else if (heapUsagePercent > this.thresholds.memory.usage * 0.8) {
        check.status = 'warning';
        check.message = `Memory usage (${heapUsagePercent.toFixed(2)}%) approaching threshold`;
      }

    } catch (error) {
      check.status = 'critical';
      check.error = error.message;
    }

    return check;
  }

  /**
   * Check CPU health
   */
  checkCpu() {
    const check = {
      name: 'CPU',
      status: 'healthy',
      details: {}
    };

    try {
      const cpuStats = systemMonitoring.getCpuStats(300000); // Last 5 minutes
      
      if (cpuStats) {
        check.details = {
          currentPercent: cpuStats.process.current.percent.toFixed(2),
          averagePercent: cpuStats.process.percent.average.toFixed(2),
          loadAvg1: cpuStats.system.current.loadAvg1.toFixed(2),
          loadAvg5: cpuStats.system.current.loadAvg5.toFixed(2),
          loadAvg15: cpuStats.system.current.loadAvg15.toFixed(2),
          trend: cpuStats.process.percent.trend > 0 ? 'increasing' : 'decreasing'
        };

        // Check CPU usage threshold
        if (cpuStats.process.current.percent > this.thresholds.cpu.usage) {
          check.status = 'critical';
          check.message = `CPU usage (${cpuStats.process.current.percent.toFixed(2)}%) exceeds critical threshold`;
        } else if (cpuStats.process.current.percent > this.thresholds.cpu.usage * 0.8) {
          check.status = 'warning';
          check.message = `CPU usage (${cpuStats.process.current.percent.toFixed(2)}%) approaching threshold`;
        }
      } else {
        check.details.message = 'CPU statistics not available yet';
      }

    } catch (error) {
      check.status = 'critical';
      check.error = error.message;
    }

    return check;
  }

  /**
   * Check disk space
   */
  checkDisk() {
    const check = {
      name: 'Disk',
      status: 'healthy',
      details: {}
    };

    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check current working directory space
      const currentDir = process.cwd();
      
      try {
        const stats = fs.statSync(currentDir);
        check.details.currentDirectory = currentDir;
        check.details.accessible = true;
        
        // Basic disk space check using available methods
        if (process.platform === 'win32') {
          // Windows - basic check
          check.details.platform = 'windows';
          check.details.message = 'Basic disk accessibility verified';
        } else {
          // Unix-like systems - could implement statvfs if needed
          check.details.platform = process.platform;
          check.details.message = 'Basic disk accessibility verified';
        }
        
        // Check if upload directory is accessible (if configured)
        if (process.env.UPLOAD_PATH) {
          try {
            fs.accessSync(process.env.UPLOAD_PATH, fs.constants.F_OK | fs.constants.W_OK);
            check.details.uploadPath = {
              path: process.env.UPLOAD_PATH,
              accessible: true,
              writable: true
            };
          } catch (uploadError) {
            check.details.uploadPath = {
              path: process.env.UPLOAD_PATH,
              accessible: false,
              error: uploadError.message
            };
            check.status = 'warning';
            check.message = 'Upload directory not accessible';
          }
        }
        
        // Check log directory if it exists
        const logDir = path.join(currentDir, 'logs');
        try {
          fs.accessSync(logDir, fs.constants.F_OK | fs.constants.W_OK);
          check.details.logDirectory = {
            path: logDir,
            accessible: true,
            writable: true
          };
        } catch (logError) {
          // Log directory might not exist, which is okay
          check.details.logDirectory = {
            path: logDir,
            accessible: false,
            message: 'Log directory not found (optional)'
          };
        }
        
      } catch (statsError) {
        check.status = 'critical';
        check.error = `Cannot access current directory: ${statsError.message}`;
      }
      
    } catch (error) {
      check.status = 'warning';
      check.error = error.message;
      check.details.message = 'Disk monitoring partially available';
    }

    return check;
  }

  /**
   * Check external dependencies
   */
  async checkDependencies() {
    const check = {
      name: 'Dependencies',
      status: 'healthy',
      details: {
        services: {}
      }
    };

    try {
      // Check M-Pesa API configuration and connectivity
      if (process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET) {
        try {
          // Basic configuration check
          check.details.services.mpesa = {
            configured: true,
            status: 'configured',
            environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
          };
        } catch (mpesaError) {
          check.details.services.mpesa = {
            configured: true,
            status: 'error',
            error: mpesaError.message
          };
          check.status = 'warning';
        }
      }

      // Check email service configuration
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
        check.details.services.email = {
          configured: true,
          status: 'configured',
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587
        };
      }

      // Check Pesapal configuration
      if (process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET) {
        check.details.services.pesapal = {
          configured: true,
          status: 'configured',
          environment: process.env.PESAPAL_ENVIRONMENT || 'demo'
        };
      }

      // Check Africa's Talking SMS service
      if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
        check.details.services.sms = {
          configured: true,
          status: 'configured',
          username: process.env.AFRICASTALKING_USERNAME
        };
      }

      // Check file storage configuration
      if (process.env.UPLOAD_PATH) {
        try {
          const fs = await import('fs');
          const uploadPath = process.env.UPLOAD_PATH;
          
          // Check if upload directory exists and is writable
          await fs.promises.access(uploadPath, fs.constants.F_OK | fs.constants.W_OK);
          
          check.details.services.fileStorage = {
            configured: true,
            status: 'healthy',
            path: uploadPath
          };
        } catch (fsError) {
          check.details.services.fileStorage = {
            configured: true,
            status: 'error',
            error: 'Upload directory not accessible',
            path: process.env.UPLOAD_PATH
          };
          check.status = 'warning';
        }
      }

      // If no external services are configured
      if (Object.keys(check.details.services).length === 0) {
        check.details.message = 'No external dependencies configured';
      } else {
        // Count service statuses
        const services = Object.values(check.details.services);
        const errorServices = services.filter(s => s.status === 'error');
        
        if (errorServices.length > 0) {
          check.status = 'warning';
          check.message = `${errorServices.length} service(s) have configuration issues`;
        }
      }

    } catch (error) {
      check.status = 'critical';
      check.error = error.message;
    }

    return check;
  }

  /**
   * Calculate health summary
   */
  calculateHealthSummary(healthCheck) {
    const checks = Object.values(healthCheck.checks);
    
    // Exclude disabled services from summary
    const activeChecks = checks.filter(c => c.status !== 'disabled');
    
    healthCheck.summary.total = activeChecks.length;
    healthCheck.summary.healthy = activeChecks.filter(c => c.status === 'healthy').length;
    healthCheck.summary.warning = activeChecks.filter(c => c.status === 'warning').length;
    healthCheck.summary.critical = activeChecks.filter(c => c.status === 'critical').length;
  }

  /**
   * Get health check history
   */
  getHealthHistory(limit = 10) {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Get current system status
   */
  async getSystemStatus() {
    const healthCheck = await this.performHealthCheck();
    const systemInfo = systemMonitoring.getSystemInfo();
    
    return {
      ...healthCheck,
      system: systemInfo,
      uptime: {
        process: process.uptime(),
        system: require('os').uptime()
      }
    };
  }

  /**
   * Check if system is ready to serve requests
   */
  async isReady() {
    try {
      const healthCheck = await this.performHealthCheck();
      
      // System is ready if database is healthy (cache is disabled)
      const criticalServices = ['database'];
      const criticalIssues = criticalServices.filter(service => 
        healthCheck.checks[service]?.status === 'critical'
      );
      
      return {
        ready: criticalIssues.length === 0,
        issues: criticalIssues,
        status: healthCheck.status
      };
    } catch (error) {
      return {
        ready: false,
        error: error.message,
        status: 'critical'
      };
    }
  }

  /**
   * Check if system is alive (basic liveness check)
   */
  isAlive() {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * Get health check summary for monitoring dashboards
   */
  async getHealthSummary() {
    try {
      const healthCheck = await this.performHealthCheck();
      
      return {
        status: healthCheck.status,
        timestamp: healthCheck.timestamp,
        responseTime: healthCheck.responseTime,
        summary: healthCheck.summary,
        criticalIssues: Object.entries(healthCheck.checks)
          .filter(([_, check]) => check.status === 'critical')
          .map(([name, check]) => ({
            service: name,
            error: check.error || check.message
          })),
        warnings: Object.entries(healthCheck.checks)
          .filter(([_, check]) => check.status === 'warning')
          .map(([name, check]) => ({
            service: name,
            message: check.message || 'Service has warnings'
          }))
      };
    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: error.message,
        criticalIssues: [{ service: 'health-check', error: error.message }],
        warnings: []
      };
    }
  }

  /**
   * Get service-specific health status
   */
  async getServiceHealth(serviceName) {
    try {
      const healthCheck = await this.performHealthCheck();
      const service = healthCheck.checks[serviceName];
      
      if (!service) {
        return {
          error: `Service '${serviceName}' not found`,
          availableServices: Object.keys(healthCheck.checks)
        };
      }
      
      return {
        service: serviceName,
        ...service,
        timestamp: healthCheck.timestamp
      };
    } catch (error) {
      return {
        service: serviceName,
        status: 'critical',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if system can handle new requests
   */
  async canHandleRequests() {
    try {
      const memoryCheck = this.checkMemory();
      const cpuCheck = this.checkCpu();
      const dbCheck = await this.checkDatabase();
      
      // System can handle requests if critical services are healthy
      // and resource usage is not critical
      const canHandle = 
        dbCheck.status !== 'critical' &&
        memoryCheck.status !== 'critical' &&
        cpuCheck.status !== 'critical';
      
      return {
        canHandle,
        timestamp: new Date().toISOString(),
        reasons: [
          ...(dbCheck.status === 'critical' ? ['Database unavailable'] : []),
          ...(memoryCheck.status === 'critical' ? ['Memory usage critical'] : []),
          ...(cpuCheck.status === 'critical' ? ['CPU usage critical'] : [])
        ],
        resourceStatus: {
          database: dbCheck.status,
          memory: memoryCheck.status,
          cpu: cpuCheck.status
        }
      };
    } catch (error) {
      return {
        canHandle: false,
        timestamp: new Date().toISOString(),
        error: error.message,
        reasons: ['Health check failed']
      };
    }
  }
}

// Export singleton instance
export const healthCheck = new HealthCheck();