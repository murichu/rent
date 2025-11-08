import { Router } from "express";
import { 
  testDatabaseConnection, 
  getDatabaseHealth, 
  getDatabaseStatus,
  getConnectionPoolStats 
} from "../db.js";
import logger from "../utils/logger.js";

export const databaseRouter = Router();

/**
 * Test database connection
 * GET /api/v1/database/test
 */
databaseRouter.get("/test", async (req, res) => {
  try {
    logger.info('Testing database connection via API...');
    const result = await testDatabaseConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: "Database connection test successful",
        connectionTime: result.connectionTime,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        message: "Database connection test failed",
        error: result.error,
        code: result.code,
        connectionTime: result.connectionTime,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Database test API error:', error);
    res.status(500).json({
      success: false,
      message: "Database test failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get database health status
 * GET /api/v1/database/health
 */
databaseRouter.get("/health", async (req, res) => {
  try {
    const health = await getDatabaseHealth();
    const status = getDatabaseStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'disconnected' ? 503 : 500;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      health,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database health API error:', error);
    res.status(500).json({
      success: false,
      message: "Database health check failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get database connection status
 * GET /api/v1/database/status
 */
databaseRouter.get("/status", (req, res) => {
  try {
    const status = getDatabaseStatus();
    const poolStats = getConnectionPoolStats();
    
    res.json({
      success: true,
      status,
      poolStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database status API error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get database status",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Force database connection
 * POST /api/v1/database/connect
 */
databaseRouter.post("/connect", async (req, res) => {
  try {
    logger.info('Forcing database connection via API...');
    const { databaseConnection } = await import("../services/databaseConnection.js");
    
    await databaseConnection.connectWithRetry();
    
    res.json({
      success: true,
      message: "Database connected successfully",
      status: databaseConnection.getStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database connect API error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to connect to database",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Disconnect from database
 * POST /api/v1/database/disconnect
 */
databaseRouter.post("/disconnect", async (req, res) => {
  try {
    logger.info('Disconnecting from database via API...');
    const { databaseConnection } = await import("../services/databaseConnection.js");
    
    await databaseConnection.disconnect();
    
    res.json({
      success: true,
      message: "Database disconnected successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database disconnect API error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to disconnect from database",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default databaseRouter;