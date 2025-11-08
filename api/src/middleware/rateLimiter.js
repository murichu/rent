import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import logger from "../utils/logger.js";
import redisClient from "../config/redis.js";

/**
 * ==================================================
 * 🚦 Rate Limiting with Redis Cloud Support
 * ==================================================
 */

// Initialize Redis store for rate limiting (will be set after Redis connects)
let redisStore = null;

/**
 * Initialize Redis store for rate limiting
 * This is called after Redis connects in server.js
 */
export function initializeRedisStore() {
  if (process.env.DISABLE_REDIS === 'true') {
    console.log("🔄 Using in-memory rate limiting (Redis disabled)");
    logger.info("🔄 Using in-memory rate limiting (Redis disabled)");
    return false;
  }

  try {
    const client = redisClient.getClient();
    if (client && redisClient.isReady()) {
      redisStore = new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
      });
      console.log("✅ Using Redis Cloud for rate limiting");
      logger.info("✅ Using Redis Cloud for rate limiting");
      return true;
    } else {
      console.log("🔄 Redis not ready, using in-memory rate limiting");
      logger.info("🔄 Redis not ready, using in-memory rate limiting");
      return false;
    }
  } catch (error) {
    console.log("🔄 Redis unavailable, using in-memory rate limiting:", error.message);
    logger.warn("🔄 Redis unavailable, using in-memory rate limiting:", error.message);
    return false;
  }
}

/**
 * Get current Redis store (may be null if using in-memory)
 */
export function getRedisStore() {
  return redisStore;
}

/**
 * ==================================================
 * 🚦 Rate Limiters Configuration
 * ==================================================
 */

/**
 * 1️⃣ Enhanced API limiter — 1000 requests/min per user (In-Memory)
 */
export const enhancedApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  store: redisStore, // Uses Redis if available, otherwise in-memory
  skip: (req) => req.user && req.user.role === "ADMIN",
  standardHeaders: "draft-7",
  legacyHeaders: false,

  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for ${req.user?.id || req.ip}`);
    logger.warn(`⚠️ Rate limit exceeded for ${req.user?.id || req.ip}`, {
      userId: req.user?.id,
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: "Rate limit exceeded. Too many requests.",
      details: {
        limit: 1000,
        window: "1 minute",
        scope: req.user?.id ? "user" : "ip",
      },
    });
  },
});

/**
 * 2️⃣ General API limiter — 100 requests per 15 minutes (In-Memory)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: redisStore, // Uses Redis if available, otherwise in-memory
  skip: (req) => req.user && req.user.role === "ADMIN",
  message: {
    success: false,
    error: "Too many requests, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/**
 * 3️⃣ Authentication limiter — 5 login attempts per 15 minutes (In-Memory)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: redisStore, // Uses Redis if available, otherwise in-memory
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  handler: (req, res) => {
    console.warn("🚫 Auth rate limit exceeded");
    logger.warn("🚫 Auth rate limit exceeded", {
      email: req.body?.email,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.status(429).json({
      success: false,
      error: "Too many authentication attempts, please try again later.",
      retryAfter: "15 minutes",
    });
  },
});

/**
 * 4️⃣ Custom rate limiter creator (In-Memory)
 */
export function createRateLimiter(options) {
  console.log(
    `🧩 Creating custom rate limiter: max ${options.max || 100}, window ${
      options.windowMs || 15 * 60 * 1000
    }ms (in-memory)`
  );

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    // No store specified - uses default in-memory store
    skip: options.skip || ((req) => req.user && req.user.role === "ADMIN"),
    message: {
      success: false,
      error: options.message || "Too many requests, please try again later.",
    },
    standardHeaders: "draft-7",
    legacyHeaders: false,
    ...options,
  });
}

/**
 * 5️⃣ Admin bypass middleware
 */
export function adminBypass(req, res, next) {
  if (req.user && req.user.role === "ADMIN") {
    res.set("X-RateLimit-Bypass", "admin");
    console.log(`🛡️ Rate limit bypassed for admin user: ${req.user.id}`);
    logger.debug(`🛡️ Rate limit bypassed for admin user: ${req.user.id}`);
  }
  next();
}

/**
 * 6️⃣ Redis client removed - using in-memory rate limiting only
 */
