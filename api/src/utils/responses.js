/**
 * Enhanced API Response Utilities
 * Provides standardized response formats with comprehensive metadata
 */

/**
 * Success response with optional pagination and metadata
 */
export function successResponse(res, data, message = "Success", statusCode = 200, meta = {}) {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  };

  // Add request metadata for debugging
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      method: res.req.method,
      path: res.req.path,
      query: res.req.query,
      userAgent: res.req.get('User-Agent'),
      ip: res.req.ip,
    };
  }

  return res.status(statusCode).json(response);
}

/**
 * Paginated response
 */
export function paginatedResponse(res, data, pagination, message = "Success") {
  return successResponse(res, data, message, 200, {
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: pagination.pages,
      hasNext: pagination.page < pagination.pages,
      hasPrev: pagination.page > 1,
    }
  });
}

/**
 * Error response with enhanced error details
 */
export function errorResponse(res, message = "An error occurred", statusCode = 500, errors = null, errorCode = null) {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    error: {
      code: errorCode || `HTTP_${statusCode}`,
      details: errors,
    }
  };

  // Add request context for debugging
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      method: res.req.method,
      path: res.req.path,
      query: res.req.query,
      body: res.req.body,
      userAgent: res.req.get('User-Agent'),
      ip: res.req.ip,
    };
  }

  return res.status(statusCode).json(response);
}

/**
 * Validation error response
 */
export function validationErrorResponse(res, errors) {
  return errorResponse(res, "Validation failed", 400, errors, "VALIDATION_ERROR");
}

/**
 * Authentication error response
 */
export function authErrorResponse(res, message = "Authentication required") {
  return errorResponse(res, message, 401, null, "AUTH_ERROR");
}

/**
 * Authorization error response
 */
export function forbiddenResponse(res, message = "Access denied") {
  return errorResponse(res, message, 403, null, "FORBIDDEN");
}

/**
 * Not found error response
 */
export function notFoundResponse(res, resource = "Resource") {
  return errorResponse(res, `${resource} not found`, 404, null, "NOT_FOUND");
}

/**
 * Conflict error response
 */
export function conflictResponse(res, message = "Resource already exists") {
  return errorResponse(res, message, 409, null, "CONFLICT");
}

/**
 * Rate limit error response
 */
export function rateLimitResponse(res, message = "Too many requests") {
  return errorResponse(res, message, 429, null, "RATE_LIMIT");
}

/**
 * Server error response
 */
export function serverErrorResponse(res, message = "Internal server error") {
  return errorResponse(res, message, 500, null, "SERVER_ERROR");
}

/**
 * Created response for successful resource creation
 */
export function createdResponse(res, data, message = "Resource created successfully") {
  return successResponse(res, data, message, 201);
}

/**
 * No content response for successful operations with no return data
 */
export function noContentResponse(res, message = "Operation completed successfully") {
  return res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString()
  });
}

/**
 * Accepted response for async operations
 */
export function acceptedResponse(res, data, message = "Request accepted for processing") {
  return successResponse(res, data, message, 202);
}

/**
 * Health check response
 */
export function healthResponse(res, status = "healthy", data = {}) {
  const statusCode = status === "healthy" ? 200 : status === "warning" ? 200 : 503;
  
  return res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    ...data
  });
}

/**
 * Legacy compatibility functions
 */
export function unauthorizedResponse(res, message = 'Unauthorized') {
  return authErrorResponse(res, message);
}

export function badRequestResponse(res, message = 'Bad request', details = null) {
  return errorResponse(res, message, 400, details, "BAD_REQUEST");
}

/**
 * API response wrapper middleware
 */
export function responseWrapper(req, res, next) {
  // Add response helpers to res object
  res.success = (data, message, statusCode, meta) => 
    successResponse(res, data, message, statusCode, meta);
  
  res.paginated = (data, pagination, message) => 
    paginatedResponse(res, data, pagination, message);
  
  res.error = (message, statusCode, errors, errorCode) => 
    errorResponse(res, message, statusCode, errors, errorCode);
  
  res.validationError = (errors) => 
    validationErrorResponse(res, errors);
  
  res.authError = (message) => 
    authErrorResponse(res, message);
  
  res.forbidden = (message) => 
    forbiddenResponse(res, message);
  
  res.notFound = (resource) => 
    notFoundResponse(res, resource);
  
  res.conflict = (message) => 
    conflictResponse(res, message);
  
  res.rateLimit = (message) => 
    rateLimitResponse(res, message);
  
  res.serverError = (message) => 
    serverErrorResponse(res, message);
  
  res.created = (data, message) => 
    createdResponse(res, data, message);
  
  res.noContent = (message) => 
    noContentResponse(res, message);
  
  res.accepted = (data, message) => 
    acceptedResponse(res, data, message);
  
  res.health = (status, data) => 
    healthResponse(res, status, data);

  next();
}
