import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis client for rate limiting storage
let redisClient;

try {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis rate limiter connection error:', err);
  });
} catch (error) {
  logger.warn('Redis not available for rate limiting, falling back to memory store');
}

// Initialize Redis store for rate limiting
let redisStore;
if (redisClient) {
  try {
    const { default: RedisStore } = await import('rate-limit-redis');
    redisStore = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    });
  } catch (error) {
    logger.warn('Failed to initialize Redis store for rate limiting:', error);
  }
}

/**
 * Enhanced rate limiter with Redis store and user-based limiting
 * 1000 requests per minute per user (as per requirement 5.1)
 */
export const enhancedApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per user
  
  // Use Redis store if available, otherwise fall back to memory
  store: redisStore,
  
  // Key generator based on user ID or IP
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    return req.ip;
  },
  
  // Skip rate limiting for admin users
  skip: (req) => {
    return req.user && req.user.role === 'ADMIN';
  },
  
  // Enhanced error response with rate limit headers
  message: (req, res) => {
    const resetTime = new Date(Date.now() + res.getHeader('X-RateLimit-Reset'));
    return {
      success: false,
      error: 'Rate limit exceeded. Too many requests.',
      details: {
        limit: res.getHeader('X-RateLimit-Limit'),
        remaining: res.getHeader('X-RateLimit-Remaining'),
        resetTime: resetTime.toISOString(),
        retryAfter: res.getHeader('Retry-After')
      }
    };
  },
  
  // Add comprehensive rate limit headers
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom headers
  onLimitReached: (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.user?.id || req.ip}`, {
      userId: req.user?.id,
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
    
    res.set({
      'X-RateLimit-Policy': '1000 requests per minute',
      'X-RateLimit-Scope': req.user?.id ? 'user' : 'ip'
    });
  }
});

/**
 * General API rate limiter (backward compatibility)
 * Enhanced with better error handling and headers
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `legacy:user:${req.user.id}`;
    }
    return `legacy:ip:${req.ip}`;
  },
  
  skip: (req) => {
    return req.user && req.user.role === 'ADMIN';
  },
  
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter (stricter)
 * Enhanced with better tracking and admin bypass
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  
  keyGenerator: (req) => {
    // Use email or IP for auth attempts
    const identifier = req.body?.email || req.ip;
    return `auth:${identifier}`;
  },
  
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  
  skipSuccessfulRequests: true,
  
  onLimitReached: (req, res) => {
    logger.warn(`Auth rate limit exceeded`, {
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
});

/**
 * Create custom rate limiter with enhanced options
 */
export function createRateLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    
    keyGenerator: options.keyGenerator || ((req) => {
      if (req.user && req.user.id) {
        return `custom:user:${req.user.id}`;
      }
      return `custom:ip:${req.ip}`;
    }),
    
    skip: options.skip || ((req) => {
      return req.user && req.user.role === 'ADMIN';
    }),
    
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later.',
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    ...options,
  });
}

/**
 * Middleware to add rate limiting bypass for admin users
 */
export function adminBypass(req, res, next) {
  if (req.user && req.user.role === 'ADMIN') {
    res.set('X-RateLimit-Bypass', 'admin');
    logger.debug(`Rate limit bypassed for admin user: ${req.user.id}`);
  }
  next();
}
