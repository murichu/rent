/**
 * Standardized API response utilities
 */

/**
 * Success response
 */
export function successResponse(res, data, statusCode = 200, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...meta,
  });
}

/**
 * Error response
 */
export function errorResponse(res, message, statusCode = 500, details = null) {
  const response = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Created response
 */
export function createdResponse(res, data) {
  return successResponse(res, data, 201);
}

/**
 * No content response
 */
export function noContentResponse(res) {
  return res.status(204).send();
}

/**
 * Not found response
 */
export function notFoundResponse(res, resource = 'Resource') {
  return errorResponse(res, `${resource} not found`, 404);
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(res, message = 'Unauthorized') {
  return errorResponse(res, message, 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(res, message = 'Forbidden') {
  return errorResponse(res, message, 403);
}

/**
 * Bad request response
 */
export function badRequestResponse(res, message = 'Bad request', details = null) {
  return errorResponse(res, message, 400, details);
}

/**
 * Validation error response
 */
export function validationErrorResponse(res, errors) {
  return errorResponse(res, 'Validation failed', 400, errors);
}
