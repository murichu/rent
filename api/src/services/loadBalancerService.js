import logger from '../utils/logger.js';
import { sessionManager } from '../middleware/session.js';
import cacheManager from './cacheManager.js';

/**
 * Load Balancer Service
 * Manages load balancer specific functionality and state management
 */
class LoadBalancerService {
  constructor() {
    this.instanceId = process.env.INSTANCE_ID || process.pid.toString();
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastHealthCheck = null;
    this.isReady = false;
    
    // Initialize service
    this.initialize();
  }

  /**
   * Initialize load balancer service
   */
  async initialize() {
    try {
      logger.info('Initializing Load Balancer Service', {
        instanceId: this.instanceId,
        environment: process.env.NODE_ENV
      });

      // Validate stateless configuration
      await this.validateStatelessConfiguration();
      
      // Test critical dependencies
      await this.testDependencies();
      
      // Register instance
      await this.registerInstance();
      
      this.isReady = true;
      logger.info('Load Balancer Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Load Balancer Service', { error: error.message });
      this.isReady = false;
    }
  }

  /**
   * Validate that application is configured for stateless operation
   */
  async validateStatelessConfiguration() {
    const issues = [];

    // Check Redis configuration for sessions
    if (!process.env.REDIS_HOST) {
      issues.push('REDIS_HOST not configured - required for stateless sessions');
    }

    // Check JWT configuration
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret') {
      issues.push('JWT_SECRET not properly configured for production');
    }

    // Check session configuration
    try {
      if (!sessionManager.redis) {
        issues.push('Session Redis connection not available');
      } else {
        // Test session Redis
        await sessionManager.redis.ping();
      }
    } catch (error) {
      issues.push(`Session Redis connection failed: ${error.message}`);
    }

    // Check cache configuration
    try {
      await cacheManager.get('test-key');
    } catch (error) {
      issues.push(`Cache Redis connection failed: ${error.message}`);
    }

    // Check for memory-based session storage (should not exist)
    if (process.env.SESSION_STORE === 'memory') {
      issues.push('Memory-based session storage detected - not suitable for load balancing');
    }

    if (issues.length > 0) {
      logger.warn('Stateless configuration issues detected', { issues });
      throw new Error(`Stateless configuration validation failed: ${issues.join(', ')}`);
    }

    logger.info('Stateless configuration validated successfully');
  }

  /**
   * Test critical dependencies for load balancer readiness
   */
  async testDependencies() {
    const dependencies = {
      redis: false,
      database: false,
      cache: false
    };

    try {
      // Test Redis (sessions)
      await sessionManager.redis.ping();
      dependencies.redis = true;
    } catch (error) {
      logger.error('Redis dependency test failed', { error: error.message });
    }

    try {
      // Test Database
      const { prisma } = await import('../db.js');
      await prisma.$queryRaw`SELECT 1`;
      dependencies.database = true;
    } catch (error) {
      logger.error('Database dependency test failed', { error: error.message });
    }

    try {
      // Test Cache
      await cacheManager.set('lb-test', 'test', 5);
      const result = await cacheManager.get('lb-test');
      await cacheManager.delete('lb-test');
      dependencies.cache = result === 'test';
    } catch (error) {
      logger.error('Cache dependency test failed', { error: error.message });
    }

    const failedDependencies = Object.entries(dependencies)
      .filter(([_, status]) => !status)
      .map(([name, _]) => name);

    if (failedDependencies.length > 0) {
      throw new Error(`Critical dependencies failed: ${failedDependencies.join(', ')}`);
    }

    logger.info('All dependencies tested successfully', { dependencies });
  }

  /**
   * Register this instance with the load balancer
   */
  async registerInstance() {
    try {
      const instanceInfo = {
        instanceId: this.instanceId,
        startTime: this.startTime,
        pid: process.pid,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: require('os').hostname(),
        platform: process.platform,
        nodeVersion: process.version,
        registeredAt: new Date().toISOString()
      };

      // Store instance info in Redis for load balancer discovery
      const instanceKey = `lb:instances:${this.instanceId}`;
      await cacheManager.set(instanceKey, instanceInfo, 300); // 5 minutes TTL

      // Add to active instances set
      const activeInstancesKey = 'lb:active-instances';
      await cacheManager.redis.sadd(activeInstancesKey, this.instanceId);
      await cacheManager.redis.expire(activeInstancesKey, 300);

      logger.info('Instance registered with load balancer', { instanceInfo });
    } catch (error) {
      logger.error('Failed to register instance', { error: error.message });
      throw error;
    }
  }

  /**
   * Unregister this instance from the load balancer
   */
  async unregisterInstance() {
    try {
      const instanceKey = `lb:instances:${this.instanceId}`;
      await cacheManager.delete(instanceKey);

      const activeInstancesKey = 'lb:active-instances';
      await cacheManager.redis.srem(activeInstancesKey, this.instanceId);

      logger.info('Instance unregistered from load balancer', {
        instanceId: this.instanceId
      });
    } catch (error) {
      logger.error('Failed to unregister instance', { error: error.message });
    }
  }

  /**
   * Update instance health status
   */
  async updateHealthStatus(status) {
    try {
      const healthKey = `lb:health:${this.instanceId}`;
      const healthData = {
        instanceId: this.instanceId,
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };

      await cacheManager.set(healthKey, healthData, 60); // 1 minute TTL
      this.lastHealthCheck = Date.now();
    } catch (error) {
      logger.error('Failed to update health status', { error: error.message });
    }
  }

  /**
   * Get all active instances
   */
  async getActiveInstances() {
    try {
      const activeInstancesKey = 'lb:active-instances';
      const instanceIds = await cacheManager.redis.smembers(activeInstancesKey);
      
      const instances = [];
      for (const instanceId of instanceIds) {
        const instanceKey = `lb:instances:${instanceId}`;
        const healthKey = `lb:health:${instanceId}`;
        
        const [instanceInfo, healthInfo] = await Promise.all([
          cacheManager.get(instanceKey),
          cacheManager.get(healthKey)
        ]);

        if (instanceInfo) {
          instances.push({
            ...instanceInfo,
            health: healthInfo || { status: 'unknown' }
          });
        }
      }

      return instances;
    } catch (error) {
      logger.error('Failed to get active instances', { error: error.message });
      return [];
    }
  }

  /**
   * Handle request tracking for load balancer metrics
   */
  trackRequest(req, res) {
    this.requestCount++;
    
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // Track errors
      if (res.statusCode >= 400) {
        this.errorCount++;
      }

      // Log slow requests
      if (responseTime > 3000) {
        logger.warn('Slow request detected', {
          instanceId: this.instanceId,
          path: req.path,
          method: req.method,
          responseTime: `${responseTime}ms`,
          statusCode: res.statusCode
        });
      }

      // Update metrics periodically
      if (this.requestCount % 100 === 0) {
        this.updateHealthStatus('healthy').catch(error => {
          logger.error('Failed to update health status after request tracking', { error: error.message });
        });
      }
    });
  }

  /**
   * Get instance metrics for load balancer
   */
  getInstanceMetrics() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      instanceId: this.instanceId,
      uptime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      requestsPerSecond: this.requestCount / uptime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external,
        heapUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      lastHealthCheck: this.lastHealthCheck,
      isReady: this.isReady
    };
  }

  /**
   * Perform health check for load balancer
   */
  async performHealthCheck() {
    try {
      const startTime = Date.now();
      
      // Test critical services
      const [redisTest, dbTest, cacheTest] = await Promise.allSettled([
        sessionManager.redis.ping(),
        (async () => {
          const { prisma } = await import('../db.js');
          await prisma.$queryRaw`SELECT 1`;
        })(),
        (async () => {
          const testKey = `health-${Date.now()}`;
          await cacheManager.set(testKey, 'test', 5);
          const result = await cacheManager.get(testKey);
          await cacheManager.delete(testKey);
          return result === 'test';
        })()
      ]);

      const responseTime = Date.now() - startTime;
      const metrics = this.getInstanceMetrics();
      
      const isHealthy = 
        redisTest.status === 'fulfilled' &&
        dbTest.status === 'fulfilled' &&
        cacheTest.status === 'fulfilled' &&
        metrics.memory.heapUsagePercent < 90;

      const healthStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        instanceId: this.instanceId,
        checks: {
          redis: redisTest.status === 'fulfilled',
          database: dbTest.status === 'fulfilled',
          cache: cacheTest.status === 'fulfilled',
          memory: metrics.memory.heapUsagePercent < 90
        },
        metrics,
        loadBalancer: {
          ready: isHealthy && this.isReady,
          stateless: true,
          sessionStore: 'redis',
          cacheStore: 'redis'
        }
      };

      // Update health status in Redis
      await this.updateHealthStatus(healthStatus.status);

      return healthStatus;
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        instanceId: this.instanceId,
        error: error.message,
        loadBalancer: {
          ready: false,
          stateless: true,
          sessionStore: 'redis',
          cacheStore: 'redis'
        }
      };
    }
  }

  /**
   * Handle graceful shutdown
   */
  async gracefulShutdown() {
    logger.info('Starting graceful shutdown for load balancer', {
      instanceId: this.instanceId
    });

    try {
      // Unregister from load balancer
      await this.unregisterInstance();
      
      // Update health status to indicate shutdown
      await this.updateHealthStatus('shutting-down');
      
      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during graceful shutdown', { error: error.message });
    }
  }

  /**
   * Check if instance can handle new requests
   */
  canHandleRequests() {
    const metrics = this.getInstanceMetrics();
    
    // Don't accept requests if memory usage is too high
    if (metrics.memory.heapUsagePercent > 95) {
      return false;
    }

    // Don't accept requests if error rate is too high
    if (metrics.errorRate > 50) {
      return false;
    }

    // Don't accept requests if not ready
    if (!this.isReady) {
      return false;
    }

    return true;
  }
}

// Export singleton instance
export const loadBalancerService = new LoadBalancerService();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  loadBalancerService.gracefulShutdown().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  loadBalancerService.gracefulShutdown().then(() => {
    process.exit(0);
  });
});

export default loadBalancerService;