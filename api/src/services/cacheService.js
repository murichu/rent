import logger from '../utils/logger.js';
import redisClient from '../config/redis.js';

/**
 * Cache Service using Redis Cloud
 * Provides simple key-value caching with TTL support
 */
class CacheService {
  constructor() {
    this.isEnabled = false;
    this.defaultTTL = 3600; // 1 hour in seconds
    this.prefix = 'cache:';
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    try {
      if (process.env.DISABLE_CACHE === 'true') {
        logger.info('Cache service disabled via DISABLE_CACHE flag');
        return false;
      }

      // Check if Redis is available
      if (redisClient.isReady()) {
        this.isEnabled = true;
        logger.info('✅ Cache service initialized with Redis Cloud');
        return true;
      } else {
        logger.warn('⚠️ Redis not available, cache service disabled');
        return false;
      }
    } catch (error) {
      logger.error('Failed to initialize cache service:', error);
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isEnabled) return null;

    try {
      const client = redisClient.getClient();
      if (!client) return null;

      const fullKey = this.prefix + key;
      const value = await client.get(fullKey);
      
      if (value) {
        logger.debug('Cache hit', { key });
        return JSON.parse(value);
      }
      
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = null) {
    if (!this.isEnabled) return false;

    try {
      const client = redisClient.getClient();
      if (!client) return false;

      const fullKey = this.prefix + key;
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await client.setEx(fullKey, expiry, serialized);
      logger.debug('Cache set', { key, ttl: expiry });
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    if (!this.isEnabled) return false;

    try {
      const client = redisClient.getClient();
      if (!client) return false;

      const fullKey = this.prefix + key;
      await client.del(fullKey);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern) {
    if (!this.isEnabled) return 0;

    try {
      const client = redisClient.getClient();
      if (!client) return 0;

      const fullPattern = this.prefix + pattern;
      const keys = await client.keys(fullPattern);
      
      if (keys.length === 0) return 0;

      await client.del(keys);
      logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      return keys.length;
    } catch (error) {
      logger.error('Cache delete pattern error:', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key) {
    if (!this.isEnabled) return false;

    try {
      const client = redisClient.getClient();
      if (!client) return false;

      const fullKey = this.prefix + key;
      const result = await client.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key) {
    if (!this.isEnabled) return -1;

    try {
      const client = redisClient.getClient();
      if (!client) return -1;

      const fullKey = this.prefix + key;
      return await client.ttl(fullKey);
    } catch (error) {
      logger.error('Cache TTL error:', { key, error: error.message });
      return -1;
    }
  }

  /**
   * Extend TTL for a key
   */
  async extend(key, ttl) {
    if (!this.isEnabled) return false;

    try {
      const client = redisClient.getClient();
      if (!client) return false;

      const fullKey = this.prefix + key;
      await client.expire(fullKey, ttl);
      logger.debug('Cache TTL extended', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache extend error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    if (!this.isEnabled) return 0;

    try {
      const client = redisClient.getClient();
      if (!client) return 0;

      const pattern = this.prefix + '*';
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) return 0;

      await client.del(keys);
      logger.info('Cache cleared', { count: keys.length });
      return keys.length;
    } catch (error) {
      logger.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isEnabled) {
      return {
        enabled: false,
        keys: 0,
        memory: 0
      };
    }

    try {
      const client = redisClient.getClient();
      if (!client) {
        return { enabled: false, keys: 0, memory: 0 };
      }

      const pattern = this.prefix + '*';
      const keys = await client.keys(pattern);

      return {
        enabled: true,
        keys: keys.length,
        prefix: this.prefix,
        defaultTTL: this.defaultTTL,
        redisConnected: redisClient.isReady()
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return {
        enabled: this.isEnabled,
        error: error.message
      };
    }
  }

  /**
   * Wrapper for caching function results
   * Usage: const result = await cache.wrap('key', () => expensiveOperation(), 3600);
   */
  async wrap(key, fn, ttl = null) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
