// middleware/errorHandler.js - Centralized error handling
import logger from '../utils/logger.js';

// Standard error response shape
export const createErrorResponse = (message, code = null, statusCode = 500) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (code) {
    response.code = code;
  }
  
  return { response, statusCode };
};

// Centralized error handler middleware
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('API Error', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    user: req.user?.username || 'anonymous'
  });

  // Determine status code
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorCode = null;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation error';
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorMessage = 'Invalid ID format';
    errorCode = 'INVALID_ID';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorMessage = 'Resource already exists';
    errorCode = 'DUPLICATE_ERROR';
  } else if (err.status) {
    statusCode = err.status;
    errorMessage = err.message;
    errorCode = err.code;
  }

  // Create standardized error response
  const { response } = createErrorResponse(errorMessage, errorCode, statusCode);
  
  res.status(statusCode).json(response);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Common error responses
export const ErrorResponses = {
  UNAUTHORIZED: () => createErrorResponse('Authentication required', 'UNAUTHORIZED', 401),
  FORBIDDEN: () => createErrorResponse('Insufficient permissions', 'FORBIDDEN', 403),
  NOT_FOUND: (resource = 'Resource') => createErrorResponse(`${resource} not found`, 'NOT_FOUND', 404),
  VALIDATION_ERROR: (message = 'Validation failed') => createErrorResponse(message, 'VALIDATION_ERROR', 400),
  RATE_LIMITED: () => createErrorResponse('Too many requests', 'RATE_LIMITED', 429),
  INTERNAL_ERROR: () => createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500)
};
