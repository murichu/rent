import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import circuitBreakerManager from '../services/circuitBreaker.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Test circuit breaker functionality
 * POST /api/test-circuit-breaker/simulate-failure
 */
router.post('/simulate-failure', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName = 'test-service', shouldFail = true, iterations = 1 } = req.body;
    
    const testBreaker = circuitBreakerManager.getBreaker(serviceName, {
      failureThreshold: 3,
      timeout: 5000,
      resetTimeout: 10000
    });
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const result = await testBreaker.execute(async () => {
          if (shouldFail) {
            throw new Error(`Simulated failure ${i + 1}`);
          }
          return `Success ${i + 1}`;
        });
        
        results.push({
          iteration: i + 1,
          success: true,
          result,
          circuitState: testBreaker.getStats().state
        });
      } catch (error) {
        results.push({
          iteration: i + 1,
          success: false,
          error: error.message,
          circuitState: testBreaker.getStats().state,
          isCircuitBreakerError: error.circuitBreakerOpen || false,
          isTimeout: error.timeout || false
        });
      }
    }
    
    const finalStats = testBreaker.getStats();
    
    return successResponse(res, {
      serviceName,
      results,
      finalStats,
      summary: {
        totalIterations: iterations,
        successes: results.filter(r => r.success).length,
        failures: results.filter(r => !r.success).length,
        circuitBreakerErrors: results.filter(r => r.isCircuitBreakerError).length,
        timeouts: results.filter(r => r.isTimeout).length
      }
    }, 'Circuit breaker test completed');
  } catch (error) {
    logger.error('Circuit breaker test failed:', error);
    return errorResponse(res, 'Failed to run circuit breaker test', 500);
  }
});

/**
 * Test circuit breaker timeout functionality
 * POST /api/test-circuit-breaker/simulate-timeout
 */
router.post('/simulate-timeout', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serviceName = 'timeout-test-service', delay = 6000 } = req.body;
    
    const testBreaker = circuitBreakerManager.getBreaker(serviceName, {
      failureThreshold: 2,
      timeout: 3000, // 3 second timeout
      resetTimeout: 10000
    });
    
    try {
      const result = await testBreaker.execute(async () => {
        // Simulate a slow operation
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'This should timeout';
      });
      
      return successResponse(res, {
        serviceName,
        result,
        message: 'Operation completed (unexpected)',
        stats: testBreaker.getStats()
      });
    } catch (error) {
      return successResponse(res, {
        serviceName,
        error: error.message,
        isTimeout: error.timeout || false,
        isCircuitBreakerError: error.circuitBreakerOpen || false,
        stats: testBreaker.getStats(),
        message: 'Timeout test completed as expected'
      });
    }
  } catch (error) {
    logger.error('Circuit breaker timeout test failed:', error);
    return errorResponse(res, 'Failed to run timeout test', 500);
  }
});

/**
 * Test external service circuit breakers
 * POST /api/test-circuit-breaker/test-external-services
 */
router.post('/test-external-services', requireAuth, requireAdmin, async (req, res) => {
  try {
    const services = ['mpesa', 'pesapal', 'kcb', 'sms', 'email', 'whatsapp'];
    const results = {};
    
    for (const serviceName of services) {
      const breaker = circuitBreakerManager.getBreaker(serviceName);
      results[serviceName] = {
        stats: breaker.getStats(),
        isHealthy: breaker.getStats().state === 'CLOSED',
        hasBeenUsed: breaker.getStats().requestCount > 0
      };
    }
    
    const summary = {
      totalServices: services.length,
      healthyServices: Object.values(results).filter(r => r.isHealthy).length,
      usedServices: Object.values(results).filter(r => r.hasBeenUsed).length,
      openCircuits: Object.values(results).filter(r => r.stats.state === 'OPEN').length
    };
    
    return successResponse(res, {
      services: results,
      summary,
      timestamp: new Date().toISOString()
    }, 'External service circuit breaker status retrieved');
  } catch (error) {
    logger.error('External service test failed:', error);
    return errorResponse(res, 'Failed to test external services', 500);
  }
});

export { router as testCircuitBreakerRouter };