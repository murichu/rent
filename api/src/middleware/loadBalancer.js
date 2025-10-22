import logger from '../utils/logger.js';
import { sessionManager } from './session.js';
import cacheManager from '../services/cacheManager.js';

/**
 * Load Balancer Middleware
 * Ensures application is stateless and ready for horizontal scaling
 */

/**
 * Middleware to ensure stateless operation
 * Validates that no server-side state is being stored in memory
 */
export function ensureStateless(req, res, next) {
  // Add headers to indicate stateless operation
  res.set({
    'X-Stateless': 'true',
    'X-Session-Store': 'redis',
    'X-Cache-Store': 'redis',
    'X-Instance-Id': process.env.INSTANCE_ID || process.pid.toString()
  });

  // Validate that session data comes from Redis, not memory
  if (req.sessionData && !req.sessionId) {
    logger.warn('Session data found without session ID - potential memory leak', {
      path: req.path,
      method: req.method,
      sessionData: Object.keys(req.sessionData)
    });
  }

  next();
}

/**
 * Middleware to handle sticky session alternatives
 * Uses Redis-based session sharing instead of sticky sessions
 */
export function stickySessionAlternative(req, res, next) {
  // Add instance identification headers
  const instanceId = process.env.INSTANCE_ID || process.pid.toString();
  
  res.set({
    'X-Served-By': instanceId,
    'X-Session-Shared': 'true',
    'X-Load-Balancer-Ready': 'true'
  });

  // Log request distribution for load balancer analysis
  if (req.sessionData?.userId) {
    logger.debug('Request served by instance', {
      instanceId,
      userId: req.sessionData.userId,
      path: req.path,
      method: req.method,
      sessionId: req.sessionId
    });
  }

  next();
}

/**
 * Middleware to validate load balancer readiness
 * Ensures all dependencies are available for serving requests
 */
export async function loadBalancerReadiness(req, res, next) {
  try {
    // Quick health check for critical services
    const checks = await Promise.allSettled([
      // Test Redis connectivity (critical for sessions and cache)
      testRedisConnectivity(),
      // Test database connectivity (critical for data)
      testDatabaseConnectivity()
    ]);

    const redisResult = checks[0];
    const dbResult = checks[1];

    // If critical services are down, return 503
    if (redisResult.status === 'rejected' || dbResult.status === 'rejected') {
      const errors = [];
      if (redisResult.status === 'rejected') errors.push('Redis unavailable');
      if (dbResult.status === 'rejected') errors.push('Database unavailable');

      logger.error('Load balancer readiness check failed', { errors });
      
      return res.status(503).json({
        ready: false,
        errors,
        timestamp: new Date().toISOString(),
        instanceId: process.env.INSTANCE_ID || process.pid.toString()
      });
    }

    // Add readiness headers
    res.set({
      'X-Ready': 'true',
      'X-Dependencies': 'healthy',
      'X-Instance-Ready': 'true'
    });

    next();
  } catch (error) {
    logger.error('Load balancer readiness middleware error', { error: error.message });
    
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      instanceId: process.env.INSTANCE_ID || process.pid.toString()
    });
  }
}

/**
 * Test Redis connectivity for session and cache storage
 */
async function testRedisConnectivity() {
  const testKey = `lb-health-${Date.now()}`;
  const testValue = 'test';
  
  try {
    // Test session Redis
    await sessionManager.redis.setex(testKey, 5, testValue);
    const sessionResult = await sessionManager.redis.get(testKey);
    await sessionManager.redis.del(testKey);
    
    if (sessionResult !== testValue) {
      throw new Error('Session Redis test failed');
    }

    // Test cache Redis
    await cacheManager.set(`cache-${testKey}`, testValue, 5);
    const cacheResult = await cacheManager.get(`cache-${testKey}`);
    await cacheManager.delete(`cache-${testKey}`);
    
    if (cacheResult !== testValue) {
      throw new Error('Cache Redis test failed');
    }

    return true;
  } catch (error) {
    logger.error('Redis connectivity test failed', { error: error.message });
    throw error;
  }
}

/**
 * Test database connectivity
 */
async function testDatabaseConnectivity() {
  try {
    const { prisma } = await import('../db.js');
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connectivity test failed', { error: error.message });
    throw error;
  }
}

/**
 * Middleware to handle graceful shutdown for load balancers
 * Allows in-flight requests to complete before shutdown
 */
export function gracefulShutdown() {
  let isShuttingDown = false;
  const activeConnections = new Set();

  // Track active connections
  const trackConnection = (req, res, next) => {
    if (isShuttingDown) {
      return res.status(503).json({
        error: 'Server is shutting down',
        timestamp: new Date().toISOString(),
        instanceId: process.env.INSTANCE_ID || process.pid.toString()
      });
    }

    const connectionId = `${Date.now()}-${Math.random()}`;
    activeConnections.add(connectionId);

    res.on('finish', () => {
      activeConnections.delete(connectionId);
    });

    res.on('close', () => {
      activeConnections.delete(connectionId);
    });

    next();
  };

  // Handle shutdown signals
  const handleShutdown = (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    isShuttingDown = true;

    // Stop accepting new connections
    const server = require('http').globalAgent;
    if (server && server.close) {
      server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    // Wait for active connections to finish
    const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    let elapsed = 0;

    const checkConnections = setInterval(() => {
      elapsed += checkInterval;
      
      if (activeConnections.size === 0) {
        logger.info('All connections closed, exiting gracefully');
        clearInterval(checkConnections);
        process.exit(0);
      } else if (elapsed >= shutdownTimeout) {
        logger.warn(`Shutdown timeout reached, forcing exit with ${activeConnections.size} active connections`);
        clearInterval(checkConnections);
        process.exit(1);
      } else {
        logger.info(`Waiting for ${activeConnections.size} connections to close... (${elapsed}ms elapsed)`);
      }
    }, checkInterval);
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return trackConnection;
}

/**
 * Middleware to add load balancer specific headers
 */
export function loadBalancerHeaders(req, res, next) {
  const instanceId = process.env.INSTANCE_ID || process.pid.toString();
  const startTime = Date.now();

  res.set({
    'X-Instance-Id': instanceId,
    'X-Request-Id': req.headers['x-request-id'] || `${instanceId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    'X-Response-Time': '0', // Will be updated on response
    'X-Load-Balancer-Compatible': 'true'
  });

  // Update response time on finish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Log slow requests for load balancer optimization
    if (responseTime > 3000) { // 3 seconds
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        responseTime: `${responseTime}ms`,
        instanceId,
        statusCode: res.statusCode
      });
    }
  });

  next();
}

/**
 * Health check endpoint specifically for load balancers
 * Returns detailed information about instance readiness
 */
export async function loadBalancerHealthCheck(req, res) {
  const instanceId = process.env.INSTANCE_ID || process.pid.toString();
  const startTime = Date.now();

  try {
    // Perform quick health checks
    const [redisHealth, dbHealth] = await Promise.allSettled([
      testRedisConnectivity(),
      testDatabaseConnectivity()
    ]);

    const responseTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Determine health status
    const isHealthy = redisHealth.status === 'fulfilled' && dbHealth.status === 'fulfilled';
    const statusCode = isHealthy ? 200 : 503;

    // Calculate memory usage percentage (rough estimate)
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      instanceId,
      responseTime: `${responseTime}ms`,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      loadBalancer: {
        ready: isHealthy,
        stateless: true,
        sessionStore: 'redis',
        cacheStore: 'redis',
        gracefulShutdown: true
      },
      dependencies: {
        redis: redisHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy',
        database: dbHealth.status === 'fulfilled' ? 'healthy' : 'unhealthy'
      },
      resources: {
        memory: {
          used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
          percentage: `${memoryPercent.toFixed(2)}%`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      }
    };

    // Add error details if unhealthy
    if (!isHealthy) {
      healthData.errors = [];
      if (redisHealth.status === 'rejected') {
        healthData.errors.push({ service: 'redis', error: redisHealth.reason.message });
      }
      if (dbHealth.status === 'rejected') {
        healthData.errors.push({ service: 'database', error: dbHealth.reason.message });
      }
    }

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Load balancer health check failed', { error: error.message });
    
    res.status(503).json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      instanceId,
      error: error.message,
      loadBalancer: {
        ready: false,
        stateless: true,
        sessionStore: 'redis',
        cacheStore: 'redis'
      }
    });
  }
}

export default {
  ensureStateless,
  stickySessionAlternative,
  loadBalancerReadiness,
  gracefulShutdown,
  loadBalancerHeaders,
  loadBalancerHealthCheck
};