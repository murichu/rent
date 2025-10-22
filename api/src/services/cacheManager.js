import cacheService from './cache.js';
import dashboardCacheService from './dashboardCache.js';
import cacheWarmingService from './cacheWarming.js';
import logger from '../utils/logger.js';

class CacheManager {
  constructor() {
    this.cleanupInterval = null;
    this.monitoringInterval = null;
    this.stats = {
      cleanupRuns: 0,
      keysDeleted: 0,
      memoryFreed: 0,
      lastCleanup: null,
      lastMonitoring: null
    };
  }

  async initialize() {
    try {
      // Connect to Redis
      await cacheService.connect();
      
      // Start monitoring
      this.startMonitoring();
      
      // Start cleanup scheduler
      this.startCleanupScheduler();
      
      // Schedule initial cache warming
      cacheWarmingService.scheduleWarmup();
      
      logger.info('Cache manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize cache manager:', error);
      return false;
    }
  }

  startMonitoring() {
    // Monitor cache every 5 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorCacheHealth();
        this.stats.lastMonitoring = new Date();
      } catch (error) {
        logger.error('Cache monitoring error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    logger.info('Cache monitoring started');
  }

  startCleanupScheduler() {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup();
        this.stats.lastCleanup = new Date();
        this.stats.cleanupRuns++;
      } catch (error) {
        logger.error('Cache cleanup error:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Cache cleanup scheduler started');
  }

  async monitorCacheHealth() {
    try {
      const health = await cacheService.healthCheck();
      const stats = await cacheService.getStats();
      
      // Log cache statistics
      logger.info('Cache health check:', {
        status: health.status,
        responseTime: health.responseTime,
        hitRate: stats.hitRate,
        totalHits: stats.hits,
        totalMisses: stats.misses,
        errors: stats.errors
      });

      // Check for concerning metrics
      if (health.status === 'unhealthy') {
        logger.error('Cache is unhealthy:', health.error);
        // Could trigger alerts here
      }

      const hitRate = parseFloat(stats.hitRate.replace('%', ''));
      if (hitRate < 70) {
        logger.warn(`Cache hit rate is low: ${stats.hitRate}`);
        // Could trigger cache warming here
      }

      if (stats.errors > 10) {
        logger.warn(`High cache error count: ${stats.errors}`);
      }

      return { health, stats };
    } catch (error) {
      logger.error('Cache health monitoring failed:', error);
      return null;
    }
  }

  async performCleanup() {
    try {
      logger.info('Starting cache cleanup');
      
      let keysDeleted = 0;
      
      // Clean up expired keys (Redis handles this automatically, but we can force it)
      if (cacheService.isConnected) {
        // Get memory info before cleanup
        const memoryBefore = await this.getMemoryUsage();
        
        // Force expire cleanup
        const expiredKeys = await cacheService.redis.eval(`
          local keys = redis.call('keys', '*')
          local expired = 0
          for i=1,#keys do
            if redis.call('ttl', keys[i]) == -2 then
              expired = expired + 1
            end
          end
          return expired
        `, 0);

        // Clean up old API response cache (older than 1 hour)
        const oldApiCachePattern = `${cacheService.keyPrefixes.API_RESPONSE}*`;
        const apiKeys = await cacheService.redis.keys(oldApiCachePattern);
        
        for (const key of apiKeys) {
          const ttl = await cacheService.ttl(key);
          if (ttl < 0 || ttl > 3600) { // No TTL or TTL > 1 hour
            await cacheService.del(key);
            keysDeleted++;
          }
        }

        // Get memory info after cleanup
        const memoryAfter = await this.getMemoryUsage();
        const memoryFreed = memoryBefore - memoryAfter;
        
        this.stats.keysDeleted += keysDeleted;
        this.stats.memoryFreed += memoryFreed;
        
        logger.info(`Cache cleanup completed: ${keysDeleted} keys deleted, ${memoryFreed}KB memory freed`);
      }
      
      return { keysDeleted, memoryFreed: this.stats.memoryFreed };
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
      return { keysDeleted: 0, memoryFreed: 0 };
    }
  }

  async getMemoryUsage() {
    try {
      if (!cacheService.isConnected) {
        return 0;
      }
      
      const info = await cacheService.redis.info('memory');
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line.startsWith('used_memory:')) {
          return parseInt(line.split(':')[1]) / 1024; // Convert to KB
        }
      }
      
      return 0;
    } catch (error) {
      logger.error('Failed to get memory usage:', error);
      return 0;
    }
  }

  async getCacheStatistics() {
    try {
      const cacheStats = await cacheService.getStats();
      const health = await cacheService.healthCheck();
      const memoryUsage = await this.getMemoryUsage();
      const warmingProgress = cacheWarmingService.getWarmingProgress();
      
      return {
        cache: cacheStats,
        health,
        memory: {
          usageKB: memoryUsage,
          usageMB: (memoryUsage / 1024).toFixed(2)
        },
        warming: warmingProgress,
        cleanup: {
          ...this.stats,
          nextCleanup: this.getNextCleanupTime(),
          nextMonitoring: this.getNextMonitoringTime()
        }
      };
    } catch (error) {
      logger.error('Failed to get cache statistics:', error);
      return null;
    }
  }

  getNextCleanupTime() {
    if (!this.cleanupInterval) return null;
    
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    
    return nextHour;
  }

  getNextMonitoringTime() {
    if (!this.monitoringInterval) return null;
    
    const now = new Date();
    const next5Min = new Date(now.getTime() + (5 * 60 * 1000));
    
    return next5Min;
  }

  async invalidateAllCaches() {
    try {
      await cacheService.flush();
      logger.info('All caches invalidated');
      return true;
    } catch (error) {
      logger.error('Failed to invalidate all caches:', error);
      return false;
    }
  }

  async invalidateAgencyCache(agencyId) {
    try {
      // Invalidate dashboard cache
      await dashboardCacheService.invalidateDashboardCache(agencyId);
      
      // Invalidate API response cache for this agency
      const patterns = [
        `${cacheService.keyPrefixes.API_RESPONSE}${agencyId}:*`,
        `${cacheService.keyPrefixes.PROPERTIES}${agencyId}:*`,
        `${cacheService.keyPrefixes.TENANTS}${agencyId}:*`,
        `${cacheService.keyPrefixes.PAYMENTS}${agencyId}:*`
      ];
      
      for (const pattern of patterns) {
        await cacheService.invalidatePattern(pattern);
      }
      
      logger.info(`All caches invalidated for agency ${agencyId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to invalidate caches for agency ${agencyId}:`, error);
      return false;
    }
  }

  async warmCacheForAgency(agencyId, cacheType = 'all') {
    try {
      if (cacheType === 'all') {
        return await cacheWarmingService.warmAgencyCache(agencyId);
      } else {
        return await cacheWarmingService.warmSpecificCache(agencyId, cacheType);
      }
    } catch (error) {
      logger.error(`Failed to warm cache for agency ${agencyId}:`, error);
      return false;
    }
  }

  async shutdown() {
    try {
      // Clear intervals
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
      
      // Disconnect from Redis
      await cacheService.disconnect();
      
      logger.info('Cache manager shutdown completed');
      return true;
    } catch (error) {
      logger.error('Cache manager shutdown failed:', error);
      return false;
    }
  }

  // Cache invalidation patterns for different data types
  async invalidateByDataType(agencyId, dataType) {
    const invalidationMap = {
      property: async () => {
        await dashboardCacheService.invalidateOnDataUpdate(agencyId, 'property');
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.PROPERTIES}${agencyId}:*`);
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.API_RESPONSE}${agencyId}:*properties*`);
      },
      tenant: async () => {
        await dashboardCacheService.invalidateOnDataUpdate(agencyId, 'tenant');
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.TENANTS}${agencyId}:*`);
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.API_RESPONSE}${agencyId}:*tenants*`);
      },
      payment: async () => {
        await dashboardCacheService.invalidateOnDataUpdate(agencyId, 'payment');
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.PAYMENTS}${agencyId}:*`);
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.API_RESPONSE}${agencyId}:*payments*`);
      },
      lease: async () => {
        await dashboardCacheService.invalidateOnDataUpdate(agencyId, 'lease');
        await cacheService.invalidatePattern(`${cacheService.keyPrefixes.API_RESPONSE}${agencyId}:*leases*`);
      }
    };

    try {
      const invalidationFn = invalidationMap[dataType];
      if (invalidationFn) {
        await invalidationFn();
        logger.info(`Cache invalidated for data type: ${dataType}, agency: ${agencyId}`);
        return true;
      } else {
        logger.warn(`Unknown data type for cache invalidation: ${dataType}`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to invalidate cache for data type ${dataType}:`, error);
      return false;
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager;