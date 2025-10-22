import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDashboardDataOptimized, queryTimeMiddleware } from "../services/queryOptimizer.js";
import dashboardCacheService from "../services/dashboardCache.js";
import { cacheMiddleware, invalidateCacheMiddleware, cacheInvalidationPatterns } from "../middleware/cache.js";
import logger from "../utils/logger.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(queryTimeMiddleware);

// Optimized dashboard endpoint combining both me and agency data
dashboardRouter.get("/", 
  cacheMiddleware({ 
    ttl: 300, // 5 minutes
    keyGenerator: (req) => `dashboard:${req.user.agencyId}:main`
  }),
  async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      
      // Try to get cached dashboard data first
      const cachedStats = await dashboardCacheService.getDashboardStats(agencyId);
      
      if (cachedStats) {
        logger.info(`Dashboard cache hit for agency ${agencyId}`);
        return res.json(cachedStats);
      }
      
      // If not cached, fetch from database
      const dashboardData = await getDashboardDataOptimized(agencyId);
      
      // Cache the dashboard data
      await dashboardCacheService.setDashboardStats(agencyId, dashboardData);
      
      // Warm other dashboard caches asynchronously
      dashboardCacheService.warmDashboardCache(agencyId, {
        stats: dashboardData,
        recentPayments: dashboardData.recentPayments,
        recentActivities: dashboardData.recentActivities || [],
        financialSummary: {
          totalRevenue: dashboardData.totalRevenue || 0,
          monthlyRevenue: dashboardData.monthlyRevenue || 0,
          pendingPayments: dashboardData.pendingPayments || 0
        },
        occupancyRate: {
          occupied: dashboardData.properties?.occupied || 0,
          total: dashboardData.properties?.total || 0,
          rate: dashboardData.properties?.total > 0 
            ? ((dashboardData.properties.occupied / dashboardData.properties.total) * 100).toFixed(2)
            : 0
        }
      }).catch(error => {
        logger.error('Failed to warm dashboard cache:', error);
      });
      
      res.json(dashboardData);
    } catch (error) {
      logger.error('Dashboard endpoint error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  }
);

// Legacy endpoints for backward compatibility
dashboardRouter.get("/me", 
  cacheMiddleware({ 
    ttl: 300,
    keyGenerator: (req) => `dashboard:${req.user.agencyId}:summary`
  }),
  async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      
      // Try to get from cache first
      const cachedStats = await dashboardCacheService.getDashboardStats(agencyId);
      let dashboardData;
      
      if (cachedStats) {
        dashboardData = cachedStats;
      } else {
        dashboardData = await getDashboardDataOptimized(agencyId);
        await dashboardCacheService.setDashboardStats(agencyId, dashboardData);
      }
      
      // Extract summary data for legacy format
      const summary = {
        properties: dashboardData.properties.total,
        tenants: dashboardData.tenants,
        leases: dashboardData.leases,
        unpaidInvoices: (dashboardData.invoices.pending?.count || 0) + 
                       (dashboardData.invoices.partial?.count || 0) + 
                       (dashboardData.invoices.overdue?.count || 0)
      };
      
      res.json(summary);
    } catch (error) {
      logger.error('Dashboard summary endpoint error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard summary" });
    }
  }
);

dashboardRouter.get("/agency", 
  cacheMiddleware({ 
    ttl: 300,
    keyGenerator: (req) => `dashboard:${req.user.agencyId}:details`
  }),
  async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      
      // Try to get recent payments from cache
      const cachedPayments = await dashboardCacheService.getRecentPayments(agencyId);
      let dashboardData;
      
      if (cachedPayments) {
        // If we have cached payments, try to get full cached data
        const cachedStats = await dashboardCacheService.getDashboardStats(agencyId);
        if (cachedStats) {
          dashboardData = cachedStats;
        } else {
          dashboardData = await getDashboardDataOptimized(agencyId);
          await dashboardCacheService.setDashboardStats(agencyId, dashboardData);
        }
      } else {
        dashboardData = await getDashboardDataOptimized(agencyId);
        await dashboardCacheService.setRecentPayments(agencyId, dashboardData.recentPayments);
      }
      
      // Extract detail data for legacy format
      const details = {
        recentPayments: dashboardData.recentPayments,
        overdueInvoices: dashboardData.overdueInvoices
      };
      
      res.json(details);
    } catch (error) {
      logger.error('Dashboard details endpoint error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard details" });
    }
  }
);

// Admin dashboard can be same endpoint but FE uses role to show extra cards
