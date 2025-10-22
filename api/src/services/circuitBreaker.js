import logger from '../utils/logger.js';

/**
 * Circuit Breaker States
 */
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN: 'HALF_OPEN' // Testing if service is back up
};

/**
 * Circuit Breaker Implementation for External Services
 * Implements requirement 5.5 - 30-second timeout and failure thresholds
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = CIRCUIT_STATES.CLOSED;
    
    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Number of failures before opening
    this.timeout = options.timeout || 30000; // 30 seconds timeout
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute before trying half-open
    this.monitoringWindow = options.monitoringWindow || 60000; // 1 minute monitoring window
    
    // Metrics
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    
    // Request tracking
    this.requestCount = 0;
    this.windowStart = Date.now();
    
    logger.info(`Circuit breaker initialized for ${name}`, {
      failureThreshold: this.failureThreshold,
      timeout: this.timeout,
      resetTimeout: this.resetTimeout
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, ...args) {
    // Check if we should reset the monitoring window
    this.resetWindowIfNeeded();
    
    // Check circuit state
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CIRCUIT_STATES.HALF_OPEN;
        logger.info(`Circuit breaker ${this.name} moving to HALF_OPEN state`);
      } else {
        const error = new Error(`Circuit breaker ${this.name} is OPEN`);
        error.circuitBreakerOpen = true;
        throw error;
      }
    }

    this.requestCount++;
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fn, ...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn, ...args) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`Circuit breaker ${this.name} timeout after ${this.timeout}ms`);
        error.timeout = true;
        reject(error);
      }, this.timeout);

      try {
        const result = await fn(...args);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.successCount++;
    
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      // If we're in half-open and got a success, close the circuit
      this.state = CIRCUIT_STATES.CLOSED;
      this.failureCount = 0;
      this.lastFailureTime = null;
      logger.info(`Circuit breaker ${this.name} closed after successful request`);
    }
    
    // Reset failure count on success in closed state
    if (this.state === CIRCUIT_STATES.CLOSED) {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    logger.warn(`Circuit breaker ${this.name} recorded failure`, {
      error: error.message,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      state: this.state
    });
    
    // Open circuit if failure threshold is reached
    if (this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
      
      logger.error(`Circuit breaker ${this.name} opened due to ${this.failureCount} failures`, {
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  shouldAttemptReset() {
    return this.nextAttempt && Date.now() >= this.nextAttempt;
  }

  /**
   * Reset monitoring window if needed
   */
  resetWindowIfNeeded() {
    const now = Date.now();
    if (now - this.windowStart >= this.monitoringWindow) {
      this.windowStart = now;
      // Don't reset counters completely, just the window
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      failureThreshold: this.failureThreshold,
      timeout: this.timeout,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      uptime: this.state === CIRCUIT_STATES.CLOSED ? 100 : 0
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.requestCount = 0;
    this.windowStart = Date.now();
    
    logger.info(`Circuit breaker ${this.name} manually reset`);
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, options));
    }
    return this.breakers.get(serviceName);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(serviceName, fn, options = {}, ...args) {
    const breaker = this.getBreaker(serviceName, options);
    return breaker.execute(fn, ...args);
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  /**
   * Reset a specific circuit breaker
   */
  resetBreaker(serviceName) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }
}

// Global circuit breaker manager instance
const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for common external services
export const mpesaCircuitBreaker = circuitBreakerManager.getBreaker('mpesa', {
  failureThreshold: 3,
  timeout: 30000,
  resetTimeout: 120000 // 2 minutes for payment services
});

export const pesapalCircuitBreaker = circuitBreakerManager.getBreaker('pesapal', {
  failureThreshold: 3,
  timeout: 30000,
  resetTimeout: 120000
});

export const kcbCircuitBreaker = circuitBreakerManager.getBreaker('kcb', {
  failureThreshold: 3,
  timeout: 30000,
  resetTimeout: 120000
});

export const emailCircuitBreaker = circuitBreakerManager.getBreaker('email', {
  failureThreshold: 5,
  timeout: 15000,
  resetTimeout: 60000
});

export const smsCircuitBreaker = circuitBreakerManager.getBreaker('sms', {
  failureThreshold: 5,
  timeout: 10000,
  resetTimeout: 60000
});

export { CircuitBreaker, circuitBreakerManager };
export default circuitBreakerManager;