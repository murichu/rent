import { PrismaClient } from "@prisma/client";
import logger from "./utils/logger.js";
import { databaseMonitoring } from "./services/databaseMonitoring.js";

// Database configuration with connection pooling
const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
};

// Add connection pool configuration for MongoDB
if (process.env.DATABASE_URL?.includes('mongodb')) {
  // MongoDB connection pool settings
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('minPoolSize', '5');
  url.searchParams.set('maxPoolSize', '20');
  url.searchParams.set('maxIdleTimeMS', '30000');
  url.searchParams.set('serverSelectionTimeoutMS', '5000');
  url.searchParams.set('socketTimeoutMS', '30000');
  
  prismaConfig.datasources.db.url = url.toString();
}

export const prisma = new PrismaClient(prismaConfig);

// Connection pool monitoring and logging
let queryCount = 0;
let slowQueryCount = 0;
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

prisma.$on('query', (e) => {
  queryCount++;
  
  // Record query in database monitoring service
  databaseMonitoring.recordQuery(e);
  
  if (e.duration > SLOW_QUERY_THRESHOLD) {
    slowQueryCount++;
    logger.warn('Slow query detected', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      target: e.target,
      timestamp: e.timestamp
    });
  }
  
  // Log query execution time for monitoring
  if (process.env.NODE_ENV === 'development' || process.env.LOG_QUERIES === 'true') {
    logger.debug('Database query executed', {
      duration: `${e.duration}ms`,
      target: e.target,
      queryCount
    });
  }
});

prisma.$on('error', (e) => {
  // Record error in database monitoring service
  databaseMonitoring.recordError(e);
  
  logger.error('Database error', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

prisma.$on('info', (e) => {
  logger.info('Database info', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
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
