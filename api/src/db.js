import { PrismaClient } from "@prisma/client";
import logger from "./utils/logger.js";

// Connection pool monitoring and logging
let queryCount = 0;
let slowQueryCount = 0;
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

/**
 * Simple Prisma client instance
 * Direct connection without complex proxy
 */
export const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' }
  ]
});

// Set up event listeners
prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

// Connection pool statistics
export const getConnectionPoolStats = () => {
  return {
    totalQueries: queryCount,
    slowQueries: slowQueryCount,
    slowQueryPercentage: queryCount > 0 ? ((slowQueryCount / queryCount) * 100).toFixed(2) : 0,
    slowQueryThreshold: SLOW_QUERY_THRESHOLD,
    timestamp: new Date().toISOString()
  };
};

// Reset statistics (useful for monitoring)
export const resetConnectionPoolStats = () => {
  queryCount = 0;
  slowQueryCount = 0;
  logger.info('Connection pool statistics reset');
};

// Database health check
export const getDatabaseHealth = async () => {
  try {
    // For MongoDB, use a simple operation instead of raw SQL
    await prisma.$runCommandRaw({ ping: 1 });
    return { status: 'healthy', message: 'Database is responsive' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    await prisma.$connect();
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get database connection status
export const getDatabaseStatus = () => {
  return {
    isConnected: true,
    timestamp: new Date().toISOString()
  };
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connection...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down database connection...');
  await prisma.$disconnect();
  process.exit(0);
});