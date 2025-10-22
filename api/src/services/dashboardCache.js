import cacheService from './cache.js';
import logger from '../utils/logger.js';

class DashboardCacheService {
  constructor() {
    this.cachePrefix = cacheService.keyPrefixes.DASHBOARD;
    this.defaultTTL = cacheService.defaultTTL.DASHBOARD;
    
    // Cache keys for different dashboard components
    this.cacheKeys = {
      STATS: 'stats',
      PROPERTIES: 'properties',
      TENANTS: 'tenants',
      PAYMENTS: 'payments',
      RECENT_ACTIVITIES: 'recent_activities',
      FINANCIAL_SUMMARY: 'financial_summary',
      OCCUPANCY_RATE: 'occupancy_rate',
      MAINTENANCE_REQUESTS: 'maintenance_requests',
    };
  }

  generateKey(agencyId, keyType, suffix = '') {
    return cacheService.generateKey(
      this.cachePrefix,
      `${agencyId}:${keyType}`,
      suffix
    );
  }

  async getDashboardStats(agencyId) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.STATS);
    return await cacheService.get(cacheKey);
  }

  async setDashboardStats(agencyId, stats, ttl = this.defaultTTL) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.STATS);
    return await cacheService.set(cacheKey, stats, ttl);
  }

  async getPropertyList(agencyId, page = 1, limit = 50, filters = {}) {
    const filterKey = this.generateFilterKey(filters);
    const cacheKey = this.generateKey(
      agencyId, 
      this.cacheKeys.PROPERTIES, 
      `page:${page}:limit:${limit}:${filterKey}`
    );
    return await cacheService.get(cacheKey);
  }

  async setPropertyList(agencyId, properties, page = 1, limit = 50, filters = {}, ttl = this.defaultTTL) {
    const filterKey = this.generateFilterKey(filters);
    const cacheKey = this.generateKey(
      agencyId, 
      this.cacheKeys.PROPERTIES, 
      `page:${page}:limit:${limit}:${filterKey}`
    );
    return await cacheService.set(cacheKey, properties, ttl);
  }

  async getTenantList(agencyId, page = 1, limit = 50, filters = {}) {
    const filterKey = this.generateFilterKey(filters);
    const cacheKey = this.generateKey(
      agencyId, 
      this.cacheKeys.TENANTS, 
      `page:${page}:limit:${limit}:${filterKey}`
    );
    return await cacheService.get(cacheKey);
  }

  async setTenantList(agencyId, tenants, page = 1, limit = 50, filters = {}, ttl = this.defaultTTL) {
    const filterKey = this.generateFilterKey(filters);
    const cacheKey = this.generateKey(
      agencyId, 
      this.cacheKeys.TENANTS, 
      `page:${page}:limit:${limit}:${filterKey}`
    );
    return await cacheService.set(cacheKey, tenants, ttl);
  }

  async getRecentPayments(agencyId, limit = 10) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.PAYMENTS, `recent:${limit}`);
    return await cacheService.get(cacheKey);
  }

  async setRecentPayments(agencyId, payments, limit = 10, ttl = this.defaultTTL) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.PAYMENTS, `recent:${limit}`);
    return await cacheService.set(cacheKey, payments, ttl);
  }

  async getRecentActivities(agencyId, limit = 20) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.RECENT_ACTIVITIES, `limit:${limit}`);
    return await cacheService.get(cacheKey);
  }

  async setRecentActivities(agencyId, activities, limit = 20, ttl = this.defaultTTL) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.RECENT_ACTIVITIES, `limit:${limit}`);
    return await cacheService.set(cacheKey, activities, ttl);
  }

  async getFinancialSummary(agencyId, period = 'month') {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.FINANCIAL_SUMMARY, period);
    return await cacheService.get(cacheKey);
  }

  async setFinancialSummary(agencyId, summary, period = 'month', ttl = this.defaultTTL) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.FINANCIAL_SUMMARY, period);
    return await cacheService.set(cacheKey, summary, ttl);
  }

  async getOccupancyRate(agencyId) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.OCCUPANCY_RATE);
    return await cacheService.get(cacheKey);
  }

  async setOccupancyRate(agencyId, occupancyData, ttl = this.defaultTTL) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.OCCUPANCY_RATE);
    return await cacheService.set(cacheKey, occupancyData, ttl);
  }

  async getMaintenanceRequests(agencyId, status = 'pending') {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.MAINTENANCE_REQUESTS, status);
    return await cacheService.get(cacheKey);
  }

  async setMaintenanceRequests(agencyId, requests, status = 'pending', ttl = this.defaultTTL) {
    const cacheKey = this.generateKey(agencyId, this.cacheKeys.MAINTENANCE_REQUESTS, status);
    return await cacheService.set(cacheKey, requests, ttl);
  }

  // Cache warming methods
  async warmDashboardCache(agencyId, dashboardData) {
    try {
      const warmingPromises = [];

      // Warm basic stats
      if (dashboardData.stats) {
        warmingPromises.push(this.setDashboardStats(agencyId, dashboardData.stats));
      }

      // Warm property list (first page)
      if (dashboardData.properties) {
        warmingPromises.push(this.setPropertyList(agencyId, dashboardData.properties, 1, 50));
      }

      // Warm tenant list (first page)
      if (dashboardData.tenants) {
        warmingPromises.push(this.setTenantList(agencyId, dashboardData.tenants, 1, 50));
      }

      // Warm recent payments
      if (dashboardData.recentPayments) {
        warmingPromises.push(this.setRecentPayments(agencyId, dashboardData.recentPayments));
      }

      // Warm recent activities
      if (dashboardData.recentActivities) {
        warmingPromises.push(this.setRecentActivities(agencyId, dashboardData.recentActivities));
      }

      // Warm financial summary
      if (dashboardData.financialSummary) {
        warmingPromises.push(this.setFinancialSummary(agencyId, dashboardData.financialSummary));
      }

      // Warm occupancy rate
      if (dashboardData.occupancyRate) {
        warmingPromises.push(this.setOccupancyRate(agencyId, dashboardData.occupancyRate));
      }

      await Promise.all(warmingPromises);
      logger.info(`Dashboard cache warmed for agency ${agencyId}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to warm dashboard cache for agency ${agencyId}:`, error);
      return false;
    }
  }

  // Cache invalidation methods
  async invalidateDashboardCache(agencyId, specificKey = null) {
    try {
      if (specificKey) {
        const cacheKey = this.generateKey(agencyId, specificKey);
        await cacheService.del(cacheKey);
        logger.info(`Invalidated specific dashboard cache key: ${cacheKey}`);
      } else {
        const pattern = `${this.cachePrefix}${agencyId}:*`;
        await cacheService.invalidatePattern(pattern);
        logger.info(`Invalidated all dashboard cache for agency ${agencyId}`);
      }
      return true;
    } catch (error) {
      logger.error(`Failed to invalidate dashboard cache for agency ${agencyId}:`, error);
      return false;
    }
  }

  async invalidateOnDataUpdate(agencyId, dataType) {
    const invalidationMap = {
      property: [this.cacheKeys.STATS, this.cacheKeys.PROPERTIES, this.cacheKeys.OCCUPANCY_RATE],
      tenant: [this.cacheKeys.STATS, this.cacheKeys.TENANTS, this.cacheKeys.OCCUPANCY_RATE],
      payment: [this.cacheKeys.STATS, this.cacheKeys.PAYMENTS, this.cacheKeys.FINANCIAL_SUMMARY],
      lease: [this.cacheKeys.STATS, this.cacheKeys.OCCUPANCY_RATE],
      maintenance: [this.cacheKeys.MAINTENANCE_REQUESTS],
    };

    const keysToInvalidate = invalidationMap[dataType] || [];
    
    try {
      const invalidationPromises = keysToInvalidate.map(keyType => {
        const pattern = `${this.cachePrefix}${agencyId}:${keyType}*`;
        return cacheService.invalidatePattern(pattern);
      });

      await Promise.all(invalidationPromises);
      logger.info(`Invalidated dashboard cache for data type: ${dataType}, agency: ${agencyId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to invalidate dashboard cache for data type ${dataType}:`, error);
      return false;
    }
  }

  // Helper method to generate filter key
  generateFilterKey(filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return 'no-filters';
    }
    
    const sortedFilters = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    
    return Buffer.from(sortedFilters).toString('base64').substring(0, 16);
  }

  // Get cache statistics for dashboard
  async getDashboardCacheStats(agencyId) {
    try {
      const pattern = `${this.cachePrefix}${agencyId}:*`;
      const keys = await cacheService.redis.keys(pattern);
      
      const keyStats = {};
      for (const key of keys) {
        const ttl = await cacheService.ttl(key);
        const keyType = key.split(':')[2]; // Extract key type
        
        if (!keyStats[keyType]) {
          keyStats[keyType] = { count: 0, avgTTL: 0 };
        }
        
        keyStats[keyType].count++;
        keyStats[keyType].avgTTL += ttl;
      }
      
      // Calculate averages
      Object.keys(keyStats).forEach(keyType => {
        keyStats[keyType].avgTTL = Math.round(keyStats[keyType].avgTTL / keyStats[keyType].count);
      });
      
      return {
        totalKeys: keys.length,
        keyStats,
        agencyId,
      };
    } catch (error) {
      logger.error(`Failed to get dashboard cache stats for agency ${agencyId}:`, error);
      return null;
    }
  }
}

// Create singleton instance
const dashboardCacheService = new DashboardCacheService();

export default dashboardCacheService;