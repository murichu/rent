import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDashboardDataOptimized, queryTimeMiddleware } from "../services/queryOptimizer.js";
import logger from "../utils/logger.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(queryTimeMiddleware);

// Optimized dashboard endpoint combining both me and agency data
dashboardRouter.get("/", 
  async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      

      
      // Fetch dashboard data from database
      const dashboardData = await getDashboardDataOptimized(agencyId);
      

      
      res.json(dashboardData);
    } catch (error) {
      logger.error('Dashboard endpoint error:', error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  }
);

// Legacy endpoints for backward compatibility
dashboardRouter.get("/me", 
  async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      
      // Fetch dashboard data from database
      const dashboardData = await getDashboardDataOptimized(agencyId);
      
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
  async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      
      // Fetch dashboard data from database
      const dashboardData = await getDashboardDataOptimized(agencyId);
      
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
