// middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 100, // Higher limit for production
  message: {
    error: 'Rate limit exceeded. Please wait a moment before trying again.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/health' || 
           req.path === '/api/health' ||
           req.path === '/' ||
           req.method === 'OPTIONS';
  }
});

// Stricter limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs (increased from 5)
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks and verification
  skip: (req) => {
    return req.path === '/api/health' || 
           req.path === '/api/auth/verify' ||
           req.method === 'GET';
  }
});

// Chat endpoint limiter
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 60 : 30, // Higher limit for production
  message: {
    error: 'Too many chat requests, please slow down.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour for development)
  max: 10, // Limit each IP to 10 password reset requests per window (increased from 3 for development)
  message: {
    error: 'Too many password reset attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
