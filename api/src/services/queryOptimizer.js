import { prisma } from "../db.js";
import logger from "../utils/logger.js";

/**
 * Enhanced Query Optimizer Service
 * Provides optimized database queries with caching and performance monitoring
 */

class QueryOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.cacheEnabled = true;
  }

  /**
   * Record query performance metrics
   */
  recordQuery(queryName, duration, cached = false) {
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        slowQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
      });
    }

    const stats = this.queryStats.get(queryName);
    stats.count++;

    if (cached) {
      stats.cacheHits++;
    } else {
      stats.cacheMisses++;
      stats.totalDuration += duration;
      stats.avgDuration = stats.totalDuration / (stats.count - stats.cacheHits);

      if (duration > this.slowQueryThreshold) {
        stats.slowQueries++;
        logger.warn(`Slow query detected: ${queryName}`, {
          duration: `${duration}ms`,
          threshold: `${this.slowQueryThreshold}ms`,
        });
      }
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    const stats = {};
    for (const [queryName, data] of this.queryStats) {
      stats[queryName] = {
        ...data,
        cacheHitRate:
          data.count > 0
            ? ((data.cacheHits / data.count) * 100).toFixed(2) + "%"
            : "0%",
        slowQueryRate:
          data.count > 0
            ? ((data.slowQueries / data.count) * 100).toFixed(2) + "%"
            : "0%",
      };
    }
    return stats;
  }

  /**
   * Execute query with caching and performance monitoring
   */
  async executeQuery(queryName, queryFn, cacheKey = null, ttl = 300) {
    const startTime = Date.now();

    try {
      // Cache disabled - execute query directly
      const result = await queryFn();
      const duration = Date.now() - startTime;

      this.recordQuery(queryName, duration, false);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQuery(queryName, duration, false);
      logger.error(`Query error: ${queryName}`, {
        error: error.message,
        duration: `${duration}ms`,
      });
      throw error;
    }
  }

  /**
   * Optimized property queries
   */
  async getProperties(agencyId, filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
    const { city, type, status, minRent, maxRent, bedrooms, search } = filters;

    // Cache disabled
    const cacheKey = null;

    return this.executeQuery(
      "getProperties",
      async () => {
        const where = { agencyId };

        // Apply filters
        if (city) where.city = { contains: city, mode: "insensitive" };
        if (type) where.type = type;
        if (status) where.status = status;
        if (bedrooms) where.bedrooms = bedrooms;

        if (minRent || maxRent) {
          where.rentAmount = {};
          if (minRent) where.rentAmount.gte = minRent;
          if (maxRent) where.rentAmount.lte = maxRent;
        }

        if (search) {
          where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
          ];
        }

        const [properties, total] = await Promise.all([
          prisma.property.findMany({
            where,
            include: {
              units: {
                select: { id: true, status: true, rentAmount: true },
              },
              _count: {
                select: { leases: true },
              },
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.property.count({ where }),
        ]);

        return {
          properties,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      },
      cacheKey,
      300
    );
  }

  /**
   * Optimized tenant queries
   */
  async getTenants(agencyId, filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = pagination;
    const { search, isHighRisk } = filters;

    // Cache disabled
    const cacheKey = null;

    return this.executeQuery(
      "getTenants",
      async () => {
        const where = { agencyId };

        if (isHighRisk !== undefined) where.isHighRisk = isHighRisk;

        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ];
        }

        const [tenants, total] = await Promise.all([
          prisma.tenant.findMany({
            where,
            include: {
              leases: {
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  rentAmount: true,
                  property: {
                    select: { title: true, address: true },
                  },
                  unit: {
                    select: { unitNumber: true },
                  },
                },
                orderBy: { startDate: "desc" },
                take: 1,
              },
              _count: {
                select: { leases: true, vacateNotices: true },
              },
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.tenant.count({ where }),
        ]);

        return {
          tenants,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      },
      cacheKey,
      300
    );
  }

  /**
   * Optimized payment queries with analytics
   */
  async getPayments(agencyId, filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "paidAt",
      sortOrder = "desc",
    } = pagination;
    const { leaseId, method, startDate, endDate, minAmount, maxAmount } =
      filters;

    // Cache disabled
    const cacheKey = null;

    return this.executeQuery(
      "getPayments",
      async () => {
        const where = { agencyId };

        if (leaseId) where.leaseId = leaseId;
        if (method) where.method = method;

        if (startDate || endDate) {
          where.paidAt = {};
          if (startDate) where.paidAt.gte = new Date(startDate);
          if (endDate) where.paidAt.lte = new Date(endDate);
        }

        if (minAmount || maxAmount) {
          where.amount = {};
          if (minAmount) where.amount.gte = minAmount;
          if (maxAmount) where.amount.lte = maxAmount;
        }

        const [payments, total, analytics] = await Promise.all([
          prisma.payment.findMany({
            where,
            include: {
              lease: {
                select: {
                  id: true,
                  tenant: { select: { name: true, phone: true } },
                  property: { select: { title: true } },
                  unit: { select: { unitNumber: true } },
                },
              },
              invoice: {
                select: { id: true, amount: true, status: true },
              },
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.payment.count({ where }),
          this.getPaymentAnalytics(agencyId, filters),
        ]);

        return {
          payments,
          analytics,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      },
      cacheKey,
      180
    );
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(agencyId, filters = {}) {
    const where = { agencyId };
    const { startDate, endDate, minAmount, maxAmount } = filters;

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = minAmount;
      if (maxAmount) where.amount.lte = maxAmount;
    }

    const [totalPayments, methodBreakdown] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get monthly trends using Prisma queries (MongoDB compatible)
    // Fetch payments and group them manually since MongoDB doesn't support DATE_TRUNC
    const payments = await prisma.payment.findMany({
      where,
      select: {
        paidAt: true,
        amount: true,
      },
      orderBy: {
        paidAt: "desc",
      },
    });

    // Group by month manually
    const monthlyTrendsMap = new Map();
    payments.forEach((payment) => {
      if (payment.paidAt) {
        const monthKey = `${payment.paidAt.getFullYear()}-${String(
          payment.paidAt.getMonth() + 1
        ).padStart(2, "0")}`;
        if (!monthlyTrendsMap.has(monthKey)) {
          monthlyTrendsMap.set(monthKey, {
            month: new Date(
              payment.paidAt.getFullYear(),
              payment.paidAt.getMonth(),
              1
            ),
            total_amount: 0,
            payment_count: 0,
          });
        }
        const trend = monthlyTrendsMap.get(monthKey);
        trend.total_amount += payment.amount;
        trend.payment_count += 1;
      }
    });

    const monthlyTrends = Array.from(monthlyTrendsMap.values())
      .sort((a, b) => b.month - a.month)
      .slice(0, 12);

    return {
      totalAmount: totalPayments._sum.amount || 0,
      totalCount: totalPayments._count || 0,
      averageAmount: totalPayments._avg.amount || 0,
      methodBreakdown,
      monthlyTrends,
    };
  }

  /**
   * Optimized dashboard queries
   */
  async getDashboardStats(agencyId) {
    // Cache disabled
    const cacheKey = null;

    return this.executeQuery(
      "getDashboardStats",
      async () => {
        const [
          propertyStats,
          tenantStats,
          paymentStats,
          recentPayments,
          upcomingRent,
        ] = await Promise.all([
          this.getPropertyStats(agencyId),
          this.getTenantStats(agencyId),
          this.getPaymentStatsForDashboard(agencyId),
          this.getRecentPayments(agencyId, 5),
          this.getUpcomingRentPayments(agencyId, 10),
        ]);

        return {
          properties: propertyStats,
          tenants: tenantStats,
          payments: paymentStats,
          recentPayments,
          upcomingRent,
          lastUpdated: new Date().toISOString(),
        };
      },
      cacheKey,
      300
    );
  }

  async getPropertyStats(agencyId) {
    return prisma.property.groupBy({
      by: ["status"],
      where: { agencyId },
      _count: true,
    });
  }

  async getTenantStats(agencyId) {
    const [total, highRisk, active] = await Promise.all([
      prisma.tenant.count({ where: { agencyId } }),
      prisma.tenant.count({ where: { agencyId, isHighRisk: true } }),
      prisma.lease.count({
        where: {
          agencyId,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      }),
    ]);

    return { total, highRisk, active };
  }

  async getPaymentStatsForDashboard(agencyId) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [thisMonth, lastMonth] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          agencyId,
          paidAt: { gte: currentMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: {
          agencyId,
          paidAt: {
            gte: new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth() - 1,
              1
            ),
            lt: currentMonth,
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      thisMonth: {
        amount: thisMonth._sum.amount || 0,
        count: thisMonth._count || 0,
      },
      lastMonth: {
        amount: lastMonth._sum.amount || 0,
        count: lastMonth._count || 0,
      },
    };
  }

  async getRecentPayments(agencyId, limit = 5) {
    return prisma.payment.findMany({
      where: { agencyId },
      include: {
        lease: {
          select: {
            tenant: { select: { name: true } },
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: limit,
    });
  }

  async getUpcomingRentPayments(agencyId, limit = 10) {
    const today = new Date();
    const nextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );

    return prisma.lease.findMany({
      where: {
        agencyId,
        OR: [{ endDate: null }, { endDate: { gt: today } }],
      },
      include: {
        tenant: { select: { name: true, phone: true } },
        property: { select: { title: true } },
        unit: { select: { unitNumber: true } },
        payments: {
          where: {
            paidAt: {
              gte: new Date(today.getFullYear(), today.getMonth(), 1),
              lt: nextMonth,
            },
          },
          select: { amount: true, paidAt: true },
        },
      },
      orderBy: { paymentDayOfMonth: "asc" },
      take: limit,
    });
  }

  /**
   * Clear query statistics
   */
  clearStats() {
    this.queryStats.clear();
    logger.info("Query optimizer statistics cleared");
  }

  /**
   * Enable/disable caching
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
    logger.info(`Query optimizer caching ${enabled ? "enabled" : "disabled"}`);
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

// Stub functions for missing exports
export const getPropertiesOptimized = async (options = {}) => {
  logger.warn("getPropertiesOptimized called - using basic implementation");

  const {
    agencyId,
    page = 1,
    limit = 50,
    status,
    includeUnits,
    includeLeases,
  } = options;

  const where = { agencyId };
  if (status) where.status = status;

  const include = {};
  if (includeUnits) include.units = true;
  if (includeLeases) include.leases = true;

  const skip = (page - 1) * limit;

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getPaymentsOptimized = async (options = {}) => {
  logger.warn("getPaymentsOptimized called - using basic implementation");

  const { agencyId, page = 1, limit = 50, leaseId, method } = options;

  const where = { agencyId };
  if (leaseId) where.leaseId = leaseId;
  if (method) where.method = method;

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        lease: {
          include: {
            tenant: true,
            property: true,
            unit: true,
          },
        },
        invoice: true,
      },
      skip,
      take: limit,
      orderBy: { paidAt: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getTenantsOptimized = async (agencyId, options = {}) => {
  logger.warn("getTenantsOptimized called - using basic implementation");

  const { page = 1, limit = 50, search, status } = options;

  const where = { agencyId };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        leases: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    tenants,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getInvoicesOptimized = async (options = {}) => {
  logger.warn("getInvoicesOptimized called - using basic implementation");

  const { agencyId, page = 1, limit = 50, status, leaseId, overdue } = options;

  const where = { agencyId };
  if (status) where.status = status;
  if (leaseId) where.leaseId = leaseId;
  if (overdue === "true") {
    where.dueAt = { lt: new Date() };
    where.status = { not: "PAID" };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lease: {
          include: {
            tenant: true,
            unit: true,
          },
        },
        payments: true,
      },
      orderBy: { dueAt: "desc" },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getDashboardDataOptimized = async (agencyId) => {
  logger.warn("getDashboardDataOptimized called - using basic implementation");

  const [properties, tenants, leases, payments] = await Promise.all([
    prisma.property.count({ where: { agencyId } }),
    prisma.tenant.count({ where: { agencyId } }),
    prisma.lease.count({
      where: {
        agencyId,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
    }),
    prisma.payment.aggregate({
      where: {
        agencyId,
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    properties: { total: properties },
    tenants: { total: tenants },
    leases: { active: leases },
    payments: {
      thisMonth: {
        amount: payments._sum.amount || 0,
        count: payments._count || 0,
      },
    },
  };
};

export const queryTimeMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${req.path}`, {
        duration: `${duration}ms`,
        query: req.query,
      });
    }
  });

  next();
};

export default queryOptimizer;
