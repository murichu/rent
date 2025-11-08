import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { 
  CentralizedErrorHandler, 
  centralizedErrorHandlerMiddleware,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  SecurityError
} from '../../middleware/centralizedErrorHandler.js';

describe('Centralized Error Handler', () => {
  let app;
  let errorHandler;

  beforeEach(() => {
    app = express();
    errorHandler = new CentralizedErrorHandler();
    
    app.use(express.json());
    
    // Add correlation ID middleware
    app.use((req, res, next) => {
      req.correlationId = 'test-correlation-id';
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classification', () => {
    test('should classify validation errors correctly', () => {
      const error = new ValidationError('Invalid input', ['field1 is required']);
      const classification = errorHandler.classifyError(error);

      expect(classification.type).toBe('validation');
      expect(classification.statusCode).toBe(400);
      expect(classification.severity).toBe('low');
    });

    test('should classify authentication errors correctly', () => {
      const error = new UnauthorizedError('Token expired');
      const classification = errorHandler.classifyError(error);

      expect(classification.type).toBe('authentication');
      expect(classification.statusCode).toBe(401);
      expect(classification.severity).toBe('medium');
      expect(classification.shouldAlert).toBe(true);
    });

    test('should classify authorization errors correctly', () => {
      const error = new ForbiddenError('Access denied');
      const classification = errorHandler.classifyError(error);

      expect(classification.type).toBe('authorization');
      expect(classification.statusCode).toBe(403);
      expect(classification.severity).toBe('medium');
      expect(classification.shouldAlert).toBe(true);
    });

    test('should classify not found errors correctly', () => {
      const error = new NotFoundError('User');
      const classification = errorHandler.classifyError(error);

      expect(classification.type).toBe('not_found');
      expect(classification.statusCode).toBe(404);
      expect(classification.severity).toBe('low');
    });

    test('should classify rate limit errors correctly', () => {
      const error = new Error('Too many requests');
      error.statusCode = 429;
      const classification = errorHandler.classifyError(error);

      expect(classification.type).toBe('rate_limit');
      expect(classification.statusCode).toBe(429);
      expect(classification.severity).toBe('high');
      expect(classification.shouldAlert).toBe(true);
    });

    test('should classify security errors correctly', () => {
      const error = new SecurityError('Potential XSS attack detected');
      const classification = errorHandler.classifyError(error);

      expect(classification.type).toBe('security');
      expect(classification.severity).toBe('critical');
      expect(classification.shouldAlert).toBe(true);
    });
  });

  describe('Error Response Formatting', () => {
    test('should format basic error response', () => {
      const error = new AppError('Test error', 400);
      const context = {
        correlationId: 'test-id',
        timestamp: '2023-01-01T00:00:00.000Z'
      };
      const classification = errorHandler.classifyError(error);
      
      const response = errorHandler.formatErrorResponse(error, classification, context);

      expect(response).toEqual({
        success: false,
        error: classification.userMessage,
        type: classification.type,
        correlationId: 'test-id',
        timestamp: '2023-01-01T00:00:00.000Z'
      });
    });

    test('should include validation details for validation errors', () => {
      const error = new ValidationError('Validation failed', ['field1 is required']);
      const context = {
        correlationId: 'test-id',
        timestamp: '2023-01-01T00:00:00.000Z'
      };
      const classification = errorHandler.classifyError(error);
      
      const response = errorHandler.formatErrorResponse(error, classification, context);

      expect(response.details).toEqual(['field1 is required']);
    });

    test('should include retry information for rate limit errors', () => {
      const error = new Error('Too many requests');
      error.statusCode = 429;
      error.retryAfter = 60;
      
      const context = {
        correlationId: 'test-id',
        timestamp: '2023-01-01T00:00:00.000Z'
      };
      const classification = errorHandler.classifyError(error);
      
      const response = errorHandler.formatErrorResponse(error, classification, context);

      expect(response.retryAfter).toBe(60);
      expect(response.message).toContain('try again later');
    });
  });

  describe('Middleware Integration', () => {
    test('should handle errors through middleware', async () => {
      app.get('/test-error', (req, res, next) => {
        next(new AppError('Test error', 400));
      });
      
      app.use(centralizedErrorHandlerMiddleware);

      const response = await request(app)
        .get('/test-error')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.correlationId).toBe('test-correlation-id');
    });

    test('should handle validation errors with details', async () => {
      app.post('/test-validation', (req, res, next) => {
        next(new ValidationError('Validation failed', ['name is required', 'email is invalid']));
      });
      
      app.use(centralizedErrorHandlerMiddleware);

      const response = await request(app)
        .post('/test-validation')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('validation');
      expect(response.body.details).toEqual(['name is required', 'email is invalid']);
    });

    test('should handle authentication errors', async () => {
      app.get('/test-auth', (req, res, next) => {
        next(new UnauthorizedError('Token expired'));
      });
      
      app.use(centralizedErrorHandlerMiddleware);

      const response = await request(app)
        .get('/test-auth')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('authentication');
      expect(response.body.error).toBe('Authentication required');
    });

    test('should handle internal server errors', async () => {
      app.get('/test-internal', (req, res, next) => {
        next(new Error('Internal server error'));
      });
      
      app.use(centralizedErrorHandlerMiddleware);

      const response = await request(app)
        .get('/test-internal')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.type).toBe('internal');
      expect(response.body.error).toBe('An unexpected error occurred');
    });
  });

  describe('Error Pattern Tracking', () => {
    test('should track error patterns', () => {
      const error = new AppError('Test error', 400);
      const context = {
        ip: '192.168.1.1',
        correlationId: 'test-id'
      };

      // Simulate multiple errors from same IP
      for (let i = 0; i < 5; i++) {
        errorHandler.trackErrorPattern(error, context);
      }

      const stats = errorHandler.getErrorStats();
      expect(stats.totalPatterns).toBeGreaterThan(0);
    });
  });

  describe('Custom Error Classes', () => {
    test('should create AppError with correct properties', () => {
      const error = new AppError('Test message', 400, 'validation');
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.type).toBe('validation');
      expect(error.isOperational).toBe(true);
    });

    test('should create ValidationError with details', () => {
      const error = new ValidationError('Validation failed', ['field1 required']);
      
      expect(error.statusCode).toBe(400);
      expect(error.type).toBe('validation');
      expect(error.errors).toEqual(['field1 required']);
    });

    test('should create NotFoundError with resource name', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.type).toBe('not_found');
    });

    test('should create SecurityError with correct severity', () => {
      const error = new SecurityError('XSS detected');
      
      expect(error.statusCode).toBe(400);
      expect(error.type).toBe('security');
    });
  });
});