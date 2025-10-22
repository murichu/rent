import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth.js";
import { propertyRouter } from "./routes/properties.js";
import { tenantRouter } from "./routes/tenants.js";
import { leaseRouter } from "./routes/leases.js";
import { paymentRouter } from "./routes/payments.js";
import { agencyRouter } from "./routes/agencies.js";
import { usersRouter } from "./routes/users.js";
import { invoiceRouter } from "./routes/invoices.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { unitRouter } from "./routes/units.js";
import { noticeRouter } from "./routes/notices.js";
import { penaltyRouter } from "./routes/penalties.js";
import { ratingRouter } from "./routes/ratings.js";
import { monitoringRouter } from "./routes/monitoring.js";
import { bulkRouter } from "./routes/bulk.js";
import cacheRouter from "./routes/cache.js";
import cacheManager from "./services/cacheManager.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { enhancedApiLimiter, authLimiter, adminBypass } from "./middleware/rateLimiter.js";
import { sessionMiddleware, loadSessionMiddleware } from "./middleware/session.js";
import { circuitBreakerRouter } from "./routes/circuitBreaker.js";
import { testCircuitBreakerRouter } from "./routes/testCircuitBreaker.js";
import { loadBalancerRouter } from "./routes/loadBalancer.js";
import { performanceMiddleware, memoryTrackingMiddleware, errorTrackingMiddleware } from "./middleware/performanceMonitoring.js";
import { ensureStateless, stickySessionAlternative, loadBalancerHeaders, gracefulShutdown } from "./middleware/loadBalancer.js";
import { loadBalancerService } from "./services/loadBalancerService.js";
import logger, { morganStream } from "./utils/logger.js";
import { initializeCronJobs } from "./jobs/cronJobs.js";

dotenv.config();

// Initialize cron jobs for automated tasks
if (process.env.ENABLE_CRON_JOBS !== 'false') {
  initializeCronJobs();
}

// Initialize cache manager
cacheManager.initialize().catch(error => {
  logger.error('Failed to initialize cache manager:', error);
});

const app = express();

// Security middleware with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:5173"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Logging middleware with Winston
app.use(morgan(
  process.env.NODE_ENV === "production" 
    ? "combined" 
    : "dev",
  { stream: morganStream }
));

// Session middleware for stateless sessions
app.use(sessionMiddleware);
app.use(loadSessionMiddleware);

// Enhanced rate limiting with user-based limits and admin bypass
app.use('/api/', enhancedApiLimiter);
app.use(adminBypass);

// CORS with more restrictive settings
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Performance monitoring middleware
app.use(performanceMiddleware);
app.use(memoryTrackingMiddleware);

// Load balancer middleware
app.use(loadBalancerHeaders);
app.use(ensureStateless);
app.use(stickySessionAlternative);
app.use((req, res, next) => {
  loadBalancerService.trackRequest(req, res);
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
      status: 'OK', 
      timestamp: new Date().toISOString(),
      ...liveness
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Comprehensive health check (public endpoint)
app.get("/health/detailed", async (_req, res) => {
  try {
    const { healthCheck } = await import("./services/healthCheck.js");
    const healthStatus = await healthCheck.performHealthCheck();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: "critical",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check for load balancers (public endpoint)
app.get("/ready", async (_req, res) => {
  try {
    const { healthCheck } = await import("./services/healthCheck.js");
    const readiness = await healthCheck.isReady();
    
    // Add load balancer specific headers
    res.set({
      'X-Health-Check': 'readiness',
      'X-Service-Version': process.env.npm_package_version || '1.0.0',
      'X-Instance-Id': process.env.INSTANCE_ID || process.pid.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    res.status(readiness.ready ? 200 : 503).json({
      ...readiness,
      instanceId: process.env.INSTANCE_ID || process.pid.toString(),
      version: process.env.npm_package_version || '1.0.0',
      loadBalancerReady: readiness.ready
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      status: "critical",
      instanceId: process.env.INSTANCE_ID || process.pid.toString(),
      loadBalancerReady: false
    });
  }
});

// Liveness check for container orchestration (public endpoint)
app.get("/alive", (_req, res) => {
  try {
    // Add load balancer specific headers
    res.set({
      'X-Health-Check': 'liveness',
      'X-Service-Version': process.env.npm_package_version || '1.0.0',
      'X-Instance-Id': process.env.INSTANCE_ID || process.pid.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
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
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    res.status(500).json({
      alive: false,
      error: error.message,
      instanceId: process.env.INSTANCE_ID || process.pid.toString()
    });
  }
});

// API v1 routes with versioning
const v1Router = express.Router();

// Apply auth rate limiter to auth routes
v1Router.use("/auth", authLimiter, authRouter);

// API routes
v1Router.use("/properties", propertyRouter);
v1Router.use("/tenants", tenantRouter);
v1Router.use("/leases", leaseRouter);
v1Router.use("/payments", paymentRouter);
v1Router.use("/agencies", agencyRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/invoices", invoiceRouter);
v1Router.use("/dashboard", dashboardRouter);
v1Router.use("/units", unitRouter);
v1Router.use("/notices", noticeRouter);
v1Router.use("/penalties", penaltyRouter);
v1Router.use("/ratings", ratingRouter);
v1Router.use("/monitoring", monitoringRouter);
v1Router.use("/bulk", bulkRouter);
v1Router.use("/cache", cacheRouter);
v1Router.use("/circuit-breakers", circuitBreakerRouter);
v1Router.use("/test-circuit-breaker", testCircuitBreakerRouter);
v1Router.use("/load-balancer", loadBalancerRouter);
// TODO: Add these routers when implemented
// v1Router.use("/2fa", twoFactorRouter);
// v1Router.use("/mpesa", mpesaRouter);
// v1Router.use("/kcb", kcbRouter);
// v1Router.use("/pesapal", pesapalRouter);

// Mount v1 router
app.use("/api/v1", v1Router);

// Legacy routes (backward compatibility) - will be deprecated
app.use("/auth", authLimiter, authRouter);
app.use("/properties", propertyRouter);
app.use("/tenants", tenantRouter);
app.use("/leases", leaseRouter);
app.use("/payments", paymentRouter);
app.use("/agencies", agencyRouter);
app.use("/users", usersRouter);
app.use("/invoices", invoiceRouter);
app.use("/dashboard", dashboardRouter);
app.use("/units", unitRouter);
app.use("/notices", noticeRouter);
app.use("/penalties", penaltyRouter);
app.use("/ratings", ratingRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path
  });
});

// Performance error tracking (before global error handler)
app.use(errorTrackingMiddleware);

// Global error handler (must be last)
app.use(errorHandler);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  logger.info(`🚀 API listening on port ${port}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🔗 API v1: http://localhost:${port}/api/v1`);
});
