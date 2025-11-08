import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../routes/auth.js';
import { testUtils } from './setup.js';
import { responseWrapper } from '../utils/responses.js';

// Create test app
const app = express();
app.use(express.json());
app.use(responseWrapper);
app.use('/auth', authRouter);

describe('Authentication API', () => {
  let testAgency;
  let testUser;

  beforeEach(async () => {
    await testUtils.cleanupTestData();
    testAgency = await testUtils.createTestAgency();
  });

  afterEach(async () => {
    await testUtils.cleanupTestData();
  });

  describe('POST /auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123',
        name: 'New User',
        agencyName: 'New Agency',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    test('should fail with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        name: 'Test User',
        agencyName: 'Test Agency',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        agencyName: 'Test Agency',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123',
        name: 'Test User',
        agencyName: 'Test Agency',
      };

      // First registration
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      testUser = await testUtils.createTestUser(testAgency.id, {
        email: 'login@example.com',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
      });
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    test('should fail with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_ERROR');
    });

    test('should fail with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_ERROR');
    });

    test('should fail with malformed email', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/request-reset', () => {
    beforeEach(async () => {
      testUser = await testUtils.createTestUser(testAgency.id, {
        email: 'reset@example.com',
      });
    });

    test('should send password reset email for valid email', async () => {
      const resetData = {
        email: 'reset@example.com',
      };

      const response = await request(app)
        .post('/auth/request-reset')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset');
    });

    test('should not reveal if email does not exist', async () => {
      const resetData = {
        email: 'nonexistent@example.com',
      };

      const response = await request(app)
        .post('/auth/request-reset')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset');
    });

    test('should fail with invalid email format', async () => {
      const resetData = {
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/auth/request-reset')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});