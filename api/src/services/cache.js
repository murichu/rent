import Redis from 'ioredis';
import logger from '../utils/logger.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // Connection pool settings
      family: 4,
      enableOfflineQueue: false,
    };
    
    this.keyPrefixes = {
      DASHBOARD: 'dashboard:',
      PROPERTIES: 'properties:',
      TENANTS: 'tenants:',
      PAYMENTS: 'payments:',
      API_RESPONSE: 'api:',
      SESSION: 'session:',
      STATS: 'stats:',
    };
    
    this.defaultTTL = {
      DASHBOARD: 300, // 5 minutes
      PROPERTIES: 600, // 10 minutes
      TENANTS: 600, // 10 minutes
      PAYMENTS: 180, // 3 minutes
      API_RESPONSE: 300, // 5 minutes
      SESSION: 3600, // 1 hour
      STATS: 900, // 15 minutes
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  async connect() {
    try {
      if (this.isConnected) {
        return this.redis;
      }

      this.redis = new Redis(this.config);
      
      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });
      
      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
        this.stats.errors++;
      });
      
      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });
      
      this.redis.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      logger.info('Redis cache service initialized');
      
      return this.redis;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.stats.errors++;
      throw error;
    }
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  generateKey(prefix, identifier, suffix = '') {
    const key = `${prefix}${identifier}${suffix ? ':' + suffix : ''}`;
    return key;
  }

  async get(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const value = await this.redis.get(key);
      
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
      
      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const result = await this.redis.del(key);
      this.stats.deletes++;
      return result;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  async invalidatePattern(pattern) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        this.stats.deletes += keys.length;
        logger.info(`Invalidated ${result} keys matching pattern: ${pattern}`);
        return result;
      }
      return 0;
    } catch (error) {
      logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  async exists(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      return await this.redis.exists(key);
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  async ttl(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL check error for key ${key}:`, error);
      this.stats.errors++;
      return -1;
    }
  }

  async getStats() {
    const redisInfo = this.isConnected ? await this.redis.info('memory') : null;
    
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%',
      isConnected: this.isConnected,
      redisMemory: redisInfo ? this.parseRedisMemoryInfo(redisInfo) : null,
    };
  }

  parseRedisMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memoryInfo = {};
    
    lines.forEach(line => {
      if (line.includes('used_memory_human:')) {
        memoryInfo.usedMemory = line.split(':')[1];
      }
      if (line.includes('used_memory_peak_human:')) {
        memoryInfo.peakMemory = line.split(':')[1];
      }
    });
    
    return memoryInfo;
  }

  async flush() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      await this.redis.flushdb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        isConnected: this.isConnected,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        isConnected: false,
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;