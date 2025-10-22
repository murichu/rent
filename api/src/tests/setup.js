// Jest setup file for performance tests
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.REDIS_URL = process.env.TEST_REDIS_URL || process.env.REDIS_URL;

// Increase timeout for performance tests
jest.setTimeout(60000);

// Global test utilities
global.testConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 3
};

// Mock external services for testing
global.mockExternalServices = () => {
  // Mock M-Pesa API
  jest.mock('axios', () => ({
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: { success: true } })
  }));
};

// Cleanup function
global.cleanup = async () => {
  // Add any cleanup logic here
  console.log('Test cleanup completed');
};

// Setup before all tests
beforeAll(async () => {
  console.log('Setting up performance test environment...');
});

// Cleanup after all tests
afterAll(async () => {
  await global.cleanup();
});