import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import cacheManager from "../services/cacheManager.js";
import cacheService from "../services/cache.js";
import dashboardCacheService from "../services/dashboardCache.js";
import cacheWarmingService from "../services/cacheWarming.js";
import logger from "../utils/logger.js";

export const cacheRouter = Router();

cacheRouter.use(requireAuth);

// Get cache statistics and health
cacheRouter.get("/stats", async (req, res) => {
  try {
    const stats = await cacheManager.getCacheStatistics();
    
    if (!stats) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to retrieve cache statistics" 
      });
    }
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Cache stats endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch cache statistics" 
    });
  }
});

// Get cache health check
cacheRouter.get("/health", async (req, res) => {
  try {
    const health = await cacheService.healthCheck();
    const isHealthy = health.status === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: health
    });
  } catch (error) {
    logger.error('Cache health endpoint error:', error);
    res.status(503).json({ 
      success: false, 
      error: "Cache health check failed" 
    });
  }
});

// Get dashboard cache statistics for current agency
cacheRouter.get("/dashboard/stats", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const stats = await dashboardCacheService.getDashboardCacheStats(agencyId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Dashboard cache stats endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch dashboard cache statistics" 
    });
  }
});

// Warm cache for current agency
cacheRouter.post("/warm", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { cacheType = 'all' } = req.body;
    
    const result = await cacheManager.warmCacheForAgency(agencyId, cacheType);
    
    if (result) {
      res.json({
        success: true,
        message: `Cache warming initiated for ${cacheType === 'all' ? 'all caches' : cacheType + ' cache'}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to initiate cache warming"
      });
    }
  } catch (error) {
    logger.error('Cache warming endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to warm cache" 
    });
  }
});

// Get cache warming progress
cacheRouter.get("/warm/progress", async (req, res) => {
  try {
    const progress = cacheWarmingService.getWarmingProgress();
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Cache warming progress endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get warming progress" 
    });
  }
});

// Invalidate cache for current agency
cacheRouter.delete("/invalidate", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { cacheType, dataType } = req.body;
    
    let result;
    
    if (dataType) {
      // Invalidate by data type (property, tenant, payment, etc.)
      result = await cacheManager.invalidateByDataType(agencyId, dataType);
    } else if (cacheType) {
      // Invalidate specific cache type
      await dashboardCacheService.invalidateDashboardCache(agencyId, cacheType);
      result = true;
    } else {
      // Invalidate all caches for agency
      result = await cacheManager.invalidateAgencyCache(agencyId);
    }
    
    if (result) {
      res.json({
        success: true,
        message: "Cache invalidated successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to invalidate cache"
      });
    }
  } catch (error) {
    logger.error('Cache invalidation endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to invalidate cache" 
    });
  }
});

// Manual cleanup (admin only)
cacheRouter.post("/cleanup", async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: "Admin access required"
      });
    }
    
    const result = await cacheManager.performCleanup();
    
    res.json({
      success: true,
      message: "Cache cleanup completed",
      data: result
    });
  } catch (error) {
    logger.error('Cache cleanup endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to perform cache cleanup" 
    });
  }
});

// Flush all caches (admin only)
cacheRouter.delete("/flush", async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: "Admin access required"
      });
    }
    
    const result = await cacheManager.invalidateAllCaches();
    
    if (result) {
      res.json({
        success: true,
        message: "All caches flushed successfully"
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to flush caches"
      });
    }
  } catch (error) {
    logger.error('Cache flush endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to flush caches" 
    });
  }
});

// Warm all agencies cache (admin only)
cacheRouter.post("/warm/all", async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: "Admin access required"
      });
    }
    
    // Start warming process asynchronously
    cacheWarmingService.warmAllCaches().then(result => {
      logger.info(`Global cache warming completed: ${result ? 'success' : 'failed'}`);
    }).catch(error => {
      logger.error('Global cache warming failed:', error);
    });
    
    res.json({
      success: true,
      message: "Global cache warming initiated"
    });
  } catch (error) {
    logger.error('Global cache warming endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to initiate global cache warming" 
    });
  }
});

// Get cache configuration
cacheRouter.get("/config", async (req, res) => {
  try {
    const config = {
      keyPrefixes: cacheService.keyPrefixes,
      defaultTTL: cacheService.defaultTTL,
      isConnected: cacheService.isConnected,
      redisConfig: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        db: parseInt(process.env.REDIS_DB) || 0
      }
    };
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Cache config endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get cache configuration" 
    });
  }
});

export default cacheRouter;