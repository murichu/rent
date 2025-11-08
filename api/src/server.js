// Global error handlers - ALWAYS exit on critical errors to prevent unstable state
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import config from "./config/environment.js";
import { responseWrapper } from "./utils/responses.js";
import morgan from "morgan";

// Core business routes
import { authRouter } from "./routes/auth.js";
import { propertyRouter } from "./routes/properties.js";
import { tenantRouter } from "./routes/tenants.js";
import { unitRouter } from "./routes/units.js";
import { usersRouter } from "./routes/users.js";
import { agencyRouter } from "./routes/agencies.js";

// Financial routes
import { leaseRouter } from "./routes/leases.js";
import { paymentRouter } from "./routes/payments.js";
import { invoiceRouter } from "./routes/invoices.js";
import { dashboardRouter } from "./routes/dashboard.js";

// Advanced feature routes
import { noticeRouter } from "./routes/notices.js";
import { penaltyRouter } from "./routes/penalties.js";
import { ratingRouter } from "./routes/ratings.js";
import { monitoringRouter } from "./routes/monitoring.js";
import { bulkRouter } from "./routes/bulk.js";
import uploadRouter from "./routes/uploads.js";
import { centralizedErrorHandlerMiddleware } from "./middleware/centralizedErrorHandler.js";
import { databaseRouter } from "./routes/database.js";

// Rate limiting middleware
import { authLimiter, adminBypass } from "./middleware/rateLimiter.js";
import {
  smartRateLimiter,
  paymentLimiter,
  adminLimiter,
  uploadLimiter,
} from "./middleware/enhancedRateLimiter.js";

// Session management
import { sessionMiddleware } from "./middleware/session.js";
import { requestLogger, errorLogger } from "./utils/logger.js";
import { formatResponse } from "./middleware/apiVersioning.js";

// Circuit breaker & Load balancer routes
import { circuitBreakerRouter } from "./routes/circuitBreaker.js";
import { testCircuitBreakerRouter } from "./routes/testCircuitBreaker.js";
import { loadBalancerRouter } from "./routes/loadBalancer.js";
import {
  performanceMiddleware,
  memoryTrackingMiddleware,
  errorTrackingMiddleware,
} from "./middleware/performanceMonitoring.js";

// Load balancer middleware
import {
  ensureStateless,
  stickySessionAlternative,
  loadBalancerHeaders,
  gracefulShutdown,
} from "./middleware/loadBalancer.js";
import { loadBalancerService } from "./services/loadBalancerService.js";
import logger, { morganStream } from "./utils/logger.js";
import { initializeCronJobs } from "./jobs/cronJobs.js";
import environmentValidator from "./services/environmentValidator.js";

// Additional feature routes
import { reportsRouter } from "./routes/reports.js";
import { settingsRouter } from "./routes/settings.js";
import { agentRouter } from "./routes/agents.js";
import { agentAuthRouter } from "./routes/agentAuth.js";
import { caretakerRouter } from "./routes/caretakers.js";
import { messagingRouter } from "./routes/messaging.js";
import { propertySalesRouter } from "./routes/propertySales.js";
import { customizationRouter } from "./routes/customization.js";
import { exportsRouter } from "./routes/exports.js";
import { jobsRouter } from "./routes/jobs.js";
import { twoFactorRouter } from "./routes/2fa.js";
import { mpesaRouter } from "./routes/mpesa.js";
import { pesapalRouter } from "./routes/pesapal.js";
import { kcbRouter } from "./routes/kcb.js";
import { memoryRouter } from "./routes/memory.js";
import { expenseRouter } from "./routes/expenses.js";
import { errorRouter } from "./routes/errors.js";

// Validate environment before starting server
logger.info("🔍 Validating environment configuration...");
try {
  const validationResult = await environmentValidator.validateEnvironment();

  if (!validationResult.valid) {
    logger.error("❌ Environment validation failed:");
    console.error(environmentValidator.formatValidationResults());

    if (process.env.NODE_ENV === "production") {
      logger.error(
        "🚫 Server startup aborted due to environment validation failures"
      );
      process.exit(1);
    } else {
      logger.warn(
        "⚠️ Continuing in development mode despite validation failures"
      );
    }
  } else {
    logger.info("✅ Environment validation passed successfully");
    if (validationResult.hasWarnings) {
      logger.warn("⚠️ Environment validation completed with warnings:");
      validationResult.warnings.forEach((warning) => {
        logger.warn(`  - ${warning}`);
      });
    }
  }
} catch (error) {
  logger.error("❌ Environment validation process failed:", error);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

// Initialize cron jobs for automated tasks
if (config.features.cronJobs) {
  try {
    initializeCronJobs();
    logger.info("Cron jobs initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize cron jobs:", error);
  }
}

// Initialize Redis Cloud connection
logger.info("Initializing Redis Cloud connection...");
try {
  const redisClient = await import("./config/redis.js");
  await redisClient.default.connect();
  if (redisClient.default.isReady()) {
    logger.info("✅ Redis Cloud connected successfully");

    // Initialize Redis store for rate limiting
    const { initializeRedisStore } = await import(
      "./middleware/rateLimiter.js"
    );
    initializeRedisStore();

    // Initialize cache service
    const cacheService = await import("./services/cacheService.js");
    await cacheService.default.initialize();
  } else {
    logger.warn("⚠️ Redis Cloud connection not ready, using fallback");
  }
} catch (error) {
  logger.warn(
    "⚠️ Redis Cloud connection failed, using in-memory fallback:",
    error.message
  );
}

// Initialize memory monitoring (production only for better CPU performance)
if (process.env.NODE_ENV === "production") {
  try {
    const memoryOptimizer = await import("./services/memoryOptimizer.js");

    if (config.features.memoryMonitoring) {
      try {
        memoryOptimizer.default.startMonitoring(300000); // Monitor every 5 minutes
        logger.info("✅ Memory monitoring initialized");
      } catch (error) {
        logger.error("Failed to initialize memory monitoring:", error);
      }
    }
  } catch (error) {
    logger.error("Failed to import memory optimizer:", error);
  }
} else {
  logger.info(
    "Memory monitoring disabled in development for better performance"
  );
}

const app = express();

// Security middleware with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || "http://localhost:5173",
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Logging middleware with Winston (using 'tiny' in dev for less CPU overhead)
app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "tiny", {
    stream: morganStream,
  })
);

// Session middleware for stateless sessions
app.use(sessionMiddleware);

// Enhanced rate limiting with granular policies
app.use("/api/", smartRateLimiter);
app.use(adminBypass);

// CORS with more restrictive settings
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Security Hardening: Lower global body limit to 100kb to prevent DoS.
// Specific routes like /uploads should handle larger files via multer or specific middleware.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());

// Add response wrapper middleware
app.use(responseWrapper);

// Add request logging middleware
app.use(requestLogger);

// Add response formatting middleware
app.use("/api", formatResponse);

// Performance monitoring middleware (disabled in development for better CPU performance)
if (process.env.NODE_ENV === "production") {
  app.use(performanceMiddleware);
  app.use(memoryTrackingMiddleware);
}

// Load balancer middleware
app.use(loadBalancerHeaders);
app.use(ensureStateless);
app.use(stickySessionAlternative);
app.use((req, res, next) => {
  try {
    if (
      loadBalancerService &&
      typeof loadBalancerService.trackRequest === "function"
    ) {
      loadBalancerService.trackRequest(req, res);
    }
  } catch (trackingError) {
    console.warn(
      "⚠️ Load balancer request tracking failed:",
      trackingError.message
    );
  }
  next();
});
app.use(gracefulShutdown());

// Basic health check (public endpoint)
app.get("/health", async (_req, res) => {
  try {
    const { healthCheck } = await import("./services/healthCheck.js");
    const liveness = healthCheck.isAlive();
    res.json({
      success: true,
      status: "OK",
      timestamp: new Date().toISOString(),
      ...liveness,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Comprehensive health check (public endpoint)
app.get("/health/detailed", async (_req, res) => {
  try {
    // Get database status
    const { getDatabaseHealth, getDatabaseStatus } = await import("./db.js");
    const dbHealth = await getDatabaseHealth();
    const dbStatus = getDatabaseStatus();

    const healthStatus = {
      status: dbHealth.status === "healthy" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.status,
          message: dbHealth.message,
          responseTime: dbHealth.responseTime,
          connectionStatus: dbStatus,
        },
        server: {
          status: "healthy",
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid,
        },
      },
    };

    const statusCode = healthStatus.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: "critical",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Readiness check for load balancers (public endpoint)
app.get("/ready", async (_req, res) => {
  try {
    const { healthCheck } = await import("./services/healthCheck.js");
    const readiness = await healthCheck.isReady();

    res.set({
      "X-Health-Check": "readiness",
      "X-Service-Version": process.env.npm_package_version || "1.0.0",
      "X-Instance-Id": process.env.INSTANCE_ID || process.pid.toString(),
    });

    res.status(readiness.ready ? 200 : 503).json({
      ...readiness,
      instanceId: process.env.INSTANCE_ID || process.pid.toString(),
      version: process.env.npm_package_version || "1.0.0",
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      status: "critical",
      instanceId: process.env.INSTANCE_ID || process.pid.toString(),
    });
  }
});

// Liveness check for container orchestration (public endpoint)
app.get("/alive", (_req, res) => {
  try {
    res.set({
      "X-Health-Check": "liveness",
      "X-Service-Version": process.env.npm_package_version || "1.0.0",
      "X-Instance-Id": process.env.INSTANCE_ID || process.pid.toString(),
    });

    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      instanceId: process.env.INSTANCE_ID || process.pid.toString(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    });
  } catch (error) {
    res.status(500).json({
      alive: false,
      error: error.message,
      instanceId: process.env.INSTANCE_ID || process.pid.toString(),
    });
  }
});

// API routes without versioning
const apiRouter = express.Router();

try {
  // Simple test route to verify server is working
  apiRouter.get("/test", (req, res) => {
    res.json({
      success: true,
      message: "Server is running with database support",
      timestamp: new Date().toISOString(),
    });
  });

  // Database testing routes
  apiRouter.use("/database", databaseRouter);

  // Core routes with specific rate limiting
  apiRouter.use("/auth", authLimiter, authRouter);
  apiRouter.use("/users", adminLimiter, usersRouter);
  apiRouter.use("/dashboard", dashboardRouter);
  apiRouter.use("/properties", propertyRouter);
  apiRouter.use("/tenants", tenantRouter);
  apiRouter.use("/units", unitRouter);
  apiRouter.use("/agencies", agencyRouter);

  // Financial routes with payment-specific rate limiting
  apiRouter.use("/leases", leaseRouter);
  apiRouter.use("/payments", paymentLimiter, paymentRouter);
  apiRouter.use("/invoices", invoiceRouter);
  apiRouter.use("/expenses", expenseRouter);

  // Advanced business feature routes
  apiRouter.use("/notices", noticeRouter);
  apiRouter.use("/penalties", penaltyRouter);
  apiRouter.use("/ratings", ratingRouter);
  apiRouter.use("/uploads", uploadLimiter, uploadRouter);
  apiRouter.use("/monitoring", monitoringRouter);
  apiRouter.use("/bulk", bulkRouter);

  // Agency and user management routes
  apiRouter.use("/settings", settingsRouter);
  apiRouter.use("/agents", agentRouter);
  apiRouter.use("/agent-auth", agentAuthRouter);
  apiRouter.use("/caretakers", caretakerRouter);
  apiRouter.use("/messages", messagingRouter);

  // Reporting and analytics routes
  apiRouter.use("/reports", reportsRouter);
  apiRouter.use("/property-sales", propertySalesRouter);

  // System and utility routes
  apiRouter.use("/customization", customizationRouter);
  apiRouter.use("/exports", exportsRouter);
  apiRouter.use("/jobs", jobsRouter);
  apiRouter.use("/memory", memoryRouter);
  apiRouter.use("/circuit-breaker", circuitBreakerRouter);
  apiRouter.use("/test-circuit-breaker", testCircuitBreakerRouter);
  apiRouter.use("/load-balancer", loadBalancerRouter);
  apiRouter.use("/errors", errorRouter);
  apiRouter.use("/logs", errorRouter);

  // Payment integration routes with strict rate limiting
  apiRouter.use("/2fa", authLimiter, twoFactorRouter);
  apiRouter.use("/mpesa", paymentLimiter, mpesaRouter);
  apiRouter.use("/pesapal", paymentLimiter, pesapalRouter);
  apiRouter.use("/kcb", paymentLimiter, kcbRouter);

  logger.info("🎉 All routes enabled - Complete system ready");
} catch (error) {
  logger.error("❌ CRITICAL ERROR - Failed to mount API routes:", error);
  throw error;
}

// Mount API router
app.use("/api", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path,
  });
});

// Performance error tracking (before global error handler)
app.use(errorTrackingMiddleware);

// Error logging middleware
app.use(errorLogger);

// Centralized error handler (must be last)
app.use(centralizedErrorHandlerMiddleware);

// Wrap server startup in try-catch
const port = config.PORT;

try {
  const server = app.listen(port, () => {
    logger.info(`🚀 API listening on port ${port}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`🔗 API: http://localhost:${port}/api`);
  });

  // Handle server errors
  server.on("error", (error) => {
    logger.error("Server error:", error);
    if (error.code === "EADDRINUSE") {
      logger.error(`Port ${port} is already in use`);
      process.exit(1);
    }
  });

  // Graceful shutdown handlers
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  });
} catch (error) {
  logger.error("❌ CRITICAL ERROR - Failed to start server:", error);
  process.exit(1);
}
