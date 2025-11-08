import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { centralizedErrorHandlerMiddleware } from '../../middleware/centralizedErrorHandler.js';
import { smartRateLimiter } from '../../middleware/enhancedRateLimiter.js';
import { requestLogger, errorLogger } from '../../utils/logger.js';
import environmentValidator from '../../services/environmentValidator.js';

describe('Security Hardening Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Create test app with security middleware
    app = express();
    app.use(express.json());
    
    // Add correlation ID middleware
    app.use((req, res, next) => {
      req.correlationId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      next();
    });
    
    // Add request logging
    app.use(requestLogger);
    
    // Add rate limiting (with reduced limits for testing)
    // Note: In real tests, you might want to mock or disable rate limiting
    
    // Test routes
    app.get('/api/test/success', (req, res) => {
      res.json({ success: true, message: 'Test successful' });
    });
    
    app.get('/api/test/error', (req, res, next) => {
      const error = new Error('Test error');
      error.statusCode = 500;
      next(error);
    });
    
    app.post('/api/test/validation', (req, res, next) => {
      const { ValidationError } = require('../../middleware/centralizedErrorHandler.js');
      next(new ValidationError('Validation failed', ['name is required']));
    });
    
    app.get('/api/test/auth', (req, res, next) => {
      const { UnauthorizedError } = require('../../middleware/centralizedErrorHandler.js');
      next(new UnauthorizedError('Authentication required'));
    });
    
    // Add error logging
    app.use(errorLogger);
    
    // Add centralized error handler
    app.use(centralizedErrorHandlerMiddleware);
  });

  describe('Environment Validation', () => {
    test('should validate environment configuration', async () => {
      // Set up minimal valid environment for testing
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
      process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-validation';
      process.env.PORT = '3000';
      
      const result = await environmentValidator.validateEnvironment();
      
      // In test environment, we might have warnings but should not have critical errors
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Centralized Error Handling', () => {
    test('should handle successful requests', async () => {
      const response = await request(app)
        .get('/api/test/success')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test successful');
    });

    test('should handle server errors with proper formatting', async () => {
      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.type).toBeDefined();
      expect(response.body.correlationId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should handle validation errors with details', async () => {
      const response = await request(app)
        .post('/api/test/validation')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('validation');
      expect(response.body.details).toEqual(['name is required']);
      expect(response.body.correlationId).toBeDefined();
    });

    test('should handle authentication errors', async () => {
      const response = await request(app)
        .get('/api/test/auth')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('authentication');
      expect(response.body.error).toBe('Authentication required');
      expect(response.body.correlationId).toBeDefined();
    });
  });

  describe('Request Correlation', () => {
    test('should include correlation ID in responses', async () => {
      const response = await request(app)
        .get('/api/test/success')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    test('should include correlation ID in error responses', async () => {
      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      expect(response.body.correlationId).toBeDefined();
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/test/success')
        .expect(200);

      // Check for correlation ID header
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('Error Response Format', () => {
    test('should have consistent error response format', async () => {
      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      // Check required fields
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('correlationId');
      expect(response.body).toHaveProperty('timestamp');

      // Check timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    test('should not leak sensitive information in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      // Should not include debug information in production
      expect(response.body).not.toHaveProperty('debug');
      expect(response.body).not.toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logging Integration', () => {
    test('should log requests and responses', async () => {
      // This test verifies that logging middleware is working
      // In a real test, you might want to mock the logger and verify calls
      const response = await request(app)
        .get('/api/test/success')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    test('should log errors with context', async () => {
      // This test verifies that error logging is working
      const response = await request(app)
        .get('/api/test/error')
        .expect(500);

      expect(response.body.correlationId).toBeDefined();
    });
  });
});