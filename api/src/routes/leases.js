import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { queryTimeMiddleware } from "../services/queryOptimizer.js";
import { cacheMiddleware, invalidateCacheMiddleware, cacheInvalidationPatterns } from "../middleware/cache.js";
import { paginate } from "../middleware/pagination.js";

export const leaseRouter = Router();

leaseRouter.use(requireAuth);
leaseRouter.use(queryTimeMiddleware);
leaseRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit

const leaseSchema = z.object({
  propertyId: z.string(),
  tenantId: z.string(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  rentAmount: z.number().int().positive(),
  paymentDayOfMonth: z.number().int().min(1).max(28),
});

// Optimized leases list with pagination, filtering, and streaming support
leaseRouter.get("/", 
  cacheMiddleware({ 
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
      const { page = 1, limit = 50, active, propertyId, tenantId, stream } = req.query;
      return `leases:${req.user.agencyId}:list:page:${page}:limit:${limit}:active:${active || 'all'}:property:${propertyId || 'all'}:tenant:${tenantId || 'all'}:stream:${stream || 'false'}`;
    }
  }),
  async (req, res) => {
    try {
      const { page, limit, skip } = req.pagination;
      const { active, propertyId, tenantId, stream } = req.query;
      
      // Handle streaming requests for large datasets
      if (stream === 'true') {
        const { default: streamingService } = await import('../services/streamingService.js');
        
        const where = { agencyId: req.user.agencyId };
        if (active === 'true') where.endDate = null;
        if (active === 'false') where.endDate = { not: null };
        if (propertyId) where.propertyId = propertyId;
        if (tenantId) where.tenantId = tenantId;
        
        const include = {
          tenant: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          property: {
            select: {
              title: true,
              address: true
            }
          },
          unit: {
            select: {
              unitNumber: true
            }
          }
        };
        
        const leaseStream = streamingService.createDatabaseStream('lease', { where, orderBy: { startDate: 'desc' } }, { include, batchSize: 50 });
        const csvHeaders = [
          'id', 'startDate', 'endDate', 'rentAmount', 'paymentDayOfMonth',
          'tenant.name', 'tenant.email', 'tenant.phone',
          'property.title', 'property.address', 'unit.unitNumber'
        ];
        
        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream = streamingService.createMonitoringStream('leases-export');
        
        // Set up streaming response
        res.streamPaginate(
          leaseStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: 'text/csv',
            filename: `leases-${req.user.agencyId}-${new Date().toISOString().split('T')[0]}.csv`,
            headers: {
              'X-Stream-Type': 'leases',
              'X-Agency-Id': req.user.agencyId
            }
          }
        );
        return;
      }
      
      // Build query conditions
      const where = { agencyId: req.user.agencyId };
      if (active === 'true') where.endDate = null;
      if (active === 'false') where.endDate = { not: null };
      if (propertyId) where.propertyId = propertyId;
      if (tenantId) where.tenantId = tenantId;
      
      // Optimized includes with selected fields only
      const include = {
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
      };
      
      const [leases, total] = await Promise.all([
        prisma.lease.findMany({
          where,
          include,
          skip,
          take: limit,
          orderBy: { startDate: 'desc' }
        }),
        prisma.lease.count({ where })
      ]);
      
      res.paginate(leases, total);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  }
);

leaseRouter.post("/", 
  invalidateCacheMiddleware([
    cacheInvalidationPatterns.leases,
    cacheInvalidationPatterns.dashboard,
    cacheInvalidationPatterns.apiResponses
  ]),
  async (req, res) => {
    try {
      const parsed = leaseSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error.flatten());
      
      const { propertyId, tenantId, ...rest } = parsed.data;
      const created = await prisma.lease.create({
        data: {
          propertyId,
          tenantId,
          agencyId: req.user.agencyId,
          ...rest,
        },
      });
      
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lease" });
    }
  }
);

leaseRouter.get("/:id", async (req, res) => {
  try {
    const includeDetails = req.query.includeDetails === 'true';
    
    const include = includeDetails ? {
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
      },
      invoices: {
        select: {
          id: true,
          amount: true,
          status: true,
          dueAt: true
        },
        orderBy: { dueAt: 'desc' },
        take: 10 // Limit recent invoices
      },
      payments: {
        select: {
          id: true,
          amount: true,
          paidAt: true,
          method: true
        },
        orderBy: { paidAt: 'desc' },
        take: 10 // Limit recent payments
      }
    } : {};
    
    const item = await prisma.lease.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      },
      include
    });
    
    if (!item) return res.status(404).json({ error: "Lease not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lease" });
  }
});

leaseRouter.put("/:id", async (req, res) => {
  try {
    const parsed = leaseSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    
    const existing = await prisma.lease.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      } 
    });
    
    if (!existing) return res.status(404).json({ error: "Lease not found" });
    
    const updated = await prisma.lease.update({ 
      where: { id: existing.id }, 
      data: parsed.data 
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update lease" });
  }
});

leaseRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.lease.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      } 
    });
    
    if (!existing) return res.status(404).json({ error: "Lease not found" });
    
    await prisma.lease.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lease" });
  }
});
