import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '../db.js';
import cacheService from '../services/cache.js';
import logger from '../utils/logger.js';

// Test database setup
beforeAll(async () => {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Tests must use a test database. Set DATABASE_URL to include "test"');
  }
  
  // Connect to cache service
  try {
    await cacheService.connect();
    logger.info('Test cache service connected');
  } catch (error) {
    logger.warn('Cache service not available for tests:', error.message);
  }
  
  logger.info('Test setup completed');
});

// Clean up after all tests
afterAll(async () => {
  // Disconnect from database
  await prisma.$disconnect();
  
  // Disconnect from cache
  await cacheService.disconnect();
  
  logger.info('Test cleanup completed');
});

// Clean up before each test
beforeEach(async () => {
  // Clear cache before each test
  if (cacheService.isConnected) {
    await cacheService.flush();
  }
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data (optional - depends on test strategy)
  // You might want to truncate tables or use transactions
});

// Test utilities
export const testUtils = {
  /**
   * Create test agency
   */
  async createTestAgency(data = {}) {
    return prisma.agency.create({
      data: {
        name: 'Test Agency',
        invoiceDayOfMonth: 28,
        dueDayOfMonth: 5,
        ...data,
      },
    });
  },

  /**
   * Create test user
   */
  async createTestUser(agencyId, data = {}) {
    return prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: '$2a$10$test.hash.for.testing.purposes.only',
        name: 'Test User',
        role: 'USER',
        agencyId,
        emailVerified: true,
        ...data,
      },
    });
  },

  /**
   * Create test property
   */
  async createTestProperty(agencyId, data = {}) {
    return prisma.property.create({
      data: {
        title: 'Test Property',
        address: '123 Test Street',
        city: 'Test City',
        type: 'ONE_BEDROOM',
        status: 'AVAILABLE',
        rentAmount: 50000,
        agencyId,
        ...data,
      },
    });
  },

  /**
   * Create test tenant
   */
  async createTestTenant(agencyId, data = {}) {
    return prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        email: `tenant-${Date.now()}@example.com`,
        phone: '254700000000',
        agencyId,
        ...data,
      },
    });
  },

  /**
   * Create test lease
   */
  async createTestLease(agencyId, propertyId, tenantId, data = {}) {
    return prisma.lease.create({
      data: {
        propertyId,
        tenantId,
        agencyId,
        startDate: new Date(),
        rentAmount: 50000,
        paymentDayOfMonth: 5,
        ...data,
      },
    });
  },

  /**
   * Create test payment
   */
  async createTestPayment(agencyId, leaseId, data = {}) {
    return prisma.payment.create({
      data: {
        leaseId,
        agencyId,
        amount: 50000,
        paidAt: new Date(),
        method: 'MANUAL',
        ...data,
      },
    });
  },

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    // Delete in reverse dependency order
    await prisma.payment.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.property.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.agency.deleteMany({});
  },

  /**
   * Generate JWT token for testing
   */
  generateTestToken(userId, role = 'USER') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  },

  /**
   * Wait for async operations
   */
  async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};

export default testUtils;