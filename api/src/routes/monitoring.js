import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getConnectionPoolStats, resetConnectionPoolStats, prisma } from "../db.js";
import { performanceMetrics } from "../services/performanceMetrics.js";
import { databaseMonitoring } from "../services/databaseMonitoring.js";
import { systemMonitoring } from "../services/systemMonitoring.js";
import { healthCheck } from "../services/healthCheck.js";
import { performanceAnalytics } from "../services/performanceAnalytics.js";
import { alertSystem } from "../services/alertSystem.js";
import { monitoringDashboard } from "../services/monitoringDashboard.js";

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

// Performance Analytics Endpoints

// Get performance trends analysis
monitoringRouter.get("/analytics/trends", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 24 * 60 * 60 * 1000; // Default 24 hours
    const trends = await performanceAnalytics.analyzePerformanceTrends(timeWindow);
    
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze performance trends" });
  }
});

// Get performance bottlenecks
monitoringRouter.get("/analytics/bottlenecks", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 24 * 60 * 60 * 1000; // Default 24 hours
    const bottlenecks = await performanceAnalytics.identifyBottlenecks(timeWindow);
    
    res.json(bottlenecks);
  } catch (error) {
    res.status(500).json({ error: "Failed to identify bottlenecks" });
  }
});

// Get capacity planning metrics
monitoringRouter.get("/analytics/capacity", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 7 * 24 * 60 * 60 * 1000; // Default 7 days
    const capacity = await performanceAnalytics.generateCapacityMetrics(timeWindow);
    
    res.json(capacity);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate capacity metrics" });
  }
});

// Get daily performance reports
monitoringRouter.get("/analytics/daily-reports", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const limit = parseInt(req.query.limit) || 30;
    const reports = performanceAnalytics.getDailyReports(limit);
    
    res.json({
      reports,
      count: reports.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch daily reports" });
  }
});

// Generate daily report on demand
monitoringRouter.post("/analytics/generate-report", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const report = await performanceAnalytics.generateDailyReport();
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate daily report" });
  }
});

// Get capacity planning history
monitoringRouter.get("/analytics/capacity-history", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const limit = parseInt(req.query.limit) || 30;
    const history = performanceAnalytics.getCapacityHistory(limit);
    
    res.json({
      history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch capacity history" });
  }
});

// Alert System Endpoints

// Get active alerts
monitoringRouter.get("/alerts", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const severity = req.query.severity;
    const alerts = alertSystem.getActiveAlerts(severity);
    
    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active alerts" });
  }
});

// Get alert history
monitoringRouter.get("/alerts/history", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const limit = parseInt(req.query.limit) || 100;
    const severity = req.query.severity;
    const history = alertSystem.getAlertHistory(limit, severity);
    
    res.json({
      history,
      count: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alert history" });
  }
});

// Get alert statistics
monitoringRouter.get("/alerts/statistics", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 24 * 60 * 60 * 1000; // Default 24 hours
    const stats = alertSystem.getAlertStatistics(timeWindow);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alert statistics" });
  }
});

// Acknowledge alert
monitoringRouter.post("/alerts/:alertId/acknowledge", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { alertId } = req.params;
    const acknowledgedBy = req.user.id;
    
    const alert = alertSystem.acknowledgeAlert(alertId, acknowledgedBy);
    
    res.json({
      message: "Alert acknowledged successfully",
      alert
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resolve alert
monitoringRouter.post("/alerts/:alertId/resolve", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { alertId } = req.params;
    const resolvedBy = req.user.id;
    
    const alert = alertSystem.resolveAlert(alertId, resolvedBy);
    
    res.json({
      message: "Alert resolved successfully",
      alert
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get alert rules
monitoringRouter.get("/alerts/rules", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const rules = alertSystem.getAlertRules();
    
    res.json({
      rules,
      count: rules.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alert rules" });
  }
});

// Create alert rule
monitoringRouter.post("/alerts/rules", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const rule = req.body;
    
    // Validate required fields
    if (!rule.id || !rule.name || !rule.type || !rule.severity || !rule.threshold) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    alertSystem.addAlertRule(rule);
    
    res.status(201).json({
      message: "Alert rule created successfully",
      rule
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update alert rule
monitoringRouter.put("/alerts/rules/:ruleId", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { ruleId } = req.params;
    const updates = req.body;
    
    const rule = alertSystem.updateAlertRule(ruleId, updates);
    
    res.json({
      message: "Alert rule updated successfully",
      rule
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete alert rule
monitoringRouter.delete("/alerts/rules/:ruleId", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { ruleId } = req.params;
    
    alertSystem.deleteAlertRule(ruleId);
    
    res.json({
      message: "Alert rule deleted successfully"
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get escalation policies
monitoringRouter.get("/alerts/escalation-policies", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const policies = alertSystem.getEscalationPolicies();
    
    res.json({
      policies,
      count: policies.length
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch escalation policies" });
  }
});

// Get alert health summary
monitoringRouter.get("/alerts/health-summary", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const summary = alertSystem.getHealthSummary();
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch alert health summary" });
  }
});

// Monitoring Dashboard Endpoints

// Get comprehensive dashboard data
monitoringRouter.get("/dashboard", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const timeWindow = parseInt(req.query.timeWindow) || 60 * 60 * 1000; // Default 1 hour
    const dashboardData = await monitoringDashboard.getDashboardData(timeWindow);
    
    res.json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// Get real-time metrics
monitoringRouter.get("/dashboard/realtime", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const realtimeData = await monitoringDashboard.getRealtimeMetrics();
    
    res.json(realtimeData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch real-time metrics" });
  }
});

// Get dashboard configuration
monitoringRouter.get("/dashboard/config", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const config = monitoringDashboard.getDashboardConfig();
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard configuration" });
  }
});

// Register real-time client
monitoringRouter.post("/dashboard/realtime/register", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const clientId = req.body.clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    monitoringDashboard.registerRealtimeClient(clientId);
    
    res.json({
      message: "Real-time client registered successfully",
      clientId
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to register real-time client" });
  }
});

// Unregister real-time client
monitoringRouter.post("/dashboard/realtime/unregister", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required" });
    }

    monitoringDashboard.unregisterRealtimeClient(clientId);
    
    res.json({
      message: "Real-time client unregistered successfully"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to unregister real-time client" });
  }
});

// Clear dashboard cache
monitoringRouter.post("/dashboard/cache/clear", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    monitoringDashboard.clearCache();
    
    res.json({
      message: "Dashboard cache cleared successfully"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear dashboard cache" });
  }
});

// Get dashboard cache statistics
monitoringRouter.get("/dashboard/cache/stats", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const stats = monitoringDashboard.getCacheStats();
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cache statistics" });
  }
});