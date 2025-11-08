/**
 * Global error handler middleware
 * Standardizes error responses across the API
 */
export function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error("Error:", err);

  // Default error status and message
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== "production";

  const response = {
    success: false,
    error: message,
    ...(isDevelopment && { stack: err.stack }),
    ...(err.errors && { details: err.errors }) // For validation errors
  };

  res.status(statusCode).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: asyncHandler(async (req, res) => { ... })
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}
