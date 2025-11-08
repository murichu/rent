import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import circuitBreakerManager from '../services/circuitBreaker.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Get all circuit breaker statistics
 * GET /api/v1/circuit-breakers
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    
    return successResponse(res, {
      circuitBreakers: stats,
      timestamp: new Date().toISOString(),
      totalBreakers: Object.keys(stats).length
    }, 'Circuit breaker statistics retrieved successfully');
  } catch (error) {
    logger.error('Failed to get circuit breaker stats:', error);
    return errorResponse(res, 'Failed to retrieve circuit breaker statistics', 500);
  }
});

/**
 * Get specific circuit breaker statistics
 * GET /api/v1/circuit-breakers/:serviceName
 */
router.get('/:serviceName', requireAuth, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const stats = circuitBreakerManager.getAllStats();
    
    if (!stats[serviceName]) {
      return errorResponse(res, `Circuit breaker for service '${serviceName}' not found`, 404);
    }
    
    return successResponse(res, {
      circuitBreaker: stats[serviceName],
      timestamp: new Date().toISOString()
    }, `Circuit breaker statistics for ${serviceName} retrieved successfully`);
  } catch (error) {
    logger.error(`Failed to get circuit breaker stats for ${req.params.serviceName}:`, error);
    return errorResponse(res, 'Failed to retrieve circuit breaker statistics', 500);
  }
});

/**
 * Reset specific circuit breaker
 * POST /api/v1/circuit-breakers/:serviceName/reset
 */
router.post('/:serviceName/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = circuitBreakerManager.resetBreaker(serviceName);
    
    if (!success) {
      return errorResponse(res, `Circuit breaker for service '${serviceName}' not found`, 404);
    }
    
    logger.info(`Circuit breaker reset for service: ${serviceName}`, {
      adminUserId: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    return successResponse(res, {
      serviceName,
      reset: true,
      timestamp: new Date().toISOString()
    }, `Circuit breaker for ${serviceName} reset successfully`);
  } catch (error) {
    logger.error(`Failed to reset circuit breaker for ${req.params.serviceName}:`, error);
    return errorResponse(res, 'Failed to reset circuit breaker', 500);
  }
});

/**
 * Reset all circuit breakers
 * POST /api/v1/circuit-breakers/reset-all
 */
router.post('/reset-all', requireAuth, requireAdmin, async (req, res) => {
  try {
    circuitBreakerManager.resetAll();
    
    logger.info('All circuit breakers reset', {
      adminUserId: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    return successResponse(res, {
      resetAll: true,
      timestamp: new Date().toISOString()
    }, 'All circuit breakers reset successfully');
  } catch (error) {
    logger.error('Failed to reset all circuit breakers:', error);
    return errorResponse(res, 'Failed to reset circuit breakers', 500);
  }
});

/**
 * Get circuit breaker health summary
 * GET /api/v1/circuit-breakers/health
 */
router.get('/health', requireAuth, async (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    const summary = {
      timestamp: new Date().toISOString(),
      totalBreakers: Object.keys(stats).length,
      healthy: 0,
      open: 0,
      halfOpen: 0,
      services: {}
    };
    
    for (const [serviceName, breakerStats] of Object.entries(stats)) {
      summary.services[serviceName] = {
        state: breakerStats.state,
        uptime: breakerStats.uptime,
        failureCount: breakerStats.failureCount,
        successCount: breakerStats.successCount,
        lastFailureTime: breakerStats.lastFailureTime,
        nextAttempt: breakerStats.nextAttempt
      };
      
      switch (breakerStats.state) {
        case 'CLOSED':
          summary.healthy++;
          break;
        case 'OPEN':
          summary.open++;
          break;
        case 'HALF_OPEN':
          summary.halfOpen++;
          break;
      }
    }
    
    // Determine overall health
    summary.overallHealth = summary.open === 0 ? 'healthy' : 
                           summary.open < summary.totalBreakers ? 'degraded' : 'critical';
    
    return successResponse(res, summary, 'Circuit breaker health summary retrieved successfully');
  } catch (error) {
    logger.error('Failed to get circuit breaker health summary:', error);
    return errorResponse(res, 'Failed to retrieve circuit breaker health summary', 500);
  }
});

/**
 * Get circuit breaker performance metrics
 * GET /api/v1/circuit-breakers/metrics
 */
router.get('/metrics', requireAuth, async (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    const metrics = {
      timestamp: new Date().toISOString(),
      services: {}
    };
    
    for (const [serviceName, breakerStats] of Object.entries(stats)) {
      const totalRequests = breakerStats.successCount + breakerStats.failureCount;
      const successRate = totalRequests > 0 ? ((breakerStats.successCount / totalRequests) * 100).toFixed(2) : 0;
      const failureRate = totalRequests > 0 ? ((breakerStats.failureCount / totalRequests) * 100).toFixed(2) : 0;
      
      metrics.services[serviceName] = {
        state: breakerStats.state,
        totalRequests,
        successCount: breakerStats.successCount,
        failureCount: breakerStats.failureCount,
        successRate: parseFloat(successRate),
        failureRate: parseFloat(failureRate),
        failureThreshold: breakerStats.failureThreshold,
        timeout: breakerStats.timeout,
        lastFailureTime: breakerStats.lastFailureTime,
        uptime: breakerStats.uptime,
        isHealthy: breakerStats.state === 'CLOSED'
      };
    }
    
    // Calculate overall metrics
    const allServices = Object.values(metrics.services);
    const totalRequests = allServices.reduce((sum, service) => sum + service.totalRequests, 0);
    const totalSuccesses = allServices.reduce((sum, service) => sum + service.successCount, 0);
    const totalFailures = allServices.reduce((sum, service) => sum + service.failureCount, 0);
    
    metrics.overall = {
      totalRequests,
      totalSuccesses,
      totalFailures,
      overallSuccessRate: totalRequests > 0 ? ((totalSuccesses / totalRequests) * 100).toFixed(2) : 0,
      overallFailureRate: totalRequests > 0 ? ((totalFailures / totalRequests) * 100).toFixed(2) : 0,
      healthyServices: allServices.filter(s => s.isHealthy).length,
      totalServices: allServices.length
    };
    
    return successResponse(res, metrics, 'Circuit breaker metrics retrieved successfully');
  } catch (error) {
    logger.error('Failed to get circuit breaker metrics:', error);
    return errorResponse(res, 'Failed to retrieve circuit breaker metrics', 500);
  }
});

export { router as circuitBreakerRouter };