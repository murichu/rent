import cacheService from './cache.js';
import logger, { performanceLog } from '../utils/logger.js';

/**
 * Cache Invalidation Service
 * Provides intelligent cache invalidation strategies
 */
class CacheInvalidationService {
  constructor() {
    this.invalidationRules = new Map();
    this.taggedKeys = new Map(); // Map of tags to cache keys
    this.keyTags = new Map(); // Map of cache keys to tags
    this.dependencies = new Map(); // Cache key dependencies
    this.stats = {
      invalidations: 0,
      tagInvalidations: 0,
      dependencyInvalidations: 0,
      lastInvalidation: null,
    };
  }

  /**
   * Register cache invalidation rule
   */
  registerInvalidationRule(event, handler) {
    if (!this.invalidationRules.has(event)) {
      this.invalidationRules.set(event, []);
    }
    this.invalidationRules.get(event).push(handler);
    logger.debug(`Registered cache invalidation rule for event: ${event}`);
  }

  /**
   * Set cache with tags for easier invalidation
   */
  async setWithTags(key, value, ttl, tags = []) {
    const startTime = Date.now();
    
    try {
      // Set the cache value
      await cacheService.set(key, value, ttl);
      
      // Track tags for this key
      if (tags.length > 0) {
        this.keyTags.set(key, new Set(tags));
        
        // Add key to each tag's key list
        tags.forEach(tag => {
          if (!this.taggedKeys.has(tag)) {
            this.taggedKeys.set(tag, new Set());
          }
          this.taggedKeys.get(tag).add(key);
        });
      }
      
      const duration = Date.now() - startTime;
      performanceLog('cache_set_with_tags', duration, { key, tags });
      
      return true;
    } catch (error) {
      logger.error('Failed to set cache with tags', {
        key,
        tags,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Set cache dependencies
   */
  setDependency(dependentKey, dependsOnKeys) {
    if (!Array.isArray(dependsOnKeys)) {
      dependsOnKeys = [dependsOnKeys];
    }
    
    this.dependencies.set(dependentKey, new Set(dependsOnKeys));
    
    // Track reverse dependencies
    dependsOnKeys.forEach(key => {
      if (!this.dependencies.has(`__reverse__${key}`)) {
        this.dependencies.set(`__reverse__${key}`, new Set());
      }
      this.dependencies.get(`__reverse__${key}`).add(dependentKey);
    });
    
    logger.debug(`Set cache dependency: ${dependentKey} depends on [${dependsOnKeys.join(', ')}]`);
  }

  /**
   * Invalidate cache by key
   */
  async invalidateKey(key, reason = 'manual') {
    const startTime = Date.now();
    
    try {
      // Delete the key
      await cacheService.del(key);
      
      // Invalidate dependent keys
      await this.invalidateDependents(key);
      
      // Clean up tracking
      this.cleanupKeyTracking(key);
      
      this.stats.invalidations++;
      this.stats.lastInvalidation = new Date().toISOString();
      
      const duration = Date.now() - startTime;
      logger.info('Cache key invalidated', {
        key,
        reason,
        duration: `${duration}ms`
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to invalidate cache key', {
        key,
        reason,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags, reason = 'manual') {
    const startTime = Date.now();
    
    if (!Array.isArray(tags)) {
      tags = [tags];
    }
    
    try {
      const keysToInvalidate = new Set();
      
      // Collect all keys with these tags
      tags.forEach(tag => {
        const taggedKeys = this.taggedKeys.get(tag);
        if (taggedKeys) {
          taggedKeys.forEach(key => keysToInvalidate.add(key));
        }
      });
      
      // Invalidate all collected keys
      const invalidationPromises = Array.from(keysToInvalidate).map(key => 
        this.invalidateKey(key, `tag:${tags.join(',')}`)
      );
      
      await Promise.all(invalidationPromises);
      
      this.stats.tagInvalidations++;
      this.stats.lastInvalidation = new Date().toISOString();
      
      const duration = Date.now() - startTime;
      logger.info('Cache invalidated by tags', {
        tags,
        keysInvalidated: keysToInvalidate.size,
        reason,
        duration: `${duration}ms`
      });
      
      return keysToInvalidate.size;
    } catch (error) {
      logger.error('Failed to invalidate cache by tags', {
        tags,
        reason,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Invalidate dependent cache keys
   */
  async invalidateDependents(key) {
    const dependents = this.dependencies.get(`__reverse__${key}`);
    if (!dependents || dependents.size === 0) {
      return;
    }
    
    const invalidationPromises = Array.from(dependents).map(dependentKey => 
      this.invalidateKey(dependentKey, `dependency:${key}`)
    );
    
    await Promise.all(invalidationPromises);
    
    this.stats.dependencyInvalidations++;
    
    logger.debug('Invalidated dependent cache keys', {
      parentKey: key,
      dependents: Array.from(dependents)
    });
  }

  /**
   * Clean up key tracking when key is invalidated
   */
  cleanupKeyTracking(key) {
    // Remove from tag tracking
    const tags = this.keyTags.get(key);
    if (tags) {
      tags.forEach(tag => {
        const taggedKeys = this.taggedKeys.get(tag);
        if (taggedKeys) {
          taggedKeys.delete(key);
          if (taggedKeys.size === 0) {
            this.taggedKeys.delete(tag);
          }
        }
      });
      this.keyTags.delete(key);
    }
    
    // Remove from dependency tracking
    const dependencies = this.dependencies.get(key);
    if (dependencies) {
      dependencies.forEach(depKey => {
        const reverseDeps = this.dependencies.get(`__reverse__${depKey}`);
        if (reverseDeps) {
          reverseDeps.delete(key);
          if (reverseDeps.size === 0) {
            this.dependencies.delete(`__reverse__${depKey}`);
          }
        }
      });
      this.dependencies.delete(key);
    }
    
    // Remove reverse dependencies
    this.dependencies.delete(`__reverse__${key}`);
  }

  /**
   * Handle cache invalidation events
   */
  async handleEvent(event, data = {}) {
    const handlers = this.invalidationRules.get(event);
    if (!handlers || handlers.length === 0) {
      return;
    }
    
    logger.debug('Processing cache invalidation event', { event, data });
    
    const promises = handlers.map(async (handler) => {
      try {
        await handler(data, this);
      } catch (error) {
        logger.error('Cache invalidation handler failed', {
          event,
          error: error.message
        });
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Invalidate cache pattern
   */
  async invalidatePattern(pattern, reason = 'pattern') {
    const startTime = Date.now();
    
    try {
      const deletedCount = await cacheService.invalidatePattern(pattern);
      
      this.stats.invalidations += deletedCount;
      this.stats.lastInvalidation = new Date().toISOString();
      
      const duration = Date.now() - startTime;
      logger.info('Cache invalidated by pattern', {
        pattern,
        keysInvalidated: deletedCount,
        reason,
        duration: `${duration}ms`
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to invalidate cache by pattern', {
        pattern,
        reason,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get cache invalidation statistics
   */
  getStats() {
    return {
      ...this.stats,
      trackedTags: this.taggedKeys.size,
      trackedKeys: this.keyTags.size,
      dependencies: this.dependencies.size,
      registeredRules: this.invalidationRules.size,
    };
  }

  /**
   * Clear all tracking data
   */
  clearTracking() {
    this.taggedKeys.clear();
    this.keyTags.clear();
    this.dependencies.clear();
    
    logger.info('Cache tracking data cleared');
  }

  /**
   * Get cache key information
   */
  getKeyInfo(key) {
    return {
      key,
      tags: Array.from(this.keyTags.get(key) || []),
      dependencies: Array.from(this.dependencies.get(key) || []),
      dependents: Array.from(this.dependencies.get(`__reverse__${key}`) || []),
    };
  }

  /**
   * Get all keys with specific tag
   */
  getKeysByTag(tag) {
    return Array.from(this.taggedKeys.get(tag) || []);
  }
}

// Create singleton instance
const cacheInvalidationService = new CacheInvalidationService();

// Register common invalidation rules
cacheInvalidationService.registerInvalidationRule('property.created', async (data, service) => {
  await service.invalidateByTags(['properties', 'dashboard'], 'property.created');
});

cacheInvalidationService.registerInvalidationRule('property.updated', async (data, service) => {
  const { propertyId, agencyId } = data;
  await Promise.all([
    service.invalidateKey(`property:${propertyId}`, 'property.updated'),
    service.invalidateByTags(['properties', 'dashboard'], 'property.updated'),
    service.invalidatePattern(`properties:${agencyId}:*`, 'property.updated')
  ]);
});

cacheInvalidationService.registerInvalidationRule('property.deleted', async (data, service) => {
  const { propertyId, agencyId } = data;
  await Promise.all([
    service.invalidateKey(`property:${propertyId}`, 'property.deleted'),
    service.invalidateByTags(['properties', 'dashboard'], 'property.deleted'),
    service.invalidatePattern(`properties:${agencyId}:*`, 'property.deleted')
  ]);
});

cacheInvalidationService.registerInvalidationRule('tenant.created', async (data, service) => {
  await service.invalidateByTags(['tenants', 'dashboard'], 'tenant.created');
});

cacheInvalidationService.registerInvalidationRule('tenant.updated', async (data, service) => {
  const { tenantId, agencyId } = data;
  await Promise.all([
    service.invalidateKey(`tenant:${tenantId}`, 'tenant.updated'),
    service.invalidateByTags(['tenants', 'dashboard'], 'tenant.updated'),
    service.invalidatePattern(`tenants:${agencyId}:*`, 'tenant.updated')
  ]);
});

cacheInvalidationService.registerInvalidationRule('payment.created', async (data, service) => {
  const { leaseId, agencyId } = data;
  await Promise.all([
    service.invalidateByTags(['payments', 'dashboard'], 'payment.created'),
    service.invalidatePattern(`payments:${agencyId}:*`, 'payment.created'),
    service.invalidateKey(`lease:${leaseId}`, 'payment.created')
  ]);
});

cacheInvalidationService.registerInvalidationRule('lease.created', async (data, service) => {
  const { propertyId, tenantId, agencyId } = data;
  await Promise.all([
    service.invalidateByTags(['leases', 'dashboard'], 'lease.created'),
    service.invalidateKey(`property:${propertyId}`, 'lease.created'),
    service.invalidateKey(`tenant:${tenantId}`, 'lease.created'),
    service.invalidatePattern(`leases:${agencyId}:*`, 'lease.created')
  ]);
});

cacheInvalidationService.registerInvalidationRule('lease.updated', async (data, service) => {
  const { leaseId, propertyId, tenantId, agencyId } = data;
  await Promise.all([
    service.invalidateKey(`lease:${leaseId}`, 'lease.updated'),
    service.invalidateKey(`property:${propertyId}`, 'lease.updated'),
    service.invalidateKey(`tenant:${tenantId}`, 'lease.updated'),
    service.invalidateByTags(['leases', 'dashboard'], 'lease.updated'),
    service.invalidatePattern(`leases:${agencyId}:*`, 'lease.updated')
  ]);
});

export default cacheInvalidationService;