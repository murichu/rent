import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { propertyRouter } from '../routes/properties.js';
import { requireAuth } from '../middleware/auth.js';
import { testUtils } from './setup.js';
import { responseWrapper } from '../utils/responses.js';

// Create test app
const app = express();
app.use(express.json());
app.use(responseWrapper);

// Mock auth middleware for testing
app.use((req, res, next) => {
  if (req.headers.authorization) {
    req.user = { userId: 'test-user-id', agencyId: 'test-agency-id', role: 'USER' };
  }
  next();
});

app.use('/properties', propertyRouter);

describe('Properties API', () => {
  let testAgency;
  let testUser;
  let testProperty;
  let authToken;

  beforeEach(async () => {
    await testUtils.cleanupTestData();
    testAgency = await testUtils.createTestAgency();
    testUser = await testUtils.createTestUser(testAgency.id);
    authToken = testUtils.generateTestToken(testUser.id);
  });

  afterEach(async () => {
    await testUtils.cleanupTestData();
  });

  describe('GET /properties', () => {
    beforeEach(async () => {
      // Create test properties
      await testUtils.createTestProperty(testAgency.id, {
        title: 'Property 1',
        city: 'Nairobi',
        type: 'ONE_BEDROOM',
        rentAmount: 50000,
      });
      await testUtils.createTestProperty(testAgency.id, {
        title: 'Property 2',
        city: 'Mombasa',
        type: 'TWO_BEDROOM',
        rentAmount: 75000,
      });
    });

    test('should get all properties for agency', async () => {
      const response = await request(app)
        .get('/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    test('should filter properties by city', async () => {
      const response = await request(app)
        .get('/properties?city=Nairobi')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].city).toBe('Nairobi');
    });

    test('should filter properties by rent range', async () => {
      const response = await request(app)
        .get('/properties?minRent=60000&maxRent=80000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].rentAmount).toBe(75000);
    });

    test('should search properties by title', async () => {
      const response = await request(app)
        .get('/properties?search=Property 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].title).toBe('Property 1');
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/properties?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.pages).toBe(2);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/properties')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /properties', () => {
    test('should create a new property', async () => {
      const propertyData = {
        title: 'New Property',
        address: '456 New Street',
        city: 'Kisumu',
        type: 'THREE_BEDROOM',
        rentAmount: 80000,
        bedrooms: 3,
        bathrooms: 2,
      };

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(propertyData.title);
      expect(response.body.data.agencyId).toBe(testAgency.id);
    });

    test('should fail with invalid property type', async () => {
      const propertyData = {
        title: 'Invalid Property',
        address: '789 Invalid Street',
        type: 'INVALID_TYPE',
        rentAmount: 50000,
      };

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with missing required fields', async () => {
      const propertyData = {
        title: 'Incomplete Property',
        // Missing address and type
      };

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should require authentication', async () => {
      const propertyData = {
        title: 'Unauthorized Property',
        address: '123 Unauthorized Street',
        type: 'ONE_BEDROOM',
      };

      const response = await request(app)
        .post('/properties')
        .send(propertyData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /properties/:id', () => {
    beforeEach(async () => {
      testProperty = await testUtils.createTestProperty(testAgency.id);
    });

    test('should get property by id', async () => {
      const response = await request(app)
        .get(`/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProperty.id);
      expect(response.body.data.title).toBe(testProperty.title);
    });

    test('should return 404 for non-existent property', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/properties/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should fail with invalid ObjectId', async () => {
      const response = await request(app)
        .get('/properties/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /properties/:id', () => {
    beforeEach(async () => {
      testProperty = await testUtils.createTestProperty(testAgency.id);
    });

    test('should update property', async () => {
      const updateData = {
        title: 'Updated Property Title',
        rentAmount: 60000,
      };

      const response = await request(app)
        .put(`/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.rentAmount).toBe(updateData.rentAmount);
    });

    test('should return 404 for non-existent property', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = { title: 'Updated Title' };
      
      const response = await request(app)
        .put(`/properties/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid update data', async () => {
      const updateData = {
        rentAmount: -1000, // Invalid negative amount
      };

      const response = await request(app)
        .put(`/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /properties/:id', () => {
    beforeEach(async () => {
      testProperty = await testUtils.createTestProperty(testAgency.id);
    });

    test('should delete property', async () => {
      const response = await request(app)
        .delete(`/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 for non-existent property', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/properties/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should prevent deletion of property with active leases', async () => {
      // Create tenant and lease
      const tenant = await testUtils.createTestTenant(testAgency.id);
      await testUtils.createTestLease(testAgency.id, testProperty.id, tenant.id);

      const response = await request(app)
        .delete(`/properties/${testProperty.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });
  });
});