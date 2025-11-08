import express from 'express';
import { loadBalancerService } from '../services/loadBalancerService.js';
import { loadBalancerHealthCheck } from '../middleware/loadBalancer.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Load Balancer Health Check Endpoint
 * GET /api/load-balancer/health
 * Returns detailed health information for load balancers
 */
router.get('/health', loadBalancerHealthCheck);

/**
 * Load Balancer Readiness Check
 * GET /api/load-balancer/ready
 * Returns whether this instance is ready to serve requests
 */
router.get('/ready', async (req, res) => {
  try {
    const canHandle = loadBalancerService.canHandleRequests();
    const metrics = loadBalancerService.getInstanceMetrics();
    
    const readinessData = {
      ready: canHandle,
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId,
      uptime: process.uptime(),
      metrics: {
        requestCount: metrics.requestCount,
        errorRate: metrics.errorRate,
        memoryUsage: `${metrics.memory.heapUsagePercent.toFixed(2)}%`,
        requestsPerSecond: metrics.requestsPerSecond.toFixed(2)
      },
      reasons: []
    };

    // Add reasons if not ready
    if (!canHandle) {
      if (metrics.memory.heapUsagePercent > 95) {
        readinessData.reasons.push('High memory usage');
      }
      if (metrics.errorRate > 50) {
        readinessData.reasons.push('High error rate');
      }
      if (!metrics.isReady) {
        readinessData.reasons.push('Service not initialized');
      }
    }

    const statusCode = canHandle ? 200 : 503;
    res.status(statusCode).json(readinessData);
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId,
      error: error.message
    });
  }
});

/**
 * Load Balancer Liveness Check
 * GET /api/load-balancer/alive
 * Simple liveness check for container orchestration
 */
router.get('/alive', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    instanceId: loadBalancerService.instanceId,
    uptime: process.uptime(),
    pid: process.pid
  });
});

/**
 * Instance Metrics
 * GET /api/load-balancer/metrics
 * Returns detailed metrics for this instance
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = loadBalancerService.getInstanceMetrics();
    const healthStatus = await loadBalancerService.performHealthCheck();
    
    res.json({
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId,
      metrics,
      health: healthStatus,
      loadBalancer: {
        stateless: true,
        sessionStore: 'redis',
        cacheStore: 'redis',
        ready: loadBalancerService.canHandleRequests()
      }
    });
  } catch (error) {
    logger.error('Failed to get instance metrics', { error: error.message });
    
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId
    });
  }
});

/**
 * Active Instances
 * GET /api/v1/load-balancer/instances
 * Returns information about all active instances
 */
router.get('/instances', async (req, res) => {
  try {
    const instances = await loadBalancerService.getActiveInstances();
    
    res.json({
      timestamp: new Date().toISOString(),
      totalInstances: instances.length,
      instances: instances.map(instance => ({
        instanceId: instance.instanceId,
        status: instance.health?.status || 'unknown',
        uptime: instance.health?.uptime || 0,
        requestCount: instance.health?.requestCount || 0,
        errorRate: instance.health?.errorRate || 0,
        memoryUsage: instance.health?.memoryUsage?.heapUsagePercent || 0,
        lastHealthCheck: instance.health?.timestamp,
        version: instance.version,
        environment: instance.environment,
        hostname: instance.hostname,
        registeredAt: instance.registeredAt
      }))
    });
  } catch (error) {
    logger.error('Failed to get active instances', { error: error.message });
    
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId
    });
  }
});

/**
 * Load Balancer Configuration
 * GET /api/v1/load-balancer/config
 * Returns load balancer configuration information
 */
router.get('/config', (req, res) => {
  const config = {
    timestamp: new Date().toISOString(),
    instanceId: loadBalancerService.instanceId,
    loadBalancer: {
      stateless: true,
      sessionStore: 'redis',
      cacheStore: 'redis',
      gracefulShutdown: true,
      healthCheckInterval: '30s',
      shutdownTimeout: process.env.SHUTDOWN_TIMEOUT || '30000ms'
    },
    session: {
      store: 'redis',
      ttl: process.env.SESSION_TTL || '86400s',
      cookieName: process.env.SESSION_COOKIE_NAME || 'haven_session',
      secure: process.env.NODE_ENV === 'production'
    },
    cache: {
      store: 'redis',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      keyPrefix: 'cache:'
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    features: {
      cors: true,
      helmet: true,
      rateLimiting: true,
      compression: false, // Add if implemented
      clustering: false   // Add if implemented
    }
  };

  res.json(config);
});

/**
 * Force Health Check
 * POST /api/v1/load-balancer/health-check
 * Triggers an immediate health check
 */
router.post('/health-check', async (req, res) => {
  try {
    const healthStatus = await loadBalancerService.performHealthCheck();
    
    res.json({
      message: 'Health check completed',
      ...healthStatus
    });
  } catch (error) {
    logger.error('Forced health check failed', { error: error.message });
    
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId
    });
  }
});

/**
 * Graceful Shutdown Endpoint
 * POST /api/v1/load-balancer/shutdown
 * Initiates graceful shutdown process
 */
router.post('/shutdown', async (req, res) => {
  try {
    logger.info('Graceful shutdown requested via API', {
      instanceId: loadBalancerService.instanceId,
      requestedBy: req.ip
    });

    res.json({
      message: 'Graceful shutdown initiated',
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId
    });

    // Start shutdown process after response is sent
    setTimeout(async () => {
      await loadBalancerService.gracefulShutdown();
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.error('Failed to initiate graceful shutdown', { error: error.message });
    
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
      instanceId: loadBalancerService.instanceId
    });
  }
});

export { router as loadBalancerRouter };
export default router;