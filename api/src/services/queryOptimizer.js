import { prisma } from "../db.js";
import logger from "../utils/logger.js";

/**
 * Query optimization service with pagination, includes, and performance monitoring
 */

// Default pagination settings
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/**
 * Parse pagination parameters from request query
 */
export const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.limit) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Optimized property queries with proper includes and pagination
 */
export const getPropertiesOptimized = async (agencyId, options = {}) => {
  const { page, limit, skip } = parsePagination(options);
  const { includeUnits = false, includeLeases = false, status } = options;
  
  const where = { agencyId };
  if (status) where.status = status;
  
  const include = {};
  if (includeUnits) {
    include.units = {
      select: {
        id: true,
        unitNumber: true,
        status: true,
        rentAmount: true,
        type: true
      }
    };
  }
  if (includeLeases) {
    include.leases = {
      where: { endDate: null }, // Only active leases
      select: {
        id: true,
        startDate: true,
        rentAmount: true,
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    };
  }
  
  const startTime = Date.now();
  
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.property.count({ where })
  ]);
  
  const duration = Date.now() - startTime;
  logger.debug('Properties query executed', {
    agencyId,
    duration: `${duration}ms`,
    count: properties.length,
    total,
    page,
    limit
  });
  
  return {
    data: properties,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Optimized payment queries with lease and tenant information
 */
export const getPaymentsOptimized = async (agencyId, options = {}) => {
  const { page, limit, skip } = parsePagination(options);
  const { leaseId, startDate, endDate } = options;
  
  const where = { agencyId };
  if (leaseId) where.leaseId = leaseId;
  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt.gte = new Date(startDate);
    if (endDate) where.paidAt.lte = new Date(endDate);
  }
  
  const startTime = Date.now();
  
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        lease: {
          select: {
            id: true,
            property: {
              select: {
                id: true,
                title: true,
                address: true
              }
            },
            unit: {
              select: {
                id: true,
                unitNumber: true
              }
            },
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueAt: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { paidAt: 'desc' }
    }),
    prisma.payment.count({ where })
  ]);
  
  const duration = Date.now() - startTime;
  logger.debug('Payments query executed', {
    agencyId,
    duration: `${duration}ms`,
    count: payments.length,
    total,
    page,
    limit
  });
  
  return {
    data: payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Optimized dashboard data with efficient aggregations
 */
export const getDashboardDataOptimized = async (agencyId) => {
  const startTime = Date.now();
  
  // Use Promise.all for parallel execution
  const [
    propertyCounts,
    tenantCount,
    leaseCount,
    invoiceCounts,
    recentPayments,
    overdueInvoices
  ] = await Promise.all([
    // Property counts by status
    prisma.property.groupBy({
      by: ['status'],
      where: { agencyId },
      _count: { id: true }
    }),
    
    // Total tenant count
    prisma.tenant.count({ where: { agencyId } }),
    
    // Active lease count
    prisma.lease.count({ 
      where: { 
        agencyId,
        endDate: null 
      } 
    }),
    
    // Invoice counts by status
    prisma.invoice.groupBy({
      by: ['status'],
      where: { agencyId },
      _count: { id: true },
      _sum: { amount: true }
    }),
    
    // Recent payments with minimal data
    prisma.payment.findMany({
      where: { agencyId },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        method: true,
        lease: {
          select: {
            tenant: {
              select: {
                name: true
              }
            },
            property: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { paidAt: 'desc' },
      take: 10
    }),
    
    // Overdue invoices with minimal data
    prisma.invoice.findMany({
      where: { 
        agencyId, 
        status: 'OVERDUE',
        dueAt: { lt: new Date() }
      },
      select: {
        id: true,
        amount: true,
        dueAt: true,
        totalPaid: true,
        lease: {
          select: {
            tenant: {
              select: {
                name: true,
                phone: true
              }
            },
            property: {
              select: {
                title: true
              }
            }
          }
        }
      },
      orderBy: { dueAt: 'asc' },
      take: 20
    })
  ]);
  
  const duration = Date.now() - startTime;
  logger.debug('Dashboard query executed', {
    agencyId,
    duration: `${duration}ms`
  });
  
  // Process property counts
  const propertyStats = propertyCounts.reduce((acc, item) => {
    acc[item.status.toLowerCase()] = item._count.id;
    return acc;
  }, {});
  
  // Process invoice stats
  const invoiceStats = invoiceCounts.reduce((acc, item) => {
    acc[item.status.toLowerCase()] = {
      count: item._count.id,
      amount: item._sum.amount || 0
    };
    return acc;
  }, {});
  
  return {
    properties: {
      total: Object.values(propertyStats).reduce((sum, count) => sum + count, 0),
      ...propertyStats
    },
    tenants: tenantCount,
    leases: leaseCount,
    invoices: invoiceStats,
    recentPayments,
    overdueInvoices
  };
};

/**
 * Optimized tenant queries with lease information
 */
export const getTenantsOptimized = async (agencyId, options = {}) => {
  const { page, limit, skip } = parsePagination(options);
  const { includeLeases = false, search } = options;
  
  const where = { agencyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  const include = {};
  if (includeLeases) {
    include.leases = {
      where: { endDate: null }, // Only active leases
      select: {
        id: true,
        startDate: true,
        rentAmount: true,
        property: {
          select: {
            id: true,
            title: true,
            address: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true
          }
        }
      }
    };
  }
  
  const startTime = Date.now();
  
  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.tenant.count({ where })
  ]);
  
  const duration = Date.now() - startTime;
  logger.debug('Tenants query executed', {
    agencyId,
    duration: `${duration}ms`,
    count: tenants.length,
    total,
    page,
    limit
  });
  
  return {
    data: tenants,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Optimized invoice queries with payment information
 */
export const getInvoicesOptimized = async (agencyId, options = {}) => {
  const { page, limit, skip } = parsePagination(options);
  const { status, leaseId, overdue = false } = options;
  
  const where = { agencyId };
  if (status) where.status = status;
  if (leaseId) where.leaseId = leaseId;
  if (overdue) {
    where.status = { in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
    where.dueAt = { lt: new Date() };
  }
  
  const startTime = Date.now();
  
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        lease: {
          select: {
            id: true,
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            property: {
              select: {
                id: true,
                title: true,
                address: true
              }
            },
            unit: {
              select: {
                id: true,
                unitNumber: true
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            method: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { dueAt: 'desc' }
    }),
    prisma.invoice.count({ where })
  ]);
  
  const duration = Date.now() - startTime;
  logger.debug('Invoices query executed', {
    agencyId,
    duration: `${duration}ms`,
    count: invoices.length,
    total,
    page,
    limit
  });
  
  return {
    data: invoices,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Query execution time middleware
 */
export const queryTimeMiddleware = (req, res, next) => {
  req.queryStartTime = Date.now();
  
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - req.queryStartTime;
    
    if (duration > 1000) {
      logger.warn('Slow API response', {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Add performance headers
    res.set('X-Response-Time', `${duration}ms`);
    
    return originalJson.call(this, data);
  };
  
  next();
};