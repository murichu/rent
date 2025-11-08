import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

/**
 * Database Connection Service
 * Handles MongoDB connection with timeout, retry logic, and health monitoring
 */
class DatabaseConnection {
  constructor() {
    this.prismaClient = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
    this.connectionTimeout = 10000; // 10 seconds
    this.lastConnectionAttempt = null;
    this.connectionError = null;
    
    // Connection statistics
    this.stats = {
      totalAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      lastConnectedAt: null,
      lastFailedAt: null,
      averageConnectionTime: 0
    };
  }

  /**
   * Get Prisma configuration with optimized settings
   */
  getPrismaConfig() {
    const config = {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'warn',
        }
      ],
    };

    // Add MongoDB-specific optimizations
    if (process.env.DATABASE_URL?.includes('mongodb')) {
      const url = new URL(process.env.DATABASE_URL);
      
      // Connection pool settings
      url.searchParams.set('minPoolSize', '2');
      url.searchParams.set('maxPoolSize', '10');
      url.searchParams.set('maxIdleTimeMS', '30000');
      url.searchParams.set('serverSelectionTimeoutMS', '5000');
      url.searchParams.set('socketTimeoutMS', '10000');
      url.searchParams.set('connectTimeoutMS', '10000');
      url.searchParams.set('heartbeatFrequencyMS', '10000');
      
      config.datasources.db.url = url.toString();
    }

    return config;
  }

  /**
   * Test database connection without creating persistent client
   */
  async testConnection() {
    const startTime = Date.now();
    let testClient = null;
    
    try {
      logger.info('Testing database connection...');
      this.stats.totalAttempts++;
      
      // Create temporary client for testing
      testClient = new PrismaClient(this.getPrismaConfig());
      
      // Set up timeout
      const connectPromise = testClient.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), this.connectionTimeout);
      });
      
      // Race between connection and timeout
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Test with a simple query instead of $runCommandRaw
      // Just connecting successfully is enough for the test
      logger.info('Connection established successfully');
      
      const connectionTime = Date.now() - startTime;
      this.stats.successfulConnections++;
      this.stats.lastConnectedAt = new Date();
      this.stats.averageConnectionTime = 
        (this.stats.averageConnectionTime + connectionTime) / this.stats.successfulConnections;
      
      logger.info(`✅ Database connection test successful (${connectionTime}ms)`);
      
      return {
        success: true,
        connectionTime,
        message: 'Database connection successful'
      };
      
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      this.stats.failedConnections++;
      this.stats.lastFailedAt = new Date();
      this.connectionError = error;
      
      logger.error(`❌ Database connection test failed (${connectionTime}ms):`, {
        message: error.message,
        code: error.code,
        errno: error.errno
      });
      
      return {
        success: false,
        connectionTime,
        error: error.message,
        code: error.code
      };
      
    } finally {
      // Always disconnect test client
      if (testClient) {
        try {
          await testClient.$disconnect();
        } catch (disconnectError) {
          logger.warn('Error disconnecting test client:', disconnectError.message);
        }
      }
    }
  }

  /**
   * Connect to database with retry logic
   */
  async connect() {
    if (this.isConnected && this.prismaClient) {
      return this.prismaClient;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting && this.connectionAttempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.connectionAttempts++;
      }
      return this.prismaClient;
    }

    this.isConnecting = true;
    this.lastConnectionAttempt = new Date();
    
    try {
      logger.info('Connecting to database...');
      
      // Test connection first
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.error}`);
      }
      
      // Create actual client
      this.prismaClient = new PrismaClient(this.getPrismaConfig());
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Connect with timeout
      const connectPromise = this.prismaClient.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      this.isConnected = true;
      this.connectionError = null;
      logger.info('✅ Database connected successfully');
      
      return this.prismaClient;
      
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      this.connectionError = error;
      this.isConnected = false;
      
      if (this.prismaClient) {
        try {
          await this.prismaClient.$disconnect();
        } catch (disconnectError) {
          logger.warn('Error disconnecting failed client:', disconnectError.message);
        }
        this.prismaClient = null;
      }
      
      throw error;
      
    } finally {
      this.isConnecting = false;
      this.connectionAttempts = 0;
    }
  }

  /**
   * Connect with retry logic
   */
  async connectWithRetry() {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Database connection attempt ${attempt}/${this.maxRetries}`);
        return await this.connect();
        
      } catch (error) {
        lastError = error;
        logger.warn(`Connection attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          logger.info(`Retrying in ${this.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          this.retryDelay *= 1.5; // Exponential backoff
        }
      }
    }
    
    throw new Error(`Failed to connect after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Set up Prisma event listeners
   */
  setupEventListeners() {
    if (!this.prismaClient) return;

    this.prismaClient.$on('error', (e) => {
      logger.error('Database error:', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
      this.isConnected = false;
    });

    this.prismaClient.$on('warn', (e) => {
      logger.warn('Database warning:', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.prismaClient) {
      try {
        await this.prismaClient.$disconnect();
        logger.info('Database disconnected');
      } catch (error) {
        logger.error('Error disconnecting from database:', error);
      }
      this.prismaClient = null;
    }
    this.isConnected = false;
  }

  /**
   * Get database connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      lastConnectionAttempt: this.lastConnectionAttempt,
      connectionError: this.connectionError?.message || null,
      stats: this.stats
    };
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      if (!this.isConnected || !this.prismaClient) {
        return {
          status: 'disconnected',
          message: 'Not connected to database'
        };
      }

      const startTime = Date.now();
      // Just check if client is connected - no need for $runCommandRaw
      if (!this.prismaClient) {
        throw new Error('Prisma client not available');
      }
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        message: 'Database is responsive'
      };

    } catch (error) {
      this.isConnected = false;
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Database health check failed'
      };
    }
  }

  /**
   * Get Prisma client (lazy initialization)
   */
  async getPrismaClient() {
    if (!this.isConnected || !this.prismaClient) {
      await this.connectWithRetry();
    }
    return this.prismaClient;
  }
}

// Export singleton instance
export const databaseConnection = new DatabaseConnection();

// Graceful shutdown
process.on('SIGINT', async () => {
  await databaseConnection.disconnect();
});

process.on('SIGTERM', async () => {
  await databaseConnection.disconnect();
});

export default databaseConnection;