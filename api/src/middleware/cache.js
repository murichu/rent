import cacheService from '../services/cache.js';
import logger from '../utils/logger.js';

// Cache middleware for API responses
export const cacheMiddleware = (options = {}) => {
  const {
    ttl = cacheService.defaultTTL.API_RESPONSE,
    keyGenerator = null,
    skipCache = false,
    cacheOnlySuccess = true,
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests or if explicitly disabled
    if (req.method !== 'GET' || skipCache) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : generateDefaultCacheKey(req);

      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        // Set cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`,
        });
        
        return res.status(cachedResponse.statusCode).json(cachedResponse.data);
      }

      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data) {
        const statusCode = res.statusCode;
        
        // Only cache successful responses if cacheOnlySuccess is true
        if (!cacheOnlySuccess || (statusCode >= 200 && statusCode < 300)) {
          const responseData = {
            statusCode,
            data,
            timestamp: new Date().toISOString(),
          };
          
          // Cache the response asynchronously
          cacheService.set(cacheKey, responseData, ttl)
            .catch(error => {
              logger.error('Failed to cache response:', error);
            });
        }
        
        // Set cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`,
        });
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Generate default cache key from request
function generateDefaultCacheKey(req) {
  const { path, query, user } = req;
  const userId = user?.id || 'anonymous';
  const agencyId = user?.agencyId || 'no-agency';
  
  // Create a deterministic query string
  const sortedQuery = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  
  const keyParts = [
    cacheService.keyPrefixes.API_RESPONSE,
    agencyId,
    userId,
    path.replace(/\//g, ':'),
    sortedQuery ? `query:${Buffer.from(sortedQuery).toString('base64')}` : '',
  ].filter(Boolean);
  
  return keyParts.join(':');
}

// Cache invalidation middleware
export const invalidateCacheMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Override response methods to invalidate cache after successful operations
    const invalidateCache = async () => {
      const statusCode = res.statusCode;
      
      // Only invalidate cache for successful operations
      if (statusCode >= 200 && statusCode < 300) {
        try {
          for (const pattern of patterns) {
            const resolvedPattern = typeof pattern === 'function' 
              ? pattern(req) 
              : pattern;
            
            await cacheService.invalidatePattern(resolvedPattern);
          }
        } catch (error) {
          logger.error('Cache invalidation error:', error);
        }
      }
    };
    
    res.json = function(data) {
      invalidateCache();
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      invalidateCache();
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Specific cache invalidation patterns
export const cacheInvalidationPatterns = {
  dashboard: (req) => `${cacheService.keyPrefixes.DASHBOARD}${req.user?.agencyId || '*'}:*`,
  properties: (req) => `${cacheService.keyPrefixes.PROPERTIES}${req.user?.agencyId || '*'}:*`,
  tenants: (req) => `${cacheService.keyPrefixes.TENANTS}${req.user?.agencyId || '*'}:*`,
  payments: (req) => `${cacheService.keyPrefixes.PAYMENTS}${req.user?.agencyId || '*'}:*`,
  apiResponses: (req) => `${cacheService.keyPrefixes.API_RESPONSE}${req.user?.agencyId || '*'}:*`,
};

// Conditional cache middleware based on user role
export const conditionalCache = (options = {}) => {
  return (req, res, next) => {
    const { skipForRoles = [], skipForUsers = [] } = options;
    
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    // Skip caching for specific roles or users
    if (
      (userRole && skipForRoles.includes(userRole)) ||
      (userId && skipForUsers.includes(userId))
    ) {
      return next();
    }
    
    return cacheMiddleware(options)(req, res, next);
  };
};

export default {
  cacheMiddleware,
  invalidateCacheMiddleware,
  cacheInvalidationPatterns,
  conditionalCache,
};