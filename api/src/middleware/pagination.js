/**
 * Pagination middleware
 * Adds pagination parameters to request and helper functions to response
 */
export function paginate(options = {}) {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
  } = options;

  return (req, res, next) => {
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || defaultPage);
    const limit = Math.min(
      maxLimit,
      Math.max(1, parseInt(req.query.limit) || defaultLimit)
    );
    const skip = (page - 1) * limit;

    // Add to request
    req.pagination = {
      page,
      limit,
      skip,
    };

    // Add helper function to response
    res.paginate = (data, total) => {
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return res.json({
        success: true,
        data,
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
