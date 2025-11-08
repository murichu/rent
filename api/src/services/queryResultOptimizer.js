import logger from "../utils/logger.js";

/**
 * Query Result Optimization Service
 * Handles result limiting, memory monitoring, and object serialization optimization
 */

class QueryResultOptimizer {
  constructor() {
    this.memoryThreshold = 100 * 1024 * 1024; // 100MB
    this.maxResultSize = 1000; // Maximum number of results per query
    this.serializationCache = new Map();
  }

  /**
   * Monitor memory usage and adjust query limits
   */
  getMemoryOptimizedLimit(requestedLimit, defaultLimit = 50) {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    // If memory usage is high, reduce the limit
    if (heapUsedMB > 200) { // Above 200MB
      return Math.min(requestedLimit, 10);
    } else if (heapUsedMB > 100) { // Above 100MB
      return Math.min(requestedLimit, 25);
    } else if (heapUsedMB > 50) { // Above 50MB
      return Math.min(requestedLimit, defaultLimit);
    }
    
    // Normal memory usage
    return Math.min(requestedLimit, this.maxResultSize);
  }

  /**
   * Optimize object serialization by selecting only required fields
   */
  optimizeObjectSerialization(data, fieldSelection = null) {
    if (!data) return data;
    
    // If no field selection provided, return as is
    if (!fieldSelection) return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.selectFields(item, fieldSelection));
    }
    
    // Handle single objects
    return this.selectFields(data, fieldSelection);
  }

  /**
   * Select specific fields from an object
   */
  selectFields(obj, fields) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = {};
    
    for (const field of fields) {
      if (field.includes('.')) {
        // Handle nested fields like 'user.name'
        const [parent, ...nested] = field.split('.');
        if (obj[parent]) {
          if (!result[parent]) result[parent] = {};
          const nestedValue = this.getNestedValue(obj[parent], nested.join('.'));
          this.setNestedValue(result[parent], nested.join('.'), nestedValue);
        }
      } else {
        // Handle direct fields
        if (obj.hasOwnProperty(field)) {
          result[field] = obj[field];
        }
      }
    }
    
    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Create optimized field selections for common entities
   */
  getFieldSelections() {
    return {
      property: {
        minimal: ['id', 'title', 'address', 'status', 'rentAmount'],
        standard: ['id', 'title', 'address', 'city', 'state', 'status', 'rentAmount', 'type', 'bedrooms', 'bathrooms'],
        detailed: ['id', 'title', 'address', 'city', 'state', 'zip', 'status', 'rentAmount', 'type', 'bedrooms', 'bathrooms', 'sizeSqFt', 'createdAt', 'updatedAt']
      },
      tenant: {
        minimal: ['id', 'name', 'email'],
        standard: ['id', 'name', 'email', 'phone', 'createdAt'],
        detailed: ['id', 'name', 'email', 'phone', 'createdAt', 'updatedAt']
      },
      payment: {
        minimal: ['id', 'amount', 'paidAt', 'method'],
        standard: ['id', 'amount', 'paidAt', 'method', 'referenceNumber', 'status'],
        detailed: ['id', 'amount', 'paidAt', 'method', 'referenceNumber', 'status', 'notes', 'createdAt']
      },
      invoice: {
        minimal: ['id', 'amount', 'status', 'dueAt'],
        standard: ['id', 'amount', 'status', 'dueAt', 'issuedAt', 'totalPaid'],
        detailed: ['id', 'amount', 'status', 'dueAt', 'issuedAt', 'totalPaid', 'periodYear', 'periodMonth', 'createdAt']
      },
      lease: {
        minimal: ['id', 'startDate', 'rentAmount'],
        standard: ['id', 'startDate', 'endDate', 'rentAmount', 'paymentDayOfMonth'],
        detailed: ['id', 'startDate', 'endDate', 'rentAmount', 'paymentDayOfMonth', 'createdAt', 'updatedAt']
      },
      unit: {
        minimal: ['id', 'unitNumber', 'status', 'rentAmount'],
        standard: ['id', 'unitNumber', 'status', 'rentAmount', 'type', 'bedrooms', 'bathrooms'],
        detailed: ['id', 'unitNumber', 'status', 'rentAmount', 'type', 'bedrooms', 'bathrooms', 'sizeSqFt', 'createdAt']
      }
    };
  }

  /**
   * Optimize query results with memory and serialization optimizations
   */
  optimizeQueryResults(data, options = {}) {
    const {
      entityType,
      selectionLevel = 'standard', // minimal, standard, detailed
      customFields = null,
      memoryOptimize = true
    } = options;

    let optimizedData = data;

    // Apply memory optimization if enabled
    if (memoryOptimize && Array.isArray(data)) {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      // If memory usage is high, limit the results
      if (heapUsedMB > 150 && data.length > 100) {
        optimizedData = data.slice(0, 100);
        logger.warn('Query results truncated due to high memory usage', {
          originalCount: data.length,
          truncatedCount: optimizedData.length,
          memoryUsageMB: Math.round(heapUsedMB)
        });
      }
    }

    // Apply field selection optimization
    if (entityType || customFields) {
      const fieldSelections = this.getFieldSelections();
      let fields = customFields;
      
      if (!fields && entityType && fieldSelections[entityType]) {
        fields = fieldSelections[entityType][selectionLevel];
      }
      
      if (fields) {
        optimizedData = this.optimizeObjectSerialization(optimizedData, fields);
      }
    }

    return optimizedData;
  }

  /**
   * Create a streaming transformer for large result sets
   */
  createResultOptimizationTransform(options = {}) {
    const { Transform } = require('stream');
    const optimizer = this;
    
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const optimized = optimizer.optimizeQueryResults(chunk, options);
          callback(null, optimized);
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Monitor and log query performance metrics
   */
  logQueryMetrics(queryName, startTime, resultCount, memoryBefore, memoryAfter) {
    const duration = Date.now() - startTime;
    const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
    const memoryDiffMB = memoryDiff / 1024 / 1024;
    
    const metrics = {
      queryName,
      duration: `${duration}ms`,
      resultCount,
      memoryUsageMB: Math.round(memoryAfter.heapUsed / 1024 / 1024),
      memoryDiffMB: Math.round(memoryDiffMB * 100) / 100
    };
    
    if (duration > 1000) {
      logger.warn('Slow query detected', metrics);
    } else if (memoryDiffMB > 10) {
      logger.warn('High memory usage query', metrics);
    } else {
      logger.debug('Query metrics', metrics);
    }
    
    return metrics;
  }

  /**
   * Create a middleware for automatic query result optimization
   */
  createOptimizationMiddleware(options = {}) {
    const optimizer = this;
    
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        try {
          // Extract optimization options from query parameters
          const entityType = req.query.entityType || options.entityType;
          const selectionLevel = req.query.fields || options.selectionLevel || 'standard';
          const memoryOptimize = req.query.optimize !== 'false';
          
          const optimizationOptions = {
            entityType,
            selectionLevel,
            memoryOptimize,
            ...options
          };
          
          const optimizedData = optimizer.optimizeQueryResults(data, optimizationOptions);
          
          // Add optimization headers
          res.set('X-Result-Optimized', 'true');
          if (Array.isArray(data) && Array.isArray(optimizedData)) {
            res.set('X-Original-Count', data.length.toString());
            res.set('X-Optimized-Count', optimizedData.length.toString());
          }
          
          return originalJson.call(this, optimizedData);
        } catch (error) {
          logger.error('Result optimization error', { error: error.message });
          return originalJson.call(this, data);
        }
      };
      
      next();
    };
  }

  /**
   * Validate and sanitize query parameters to prevent memory issues
   */
  validateQueryParams(query) {
    const sanitized = { ...query };
    
    // Limit page size
    if (sanitized.limit) {
      const limit = parseInt(sanitized.limit);
      if (isNaN(limit) || limit < 1) {
        sanitized.limit = 50;
      } else if (limit > this.maxResultSize) {
        sanitized.limit = this.maxResultSize;
      }
    }
    
    // Limit page number
    if (sanitized.page) {
      const page = parseInt(sanitized.page);
      if (isNaN(page) || page < 1) {
        sanitized.page = 1;
      } else if (page > 1000) { // Prevent excessive pagination
        sanitized.page = 1000;
      }
    }
    
    // Validate include parameters
    if (sanitized.include && typeof sanitized.include === 'string') {
      const includes = sanitized.include.split(',');
      // Limit number of includes to prevent complex queries
      if (includes.length > 5) {
        sanitized.include = includes.slice(0, 5).join(',');
      }
    }
    
    return sanitized;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const queryResultOptimizer = new QueryResultOptimizer();

export default queryResultOptimizer;

// Export individual functions for convenience
export const {
  optimizeQueryResults,
  createOptimizationMiddleware,
  validateQueryParams,
  getMemoryStats,
  logQueryMetrics
} = queryResultOptimizer;