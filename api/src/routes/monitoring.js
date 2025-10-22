import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getConnectionPoolStats, resetConnectionPoolStats, prisma } from "../db.js";
import { performanceMetrics } from "../services/performanceMetrics.js";
import { databaseMonitoring } from "../services/databaseMonitoring.js";
import { systemMonitoring } from "../services/systemMonitoring.js";
import { healthCheck } from "../services/healthCheck.js";
import cacheManager from "../services/cacheManager.js";

export const monitoringRouter = Router();

// Require authentication for monitoring endpoints
monitoringRouter.use(requireAuth);

// Get comprehensive database performance statistics
monitoringRouter.get("/db-stats", async (req, res) => {
  try {
    // Only allow admin users to view database statistics
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const stats = databaseMonitoring.getPerformanceStats(timeWindow);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch database statistics" });
  }
});

// Get slow database queries
monitoringRouter.get("/db-slow-queries", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const slowQueries = databaseMonitoring.getSlowQueries(limit, timeWindow);
    
    res.json(slowQueries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch slow queries" });
  }
});

// Get legacy database connection pool statistics (for backward compatibility)
monitoringRouter.get("/db-pool-stats", async (req, res) => {
  try {
    // Only allow admin users to view database statistics
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const stats = getConnectionPoolStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch database statistics" });
  }
});

// Reset database statistics (admin only)
monitoringRouter.post("/db-stats/reset", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    resetConnectionPoolStats();
    databaseMonitoring.reset();
    res.json({ message: "Database statistics reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset database statistics" });
  }
});

// Performance overview endpoint
monitoringRouter.get("/performance", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const overview = performanceMetrics.getPerformanceOverview(timeWindow);
    
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

// API response time statistics
monitoringRouter.get("/api-stats", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const stats = performanceMetrics.getApiStats(timeWindow);
    
    res.json({
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      endpoints: stats
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch API statistics" });
  }
});

// Slow requests endpoint
monitoringRouter.get("/slow-requests", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const limit = parseInt(req.query.limit) || 100;
    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const slowRequests = performanceMetrics.getSlowRequests(limit, timeWindow);
    
    res.json({
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      slowRequests
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch slow requests" });
  }
});

// Endpoint-specific performance report
monitoringRouter.get("/endpoint/:method/:path(*)", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const endpoint = `${req.params.method.toUpperCase()} /${req.params.path}`;
    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const report = performanceMetrics.generateEndpointReport(endpoint, timeWindow);
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate endpoint report" });
  }
});

// System memory usage statistics
monitoringRouter.get("/memory", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const memoryStats = systemMonitoring.getMemoryStats(timeWindow);
    
    res.json(memoryStats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch memory statistics" });
  }
});

// CPU usage statistics
monitoringRouter.get("/cpu", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const cpuStats = systemMonitoring.getCpuStats(timeWindow);
    
    res.json(cpuStats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch CPU statistics" });
  }
});

// Garbage collection statistics
monitoringRouter.get("/gc", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const gcStats = systemMonitoring.getGcStats(timeWindow);
    
    res.json(gcStats || { message: "Garbage collection monitoring not available" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch GC statistics" });
  }
});

// System information
monitoringRouter.get("/system-info", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const systemInfo = systemMonitoring.getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch system information" });
  }
});

// Error statistics
monitoringRouter.get("/errors", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 3600000; // Default 1 hour
    const errorStats = performanceMetrics.getErrorStats(timeWindow);
    
    res.json({
      timeWindow: timeWindow / 1000,
      timestamp: new Date().toISOString(),
      ...errorStats
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch error statistics" });
  }
});

// Comprehensive health check endpoint
monitoringRouter.get("/health", async (req, res) => {
  try {
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

// Readiness check endpoint (for load balancers)
monitoringRouter.get("/ready", async (req, res) => {
  try {
    const readiness = await healthCheck.isReady();
    
    res.status(readiness.ready ? 200 : 503).json(readiness);
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      status: "critical"
    });
  }
});

// Liveness check endpoint (for container orchestration)
monitoringRouter.get("/alive", (req, res) => {
  try {
    const liveness = healthCheck.isAlive();
    res.json(liveness);
  } catch (error) {
    res.status(500).json({
      alive: false,
      error: error.message
    });
  }
});

// System status with detailed information
monitoringRouter.get("/status", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const systemStatus = await healthCheck.getSystemStatus();
    res.json(systemStatus);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch system status" });
  }
});

// Health check history
monitoringRouter.get("/health-history", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const limit = parseInt(req.query.limit) || 10;
    const history = healthCheck.getHealthHistory(limit);
    
    res.json({
      history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch health history" });
  }
});

// Health check summary for dashboards
monitoringRouter.get("/health-summary", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const summary = await healthCheck.getHealthSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch health summary" });
  }
});

// Service-specific health check
monitoringRouter.get("/health/:service", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const serviceName = req.params.service;
    const serviceHealth = await healthCheck.getServiceHealth(serviceName);
    
    if (serviceHealth.error) {
      return res.status(404).json(serviceHealth);
    }
    
    const statusCode = serviceHealth.status === 'healthy' ? 200 : 
                      serviceHealth.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(serviceHealth);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch service health" });
  }
});

// Check if system can handle new requests
monitoringRouter.get("/can-handle-requests", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const canHandle = await healthCheck.canHandleRequests();
    
    res.status(canHandle.canHandle ? 200 : 503).json(canHandle);
  } catch (error) {
    res.status(500).json({ error: "Failed to check request handling capability" });
  }
});