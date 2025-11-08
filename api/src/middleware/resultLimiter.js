import logger from "../utils/logger.js";
import queryResultOptimizer from "../services/queryResultOptimizer.js";

/**
 * Result Limiter Middleware
 * Prevents memory issues by limiting query results and monitoring resource usage
 */

class ResultLimiter {
  constructor() {
    this.maxResultsPerQuery = 1000;
    this.memoryThreshold = 200 * 1024 * 1024; // 200MB
    this.criticalMemoryThreshold = 400 * 1024 * 1024; // 400MB
    this.requestCounts = new Map(); // Track requests per user/agency
    this.rateLimits = {
      perMinute: 60,
      perHour: 1000,
    };
  }

  /**
   * Create middleware for result limiting
   */
  createLimiterMiddleware(options = {}) {
    const {
      maxResults = this.maxResultsPerQuery,
      enableMemoryMonitoring = true,
      enableRateLimiting = true,
      entityType = null,
    } = options;

    return (req, res, next) => {
      const startTime = Date.now();
      const memoryBefore = process.memoryUsage();

      // Check memory usage before processing
      if (
        enableMemoryMonitoring &&
        memoryBefore.heapUsed > this.criticalMemoryThreshold
      ) {
        logger.error("Critical memory usage detected, rejecting request", {
          memoryUsageMB: Math.round(memoryBefore.heapUsed / 1024 / 1024),
          threshold: Math.round(this.criticalMemoryThreshold / 1024 / 1024),
          url: req.originalUrl,
          method: req.method,
        });

        return res.status(503).json({
          error: "Service temporarily unavailable due to high memory usage",
          retryAfter: 60, // seconds
        });
      }

      // Apply rate limiting
      if (enableRateLimiting && req.user?.agencyId) {
        const rateLimitResult = this.checkRateLimit(req.user.agencyId);
        if (!rateLimitResult.allowed) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            retryAfter: rateLimitResult.retryAfter,
          });
        }
      }

      // Override response methods to apply result limiting
      const originalJson = res.json;
      const originalSend = res.send;

      res.json = function(data) {
        try {
          const limiter = new ResultLimiter();
          const limitedData = limiter.limitResults(data, {
            maxResults,
            entityType,
            memoryThreshold: limiter.memoryThreshold,
          });

          // Add result limiting headers
          if (Array.isArray(data) && Array.isArray(limitedData)) {
            res.set("X-Original-Count", data.length.toString());
            res.set("X-Limited-Count", limitedData.length.toString());
            res.set(
              "X-Result-Limited",
              (data.length !== limitedData.length).toString()
            );
          }

          // Monitor memory usage after processing
          const memoryAfter = process.memoryUsage();
          const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;

          res.set(
            "X-Memory-Usage-MB",
            Math.round(memoryAfter.heapUsed / 1024 / 1024).toString()
          );
          res.set(
            "X-Memory-Diff-MB",
            Math.round(memoryDiff / 1024 / 1024).toString()
          );
          res.set("X-Processing-Time-MS", (Date.now() - startTime).toString());

          // Log if memory usage is high
          if (memoryDiff > 50 * 1024 * 1024) {
            // 50MB increase
            logger.warn("High memory usage detected in request", {
              url: req.originalUrl,
              method: req.method,
              memoryIncreaseMB: Math.round(memoryDiff / 1024 / 1024),
              totalMemoryMB: Math.round(memoryAfter.heapUsed / 1024 / 1024),
              processingTimeMs: Date.now() - startTime,
            });
          }

          return originalJson.call(res, limitedData);
        } catch (error) {
          logger.error("Result limiting error", { error: error.message });
          return originalJson.call(res, data);
        }
      };

      res.send = function(data) {
        // Monitor memory for non-JSON responses too
        const memoryAfter = process.memoryUsage();
        res.set(
          "X-Memory-Usage-MB",
          Math.round(memoryAfter.heapUsed / 1024 / 1024).toString()
        );
        res.set("X-Processing-Time-MS", (Date.now() - startTime).toString());

        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Limit results based on memory and count constraints
   */
  limitResults(data, options = {}) {
    const {
      maxResults = this.maxResultsPerQuery,
      entityType = null,
      memoryThreshold = this.memoryThreshold,
    } = options;

    if (!data) return data;

    // Check current memory usage
    const currentMemory = process.memoryUsage().heapUsed;

    // If not an array, return as is
    if (!Array.isArray(data)) {
      return data;
    }

    let limitedData = data;

    // Apply count-based limiting
    if (data.length > maxResults) {
      limitedData = data.slice(0, maxResults);
      logger.warn("Results limited by count", {
        originalCount: data.length,
        limitedCount: limitedData.length,
        maxResults,
      });
    }

    // Apply memory-based limiting
    if (currentMemory > memoryThreshold) {
      const memoryBasedLimit = Math.max(10, Math.floor(maxResults * 0.5)); // Reduce by 50%
      if (limitedData.length > memoryBasedLimit) {
        limitedData = limitedData.slice(0, memoryBasedLimit);
        logger.warn("Results limited by memory usage", {
          originalCount: data.length,
          limitedCount: limitedData.length,
          memoryUsageMB: Math.round(currentMemory / 1024 / 1024),
          thresholdMB: Math.round(memoryThreshold / 1024 / 1024),
        });
      }
    }

    // Apply entity-specific optimizations
    if (entityType && limitedData.length > 0) {
      limitedData = queryResultOptimizer.optimizeQueryResults(limitedData, {
        entityType,
        selectionLevel: "standard",
        memoryOptimize: true,
      });
    }

    return limitedData;
  }

  /**
   * Check rate limiting for agency
   */
  checkRateLimit(agencyId) {
    const now = Date.now();
    const windowStart = now - 60 * 1000; // 1 minute window
    const hourWindowStart = now - 60 * 60 * 1000; // 1 hour window

    if (!this.requestCounts.has(agencyId)) {
      this.requestCounts.set(agencyId, []);
    }

    const requests = this.requestCounts.get(agencyId);

    // Clean old requests
    const recentRequests = requests.filter(
      (timestamp) => timestamp > hourWindowStart
    );
    this.requestCounts.set(agencyId, recentRequests);

    // Count requests in last minute
    const minuteRequests = recentRequests.filter(
      (timestamp) => timestamp > windowStart
    );

    // Check limits
    if (minuteRequests.length >= this.rateLimits.perMinute) {
      return {
        allowed: false,
        retryAfter: 60, // seconds
      };
    }

    if (recentRequests.length >= this.rateLimits.perHour) {
      return {
        allowed: false,
        retryAfter: 3600, // seconds
      };
    }

    // Add current request
    recentRequests.push(now);
    this.requestCounts.set(agencyId, recentRequests);

    return {
      allowed: true,
      remaining: {
        perMinute: this.rateLimits.perMinute - minuteRequests.length,
        perHour: this.rateLimits.perHour - recentRequests.length,
      },
    };
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats() {
    return queryResultOptimizer.getMemoryStats();
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection() {
    if (global.gc) {
      try {
        global.gc();
        logger.info("Forced garbage collection completed");
        return true;
      } catch (error) {
        logger.error("Failed to force garbage collection", {
          error: error.message,
        });
        return false;
      }
    }
    return false;
  }

  /**
   * Monitor memory usage and trigger cleanup if needed
   */
  monitorMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    if (heapUsedMB > 300) {
      // Above 300MB
      logger.warn("High memory usage detected", {
        heapUsedMB: Math.round(heapUsedMB),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
      });

      // Try to force garbage collection
      this.forceGarbageCollection();

      // Clear old rate limit data
      this.cleanupRateLimitData();
    }
  }

  /**
   * Clean up old rate limit data
   */
  cleanupRateLimitData() {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;

    for (const [agencyId, requests] of this.requestCounts.entries()) {
      const recentRequests = requests.filter(
        (timestamp) => timestamp > hourAgo
      );
      if (recentRequests.length === 0) {
        this.requestCounts.delete(agencyId);
      } else {
        this.requestCounts.set(agencyId, recentRequests);
      }
    }
  }

  /**
   * Start periodic memory monitoring
   */
  startMemoryMonitoring(intervalMs = 30000) {
    // 30 seconds
    setInterval(() => {
      this.monitorMemoryUsage();
    }, intervalMs);

    logger.info("Memory monitoring started", { intervalMs });
  }
}

// Create singleton instance
const resultLimiter = new ResultLimiter();

// Start memory monitoring
resultLimiter.startMemoryMonitoring();

export default resultLimiter;

// Export middleware creator for convenience
export const createResultLimiter = (options) =>
  resultLimiter.createLimiterMiddleware(options);
