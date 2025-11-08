import { createClient } from 'redis';
import logger from '../utils/logger.js';
import config from './environment.js';

/**
 * Redis Client Configuration for Redis Cloud
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    if (this.isConnected) {
      logger.info('Redis already connected');
      return this.client;
    }

    if (this.isConnecting) {
      logger.info('Redis connection already in progress');
      return null;
    }

    // Check if Redis is disabled
    if (process.env.DISABLE_REDIS === 'true') {
      logger.info('🔄 Redis disabled via DISABLE_REDIS flag');
      return null;
    }

    try {
      this.isConnecting = true;

      // Create Redis client with Redis Cloud configuration
      // TLS is optional - enable via REDIS_TLS=true environment variable
      const useTLS = process.env.REDIS_TLS === 'true';
      
      this.client = createClient({
        socket: {
          host: config.redisConfig.host,
          port: config.redisConfig.port,
          // Enable TLS only if explicitly requested
          ...(useTLS && {
            tls: true,
            rejectUnauthorized: process.env.NODE_ENV === 'production'
          }),
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              logger.error('Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries}/${this.maxReconnectAttempts})`);
            return delay;
          },
          connectTimeout: 10000,
        },
        password: config.redisConfig.password,
        database: config.redisConfig.db,
        // Disable offline queue to prevent memory buildup
        enableOfflineQueue: false,
      });

      // Error handling
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('🔄 Redis connecting...');
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
        logger.warn(`Redis reconnecting... (attempt ${this.reconnectAttempts})`);
      });

      this.client.on('end', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();

      logger.info(`✅ Redis Cloud connection established${useTLS ? ' (TLS enabled)' : ''}`, {
        host: config.redisConfig.host,
        port: config.redisConfig.port,
        db: config.redisConfig.db,
        tls: useTLS
      });

      this.isConnecting = false;
      return this.client;

    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      
      logger.error('❌ Failed to connect to Redis Cloud:', {
        message: error.message,
        code: error.code,
        host: config.redisConfig.host,
        port: config.redisConfig.port
      });

      // Don't throw error, allow app to continue without Redis
      return null;
    }
  }

  /**
   * Get Redis client
   */
  getClient() {
    if (!this.isConnected || !this.client) {
      logger.warn('Redis client not connected');
      return null;
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady() {
    return this.isConnected && this.client && this.client.isReady;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis disconnected gracefully');
      } catch (error) {
        logger.error('Error disconnecting Redis:', error);
        // Force disconnect
        await this.client.disconnect();
      }
      this.isConnected = false;
      this.client = null;
    }
  }

  /**
   * Ping Redis to check connection
   */
  async ping() {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    try {
      if (!this.client || !this.isConnected) {
        return null;
      }
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Failed to get Redis info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
export default redisClient;
