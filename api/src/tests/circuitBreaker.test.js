import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, circuitBreakerManager } from '../services/circuitBreaker.js';

describe('Circuit Breaker Implementation', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-service', {
      failureThreshold: 3,
      timeout: 1000,
      resetTimeout: 5000
    });
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getStats().state).toBe('CLOSED');
  });

  it('should execute successful operations', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledOnce();
    expect(circuitBreaker.getStats().successCount).toBe(1);
  });

  it('should handle failures and open circuit after threshold', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Service unavailable'));
    
    // Execute failures up to threshold
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected to fail
      }
    }
    
    expect(circuitBreaker.getStats().state).toBe('OPEN');
    expect(circuitBreaker.getStats().failureCount).toBe(3);
  });

  it('should fail fast when circuit is OPEN', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Service unavailable'));
    
    // Trigger circuit to open
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        // Expected to fail
      }
    }
    
    // Now circuit should be OPEN and fail fast
    try {
      await circuitBreaker.execute(mockFn);
      expect.fail('Should have thrown circuit breaker error');
    } catch (error) {
      expect(error.message).toContain('Circuit breaker test-service is OPEN');
      expect(error.circuitBreakerOpen).toBe(true);
    }
  });

  it('should handle timeout correctly', async () => {
    const slowFn = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 2000))
    );
    
    try {
      await circuitBreaker.execute(slowFn);
      expect.fail('Should have timed out');
    } catch (error) {
      expect(error.message).toContain('timeout');
      expect(error.timeout).toBe(true);
    }
  });

  it('should provide accurate statistics', () => {
    const stats = circuitBreaker.getStats();
    
    expect(stats).toHaveProperty('name', 'test-service');
    expect(stats).toHaveProperty('state', 'CLOSED');
    expect(stats).toHaveProperty('failureCount', 0);
    expect(stats).toHaveProperty('successCount', 0);
    expect(stats).toHaveProperty('failureThreshold', 3);
    expect(stats).toHaveProperty('timeout', 1000);
  });
});

describe('Circuit Breaker Manager', () => {
  it('should create and manage multiple circuit breakers', () => {
    const breaker1 = circuitBreakerManager.getBreaker('service1');
    const breaker2 = circuitBreakerManager.getBreaker('service2');
    
    expect(breaker1).toBeDefined();
    expect(breaker2).toBeDefined();
    expect(breaker1).not.toBe(breaker2);
  });

  it('should return same instance for same service name', () => {
    const breaker1 = circuitBreakerManager.getBreaker('service1');
    const breaker2 = circuitBreakerManager.getBreaker('service1');
    
    expect(breaker1).toBe(breaker2);
  });

  it('should provide statistics for all breakers', () => {
    circuitBreakerManager.getBreaker('service1');
    circuitBreakerManager.getBreaker('service2');
    
    const stats = circuitBreakerManager.getAllStats();
    
    expect(stats).toHaveProperty('service1');
    expect(stats).toHaveProperty('service2');
  });

  it('should reset specific breaker', () => {
    const breaker = circuitBreakerManager.getBreaker('test-reset');
    breaker.failureCount = 5; // Simulate failures
    
    const success = circuitBreakerManager.resetBreaker('test-reset');
    
    expect(success).toBe(true);
    expect(breaker.getStats().failureCount).toBe(0);
  });
});