import logger from "../utils/logger.js";
import { sessionManager } from "../middleware/session.js";
import os from "os";
import cacheService from "./cacheService.js";

/**
 * Load Balancer Service
 * Manages instance health, metrics, and coordination between nodes.
 */
class LoadBalancerService {
  constructor() {
    this.instanceId = process.env.INSTANCE_ID || process.pid.toString();
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastHealthCheck = null;
    this.isReady = false;

    // Check if load balancer should be disabled
    if (process.env.DISABLE_LOAD_BALANCER === "true") {
      logger.info("🔄 Load Balancer Service disabled via DISABLE_LOAD_BALANCER flag");
      this.isReady = true;
      return;
    }

    // In development, only enable if explicitly requested
    if (process.env.NODE_ENV === "development" && process.env.ENABLE_LOAD_BALANCER !== "true") {
      logger.info("🔄 Load Balancer Service disabled in development (set ENABLE_LOAD_BALANCER=true to enable)");
      this.isReady = true;
      return;
    }

    setImmediate(() => this.safeInitialize());
  }

  async safeInitialize() {
    try {
      if (process.env.DISABLE_LOAD_BALANCER === "true") {
        logger.warn("⚠️ Load balancer disabled by environment variable");
        this.isReady = true;
        return;
      }

      await this.initialize();
    } catch (error) {
      logger.error("Load Balancer Service initialization failed:", error);
      if (process.env.NODE_ENV !== "production") {
        logger.warn(
          "Continuing in development mode despite initialization failure"
        );
        this.isReady = true;
      }
    }
  }

  async initialize() {
    try {
      logger.info("Initializing Load Balancer Service", {
        instanceId: this.instanceId,
        environment: process.env.NODE_ENV,
      });

      await this.validateStatelessConfiguration();
      await this.testDependencies();
      await this.registerInstance();

      this.isReady = true;
      logger.info("✅ Load Balancer Service initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize Load Balancer Service", {
        message: error.message,
        stack: error.stack,
      });

      this.isReady = process.env.NODE_ENV !== "production";
      if (!this.isReady) throw error;
    }
  }

  async validateStatelessConfiguration() {
    const issues = [];

    try {
      logger.info("Validating stateless configuration...");

      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret") {
        issues.push("JWT_SECRET not properly configured for production");
      }

      if (!sessionManager) {
        issues.push("Session manager not available");
      } else if (
        !sessionManager.isReady &&
        process.env.NODE_ENV === "production"
      ) {
        issues.push("Session manager not ready");
      }

      if (
        process.env.SESSION_STORE === "memory" &&
        process.env.NODE_ENV === "production"
      ) {
        issues.push(
          "Memory-based session store detected - not ideal for load balancing"
        );
      }

      if (issues.length > 0) {
        logger.warn("⚠️ Stateless configuration issues detected:", { issues });
        if (process.env.NODE_ENV === "production") {
          throw new Error(issues.join(", "));
        }
      } else {
        logger.info("✅ Stateless configuration validated successfully");
      }
    } catch (error) {
      logger.error("Stateless configuration validation failed:", error);
      if (process.env.NODE_ENV === "production") throw error;
    }
  }

  async testDependencies() {
    const dependencies = {
      redis: false,
      database: false,
      cache: false,
    };

    // Redis/Session test (skipped in memory mode)
    if (sessionManager.useMemoryFallback) {
      logger.info(
        "Using memory session fallback - skipping Redis dependency test"
      );
      dependencies.redis = true;
    } else {
      try {
        logger.info("Testing Redis ping...");
        await sessionManager.redis?.ping?.();
        dependencies.redis = true;
      } catch {
        logger.warn("Redis unavailable, using memory fallback");
      }
    }

    // Database test
    try {
      logger.info("Testing database connectivity...");
      const { prisma } = await import("../db.js");
      await prisma.$runCommandRaw({ ping: 1 });
      dependencies.database = true;
      logger.info("✅ Database test successful");
    } catch (error) {
      logger.warn("⚠️ Database test failed:", error.message);
      dependencies.database = false;
    }

    // Cache test
    try {
      if (cacheService.isEnabled) {
        logger.info("Testing cache connectivity...");
        await cacheService.set('lb-test', 'test', 5);
        const result = await cacheService.get('lb-test');
        await cacheService.delete('lb-test');
        dependencies.cache = result === 'test';
        logger.info(dependencies.cache ? "✅ Cache test successful" : "⚠️ Cache test failed");
      } else {
        logger.info("Cache service disabled");
        dependencies.cache = true; // Not critical
      }
    } catch (error) {
      logger.warn("⚠️ Cache test failed:", error.message);
      dependencies.cache = false;
    }

    const failed = Object.entries(dependencies).filter(([_, ok]) => !ok);
    if (failed.length > 0) {
      logger.warn(
        "Dependency issues detected:",
        failed.map(([name]) => name)
      );
      if (
        process.env.NODE_ENV === "production" &&
        failed.some(([n]) => n === "database")
      ) {
        throw new Error("Critical dependencies failed");
      }
    } else {
      logger.info("✅ All dependencies passed");
    }
  }

  async registerInstance() {
    try {
      const info = {
        instanceId: this.instanceId,
        startTime: this.startTime,
        pid: process.pid,
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV,
        hostname: os.hostname(),
        platform: process.platform,
        nodeVersion: process.version,
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      };

      if (cacheService.isEnabled) {
        // Register instance in cache with 5 minute TTL
        await cacheService.set(`lb:instance:${this.instanceId}`, info, 300);
        logger.info("✅ Instance registered in cache", { instanceId: this.instanceId });
      } else {
        logger.info("Instance registration skipped (cache disabled)", { info });
      }
    } catch (error) {
      logger.warn("Failed to register instance:", error.message);
    }
  }

  async unregisterInstance() {
    try {
      if (cacheService.isEnabled) {
        await cacheService.delete(`lb:instance:${this.instanceId}`);
        logger.info("✅ Instance unregistered from cache", { instanceId: this.instanceId });
      } else {
        logger.info("Instance unregistration skipped (cache disabled)", {
          instanceId: this.instanceId,
        });
      }
    } catch (error) {
      logger.error("Failed to unregister instance:", error.message);
    }
  }

  async updateHealthStatus(status) {
    try {
      this.lastHealthCheck = Date.now();
      logger.info(`Health status updated: ${status}`);
    } catch (error) {
      logger.error("Failed to update health status:", error.message);
    }
  }

  async getActiveInstances() {
    try {
      if (!cacheService.isEnabled) {
        logger.info("Active instance retrieval skipped (cache disabled)");
        return [];
      }

      // Get all instance keys from cache
      const client = cacheService.getClient ? cacheService.getClient() : null;
      if (!client) return [];

      const pattern = 'cache:lb:instance:*';
      const keys = await client.keys(pattern);
      
      const instances = [];
      for (const key of keys) {
        const data = await cacheService.get(key.replace('cache:', ''));
        if (data) instances.push(data);
      }

      logger.debug(`Retrieved ${instances.length} active instances from cache`);
      return instances;
    } catch (error) {
      logger.error("Failed to get active instances:", error.message);
      return [];
    }
  }

  trackRequest(req, res) {
    this.requestCount++;
    const start = Date.now();

    res.on("finish", () => {
      const responseTime = Date.now() - start;
      if (res.statusCode >= 400) this.errorCount++;

      if (responseTime > 3000) {
        logger.warn("Slow request detected", {
          path: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
        });
      }

      if (this.requestCount % 100 === 0) {
        this.updateHealthStatus("healthy").catch((err) =>
          logger.error("Health update failed after tracking:", err.message)
        );
      }
    });
  }

  getInstanceMetrics() {
    const memory = process.memoryUsage();
    const uptime = process.uptime();
    return {
      instanceId: this.instanceId,
      uptime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate:
        this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      requestsPerSecond: this.requestCount / uptime,
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
        heapUsagePercent: (memory.heapUsed / memory.heapTotal) * 100,
      },
      lastHealthCheck: this.lastHealthCheck,
      isReady: this.isReady,
    };
  }

  async performHealthCheck() {
    try {
      const start = Date.now();
      const { prisma } = await import("../db.js");
      await prisma.$runCommandRaw({ ping: 1 });

      const responseTime = Date.now() - start;
      const metrics = this.getInstanceMetrics();

      const healthy = metrics.memory.heapUsagePercent < 90;
      const status = healthy ? "healthy" : "unhealthy";

      await this.updateHealthStatus(status);

      return {
        status,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        metrics,
        loadBalancer: {
          ready: this.isReady,
          stateless: true,
          sessionStore: "memory",
          cacheStore: "disabled",
        },
      };
    } catch (error) {
      logger.error("Health check failed:", error.message);
      return {
        status: "critical",
        timestamp: new Date().toISOString(),
        error: error.message,
        loadBalancer: {
          ready: false,
          stateless: true,
          sessionStore: "memory",
          cacheStore: "disabled",
        },
      };
    }
  }

  async gracefulShutdown() {
    logger.info("Graceful shutdown started", { instanceId: this.instanceId });
    try {
      await this.unregisterInstance();
      await this.updateHealthStatus("shutting-down");
      logger.info("✅ Graceful shutdown completed");
    } catch (error) {
      logger.error("Shutdown error:", error.message);
    }
  }

  canHandleRequests() {
    const metrics = this.getInstanceMetrics();
    return (
      metrics.memory.heapUsagePercent <= 95 &&
      metrics.errorRate <= 50 &&
      this.isReady
    );
  }
}

// Export singleton instance
export const loadBalancerService = new LoadBalancerService();

// Handle graceful shutdown
process.on("SIGTERM", () => {
  loadBalancerService.gracefulShutdown().then(() => process.exit(0));
});
process.on("SIGINT", () => {
  loadBalancerService.gracefulShutdown().then(() => process.exit(0));
});

export default loadBalancerService;
