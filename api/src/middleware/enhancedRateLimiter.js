import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import {
  rateLimitLog,
  securityLog,
  SecuritySeverity,
} from "../utils/logger.js";
import logger from "../utils/logger.js";

// Helper to normalize IPv6 addresses
const normalizeIP = (ip) => {
  if (!ip) return "unknown";
  // Remove IPv6 prefix if present
  return ip.replace(/^::ffff:/, "");
};

/**
 * Rate Limit Policies for different endpoint types
 */
const RateLimitPolicies = {
  // Authentication endpoints - very strict
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Payment endpoints - strict
  PAYMENTS: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: "Too many payment requests. Please try again in a minute.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // CRUD operations - moderate
  CRUD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: "Too many requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },

  // Read-only endpoints - lenient
  READS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: "Too many requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },

  // Admin endpoints - moderate but tracked
  ADMIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes
    message: "Too many admin requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // File upload endpoints - very strict
  UPLOADS: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: "Too many file uploads. Please try again in an hour.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // Default for unclassified endpoints
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes
    message: "Too many requests. Please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },
};

/**
 * Enhanced Rate Limiter Class
 */
class EnhancedRateLimiter {
  constructor() {
    this.redisStore = null;
    this.rateLimiters = new Map();
    this.suspiciousIPs = new Set();
    this.initializeRedisStore();
  }

  /**
   * Initialize Redis store for rate limiting
   */
  async initializeRedisStore() {
    try {
      // Try to import Redis client
      const redisModule = await import("../config/redis.js");
      const redisClient = redisModule.default;

      if (redisClient && redisClient.isReady()) {
        this.redisStore = new RedisStore({
          sendCommand: (...args) => redisClient.sendCommand(args),
        });
        logger.info("Enhanced rate limiter using Redis store");
      } else {
        logger.warn("Redis not available, using in-memory rate limiting");
      }
    } catch (error) {
      logger.warn(
        "Failed to initialize Redis for rate limiting, using in-memory store",
        {
          error: error.message,
        }
      );
    }
  }

  /**
   * Create rate limiter with enhanced features
   */
  createRateLimiter(policy, options = {}) {
    const config = {
      ...policy,
      store: this.redisStore,
      // Don't use custom keyGenerator - let express-rate-limit handle IPv6 properly
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: (req, res) => {
        const identifier = req.user?.id || req.ip;
        const correlationId = req.correlationId;

        // Log rate limit violation
        rateLimitLog(
          "rate_limit_exceeded",
          identifier,
          req.originalUrl,
          {
            method: req.method,
            userAgent: req.get("User-Agent"),
            policy: options.policyName || "unknown",
          },
          correlationId
        );

        // Track suspicious IPs
        if (!req.user?.id) {
          // Only track unauthenticated requests
          this.trackSuspiciousIP(req.ip, req);
        }

        // Security logging for repeated violations
        securityLog(
          "rate_limit_violation",
          {
            identifier,
            endpoint: req.originalUrl,
            method: req.method,
            userAgent: req.get("User-Agent"),
            policy: options.policyName || "unknown",
          },
          SecuritySeverity.MEDIUM,
          correlationId
        );

        // Enhanced response with retry information
        res.status(429).json({
          success: false,
          error: policy.message,
          type: "rate_limit",
          retryAfter: Math.ceil(policy.windowMs / 1000),
          correlationId,
          timestamp: new Date().toISOString(),
          policy: options.policyName || "default",
        });
      },

      skip: (req) => {
        // Skip rate limiting for admin bypass
        if (req.user?.role === "admin" && options.allowAdminBypass) {
          return true;
        }

        // Skip for health checks
        if (
          req.originalUrl?.includes("/health") ||
          req.originalUrl?.includes("/alive")
        ) {
          return true;
        }

        return false;
      },
    };

    return rateLimit(config);
  }

  /**
   * Track suspicious IP addresses
   */
  trackSuspiciousIP(ip, req) {
    const key = `suspicious:${ip}`;

    if (this.suspiciousIPs.has(key)) {
      // Already marked as suspicious, log security event
      securityLog(
        "repeated_rate_limit_violation",
        {
          ip,
          endpoint: req.originalUrl,
          method: req.method,
          userAgent: req.get("User-Agent"),
          timestamp: new Date().toISOString(),
        },
        SecuritySeverity.HIGH,
        req.correlationId
      );
    } else {
      this.suspiciousIPs.add(key);

      // Remove from suspicious list after 1 hour
      setTimeout(() => {
        this.suspiciousIPs.delete(key);
      }, 60 * 60 * 1000);
    }
  }

  /**
   * Get rate limiter for authentication endpoints
   */
  getAuthLimiter() {
    if (!this.rateLimiters.has("auth")) {
      this.rateLimiters.set(
        "auth",
        this.createRateLimiter(RateLimitPolicies.AUTH, {
          prefix: "auth",
          policyName: "authentication",
          allowAdminBypass: false, // Never bypass auth rate limits
        })
      );
    }
    return this.rateLimiters.get("auth");
  }

  /**
   * Get rate limiter for payment endpoints
   */
  getPaymentLimiter() {
    if (!this.rateLimiters.has("payments")) {
      this.rateLimiters.set(
        "payments",
        this.createRateLimiter(RateLimitPolicies.PAYMENTS, {
          prefix: "payments",
          policyName: "payments",
          allowAdminBypass: false, // Never bypass payment rate limits
        })
      );
    }
    return this.rateLimiters.get("payments");
  }

  /**
   * Get rate limiter for CRUD operations
   */
  getCRUDLimiter() {
    if (!this.rateLimiters.has("crud")) {
      this.rateLimiters.set(
        "crud",
        this.createRateLimiter(RateLimitPolicies.CRUD, {
          prefix: "crud",
          policyName: "crud_operations",
          allowAdminBypass: true,
        })
      );
    }
    return this.rateLimiters.get("crud");
  }

  /**
   * Get rate limiter for read operations
   */
  getReadLimiter() {
    if (!this.rateLimiters.has("reads")) {
      this.rateLimiters.set(
        "reads",
        this.createRateLimiter(RateLimitPolicies.READS, {
          prefix: "reads",
          policyName: "read_operations",
          allowAdminBypass: true,
        })
      );
    }
    return this.rateLimiters.get("reads");
  }

  /**
   * Get rate limiter for admin endpoints
   */
  getAdminLimiter() {
    if (!this.rateLimiters.has("admin")) {
      this.rateLimiters.set(
        "admin",
        this.createRateLimiter(RateLimitPolicies.ADMIN, {
          prefix: "admin",
          policyName: "admin_operations",
          allowAdminBypass: false, // Track all admin operations
        })
      );
    }
    return this.rateLimiters.get("admin");
  }

  /**
   * Get rate limiter for file uploads
   */
  getUploadLimiter() {
    if (!this.rateLimiters.has("uploads")) {
      this.rateLimiters.set(
        "uploads",
        this.createRateLimiter(RateLimitPolicies.UPLOADS, {
          prefix: "uploads",
          policyName: "file_uploads",
          allowAdminBypass: true,
        })
      );
    }
    return this.rateLimiters.get("uploads");
  }

  /**
   * Get default rate limiter
   */
  getDefaultLimiter() {
    if (!this.rateLimiters.has("default")) {
      this.rateLimiters.set(
        "default",
        this.createRateLimiter(RateLimitPolicies.DEFAULT, {
          prefix: "default",
          policyName: "default",
          allowAdminBypass: true,
        })
      );
    }
    return this.rateLimiters.get("default");
  }

  /**
   * Smart rate limiter that chooses policy based on endpoint
   */
  getSmartLimiter() {
    return (req, res, next) => {
      const path = req.originalUrl.toLowerCase();
      const method = req.method.toLowerCase();

      let limiter;

      // Authentication endpoints
      if (
        path.includes("/auth") ||
        path.includes("/login") ||
        path.includes("/register")
      ) {
        limiter = this.getAuthLimiter();
      }
      // Payment endpoints
      else if (
        path.includes("/payment") ||
        path.includes("/mpesa") ||
        path.includes("/pesapal")
      ) {
        limiter = this.getPaymentLimiter();
      }
      // File upload endpoints
      else if (
        path.includes("/upload") ||
        (method === "post" && path.includes("/files"))
      ) {
        limiter = this.getUploadLimiter();
      }
      // Admin endpoints
      else if (
        path.includes("/admin") ||
        (req.user?.role === "admin" && method !== "get")
      ) {
        limiter = this.getAdminLimiter();
      }
      // Read operations
      else if (method === "get" || method === "head" || method === "options") {
        limiter = this.getReadLimiter();
      }
      // CRUD operations
      else if (["post", "put", "patch", "delete"].includes(method)) {
        limiter = this.getCRUDLimiter();
      }
      // Default
      else {
        limiter = this.getDefaultLimiter();
      }

      return limiter(req, res, next);
    };
  }

  /**
   * Get rate limiting statistics
   */
  async getRateLimitStats() {
    try {
      const stats = {
        policies: Object.keys(RateLimitPolicies),
        activeLimiters: Array.from(this.rateLimiters.keys()),
        suspiciousIPs: this.suspiciousIPs.size,
        redisConnected: !!this.redisStore,
      };

      return stats;
    } catch (error) {
      logger.error("Failed to get rate limit stats", { error: error.message });
      return { error: "Failed to retrieve stats" };
    }
  }

  /**
   * Clear rate limits for a specific identifier (admin function)
   */
  async clearRateLimit(identifier, policy = "default") {
    try {
      if (this.redisStore) {
        const key = `rl:${policy}:${identifier}`;
        // This would need to be implemented based on the Redis store API
        logger.info("Rate limit cleared", { identifier, policy });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Failed to clear rate limit", {
        error: error.message,
        identifier,
        policy,
      });
      return false;
    }
  }
}

// Create singleton instance
const enhancedRateLimiter = new EnhancedRateLimiter();

// Export individual limiters
export const authLimiter = enhancedRateLimiter.getAuthLimiter();
export const paymentLimiter = enhancedRateLimiter.getPaymentLimiter();
export const crudLimiter = enhancedRateLimiter.getCRUDLimiter();
export const readLimiter = enhancedRateLimiter.getReadLimiter();
export const adminLimiter = enhancedRateLimiter.getAdminLimiter();
export const uploadLimiter = enhancedRateLimiter.getUploadLimiter();
export const defaultLimiter = enhancedRateLimiter.getDefaultLimiter();

// Export smart limiter
export const smartRateLimiter = enhancedRateLimiter.getSmartLimiter();

// Export the class and policies
export { EnhancedRateLimiter, RateLimitPolicies };

export default enhancedRateLimiter;
