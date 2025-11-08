import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { paginate } from "../middleware/pagination.js";

export const auditLogRouter = Router();

auditLogRouter.use(requireAuth);
auditLogRouter.use(paginate({ maxLimit: 100 }));

/**
 * GET /audit-logs
 * Get all audit logs for the agency with filtering and pagination
 */
auditLogRouter.get("/", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { page = 1, limit = 50, userId, action, entityType, startDate, endDate } = req.query;

    // Build filter
    const where = { agencyId };

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.auditLog.count({ where });

    // Get paginated results
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: parseInt(limit),
    });

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

/**
 * GET /audit-logs/stats
 * Get audit log statistics
 */
auditLogRouter.get("/stats", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { startDate, endDate } = req.query;

    const where = { agencyId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // Get action counts
    const actionCounts = await prisma.auditLog.groupBy({
      by: ["action"],
      where,
      _count: true,
    });

    // Get entity type counts
    const entityTypeCounts = await prisma.auditLog.groupBy({
      by: ["entityType"],
      where,
      _count: true,
    });

    // Get user activity
    const userActivity = await prisma.auditLog.groupBy({
      by: ["userId", "userName"],
      where,
      _count: true,
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
      take: 10,
    });

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    // Total logs
    const total = await prisma.auditLog.count({ where });

    res.json({
      success: true,
      data: {
        total,
        actionCounts: actionCounts.map((item) => ({
          action: item.action,
          count: item._count,
        })),
        entityTypeCounts: entityTypeCounts.map((item) => ({
          entityType: item.entityType,
          count: item._count,
        })),
        userActivity: userActivity.map((item) => ({
          userId: item.userId,
          userName: item.userName,
          count: item._count,
        })),
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching audit log stats:", error);
    res.status(500).json({ error: "Failed to fetch audit log statistics" });
  }
});

/**
 * GET /audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
auditLogRouter.get("/entity/:entityType/:entityId", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { entityType, entityId } = req.params;

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        agencyId,
        entityType,
        entityId,
      },
      orderBy: { timestamp: "desc" },
    });

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
    });
  } catch (error) {
    console.error("Error fetching entity audit logs:", error);
    res.status(500).json({ error: "Failed to fetch entity audit logs" });
  }
});

/**
 * GET /audit-logs/user/:userId
 * Get audit logs for a specific user
 */
auditLogRouter.get("/user/:userId", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const where = {
      agencyId,
      userId,
    };

    const total = await prisma.auditLog.count({ where });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: parseInt(limit),
    });

    res.json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching user audit logs:", error);
    res.status(500).json({ error: "Failed to fetch user audit logs" });
  }
});

/**
 * DELETE /audit-logs/cleanup
 * Delete old audit logs (admin only)
 * Keeps logs from the last 90 days by default
 */
auditLogRouter.delete("/cleanup", async (req, res) => {
  try {
    // Only admins can cleanup logs
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const agencyId = req.user.agencyId;
    const { daysToKeep = 90 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysToKeep));

    const result = await prisma.auditLog.deleteMany({
      where: {
        agencyId,
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    res.json({
      success: true,
      message: `Deleted ${result.count} audit logs older than ${daysToKeep} days`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
    res.status(500).json({ error: "Failed to cleanup audit logs" });
  }
});

export default auditLogRouter;
