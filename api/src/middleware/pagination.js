import queryResultOptimizer from "../services/queryResultOptimizer.js";

/**
 * Enhanced pagination middleware with memory optimization and result limiting
 * Adds pagination parameters to request and helper functions to response
 */
export function paginate(options = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    memoryLimit = 50 * 1024 * 1024, // 50MB default memory limit
    enableResultOptimization = true,
  } = options;

  return (req, res, next) => {
    // Validate and sanitize query parameters
    const sanitizedQuery = queryResultOptimizer.validateQueryParams(req.query);
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(sanitizedQuery.page) || defaultPage);
    let limit = Math.min(
      maxLimit,
      Math.max(1, parseInt(sanitizedQuery.limit) || defaultLimit)
    );
    
    // Apply memory-based limit optimization
    if (enableResultOptimization) {
      limit = queryResultOptimizer.getMemoryOptimizedLimit(limit, defaultLimit);
    }
    
    // Additional memory check
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > memoryLimit) {
      limit = Math.min(limit, 10); // Reduce to 10 items if memory is high
      req.memoryOptimized = true;
    }
    
    const skip = (page - 1) * limit;

    // Add to request
    req.pagination = {
      page,
      limit,
      skip,
      originalLimit: parseInt(req.query.limit) || defaultLimit,
      memoryOptimized: req.memoryOptimized || false
    };

    // Add helper function to response
    res.paginate = (data, total, options = {}) => {
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      // Apply result optimization if enabled
      let optimizedData = data;
      let optimizationMeta = {};
      
      if (enableResultOptimization && options.entityType) {
        optimizedData = queryResultOptimizer.optimizeQueryResults(data, {
          entityType: options.entityType,
          selectionLevel: options.selectionLevel || 'standard',
          memoryOptimize: true
        });
        
        optimizationMeta = {
          originalCount: Array.isArray(data) ? data.length : 1,
          optimizedCount: Array.isArray(optimizedData) ? optimizedData.length : 1,
          memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        };
      }

      const response = {
        success: true,
        data: optimizedData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev,
          nextPage: hasNext ? page + 1 : null,
          prevPage: hasPrev ? page - 1 : null,
        },
      };

      // Add optimization metadata
      if (Object.keys(optimizationMeta).length > 0) {
        response.meta = optimizationMeta;
      }

      // Add memory optimization notice
      if (req.memoryOptimized) {
        response.notice = 'Results limited due to high memory usage. Try again later or reduce page size.';
        response.pagination.memoryOptimized = true;
      }

      // Add optimization headers
      if (enableResultOptimization) {
        res.set('X-Result-Optimized', 'true');
        res.set('X-Memory-Usage-MB', optimizationMeta.memoryUsage?.toString() || '0');
      }

      return res.json(response);
    };

    // Add streaming helper for large datasets
    res.streamPaginate = (stream, options = {}) => {
      const { 
        contentType = 'application/json',
        filename,
        headers = {}
      } = options;

      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      if (filename) {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }
      
      // Add custom headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Pipe stream to response
      stream.pipe(res);
      
      // Handle stream errors
      stream.on('error', (error) => {
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream processing failed' });
        }
      });
    };

    next();
  };
}

/**
 * Filtering and sorting middleware
 */
export function filterSort(allowedFields = []) {
  return (req, res, next) => {
    const filters = {};
    const sort = {};

    // Parse filters from query
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('filter[') && key.endsWith(']')) {
        const field = key.slice(7, -1);
        if (allowedFields.length === 0 || allowedFields.includes(field)) {
          filters[field] = req.query[key];
        }
      }
    });

    // Parse sort from query (e.g., sort=name,-createdAt)
    if (req.query.sort) {
      const sortFields = req.query.sort.split(',');
      sortFields.forEach(field => {
        const trimmed = field.trim();
        if (trimmed.startsWith('-')) {
          const fieldName = trimmed.slice(1);
          if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
            sort[fieldName] = -1; // Descending
          }
        } else {
          if (allowedFields.length === 0 || allowedFields.includes(trimmed)) {
            sort[trimmed] = 1; // Ascending
          }
        }
      });
    }

    // Add to request
    req.filters = filters;
    req.sort = sort;

    next();
  };
}
