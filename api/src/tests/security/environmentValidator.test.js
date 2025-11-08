import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import environmentValidator from '../../services/environmentValidator.js';

describe('Environment Validator', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    test('should pass validation with all required variables', async () => {
      // Set up valid environment
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.JWT_SECRET = 'a-very-long-and-secure-secret-key-for-testing';
      process.env.PORT = '3000';
      process.env.NODE_ENV = 'test';

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation with missing required variables', async () => {
      // Remove required variables
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('DATABASE_URL'))).toBe(true);
      expect(result.errors.some(error => error.includes('JWT_SECRET'))).toBe(true);
    });

    test('should validate database URL format', async () => {
      process.env.DATABASE_URL = 'invalid-url';
      process.env.JWT_SECRET = 'a-very-long-and-secure-secret-key-for-testing';
      process.env.PORT = '3000';

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid DATABASE_URL format'))).toBe(true);
    });

    test('should validate JWT secret strength', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.JWT_SECRET = 'weak'; // Too short
      process.env.PORT = '3000';

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('JWT_SECRET must be at least 32 characters'))).toBe(true);
    });

    test('should detect weak JWT secrets', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.JWT_SECRET = 'password123456789012345678901234'; // Weak but long enough
      process.env.PORT = '3000';

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('JWT_SECRET appears to be weak'))).toBe(true);
    });

    test('should validate Redis configuration when enabled', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.JWT_SECRET = 'a-very-long-and-secure-secret-key-for-testing';
      process.env.PORT = '3000';
      process.env.ENABLE_REDIS = 'true';
      process.env.REDIS_URL = 'invalid-redis-url';

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid REDIS_URL format'))).toBe(true);
    });

    test('should have production-specific validations', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.JWT_SECRET = 'a-very-long-and-secure-secret-key-for-testing';
      process.env.PORT = '3000';
      process.env.FRONTEND_URL = 'http://localhost:3000'; // Should be HTTPS in production

      const result = await environmentValidator.validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('FRONTEND_URL must use HTTPS in production'))).toBe(true);
    });
  });

  describe('validateConnectionString', () => {
    test('should validate PostgreSQL connection strings', () => {
      const result = environmentValidator.constructor.validateConnectionString(
        'postgresql://user:pass@localhost:5432/testdb',
        'database'
      );

      expect(result.valid).toBe(true);
    });

    test('should reject invalid connection strings', () => {
      const result = environmentValidator.constructor.validateConnectionString(
        'invalid-connection-string',
        'database'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid database connection string format');
    });

    test('should validate Redis connection strings', () => {
      const result = environmentValidator.constructor.validateConnectionString(
        'redis://localhost:6379',
        'redis'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('formatValidationResults', () => {
    test('should format validation results properly', async () => {
      // Set up environment with errors and warnings
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'a-very-long-and-secure-secret-key-for-testing';
      process.env.PORT = '3000';
      process.env.ENABLE_REDIS = 'true'; // This will create a warning

      await environmentValidator.validateEnvironment();
      const formatted = environmentValidator.formatValidationResults();

      expect(formatted).toContain('Environment Validation Results');
      expect(formatted).toContain('ERRORS:');
      expect(formatted).toContain('WARNINGS:');
    });
  });
});