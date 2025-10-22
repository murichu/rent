import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { cacheMiddleware, invalidateCacheMiddleware, cacheInvalidationPatterns } from "../middleware/cache.js";
import dashboardCacheService from "../services/dashboardCache.js";
import { paginate } from "../middleware/pagination.js";
import { createResultLimiter } from "../middleware/resultLimiter.js";

export const tenantRouter = Router();

tenantRouter.use(requireAuth);
tenantRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit
tenantRouter.use(createResultLimiter({ 
  maxResults: 500, 
  entityType: 'tenant',
  enableMemoryMonitoring: true 
}));

const tenantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

tenantRouter.get("/", 
  cacheMiddleware({ 
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
      const { page = 1, limit = 50, search, includeLeases, stream } = req.query;
      return `tenants:${req.user.agencyId}:list:page:${page}:limit:${limit}:search:${search || ''}:leases:${includeLeases || 'false'}:stream:${stream || 'false'}`;
    }
  }),
  async (req, res) => {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        includeLeases: req.query.includeLeases === 'true',
        stream: req.query.stream === 'true'
      };

      // Handle streaming requests for large datasets
      if (options.stream) {
        const { default: streamingService } = await import('../services/streamingService.js');
        
        const tenantStream = await streamingService.streamTenants(req.user.agencyId, options);
        const csvHeaders = ['id', 'name', 'email', 'phone', 'createdAt'];
        
        if (options.includeLeases) {
          csvHeaders.push('lease.property.title', 'lease.unit.unitNumber', 'lease.rentAmount', 'lease.startDate');
        }
        
        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream = streamingService.createMonitoringStream('tenants-export');
        
        // Set up streaming response
        res.streamPaginate(
          tenantStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: 'text/csv',
            filename: `tenants-${req.user.agencyId}-${new Date().toISOString().split('T')[0]}.csv`,
            headers: {
              'X-Stream-Type': 'tenants',
              'X-Agency-Id': req.user.agencyId
            }
          }
        );
        return;
      }

      // For basic tenant list without search or includes, try cache first
      if (!options.search && !options.includeLeases && !options.page && !options.limit) {
        const cachedTenants = await dashboardCacheService.getTenantList(req.user.agencyId);
        
        if (cachedTenants) {
          return res.json(cachedTenants);
        }
      }

      // Use optimized query with pagination
      const { getTenantsOptimized } = await import('../services/queryOptimizer.js');
      const result = await getTenantsOptimized(req.user.agencyId, options);
      
      // Cache basic tenant list if applicable
      if (!options.search && !options.includeLeases && !options.page && !options.limit) {
        await dashboardCacheService.setTenantList(req.user.agencyId, result.data);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  }
);

tenantRouter.post("/", 
  invalidateCacheMiddleware([
    cacheInvalidationPatterns.tenants,
    cacheInvalidationPatterns.dashboard,
    cacheInvalidationPatterns.apiResponses
  ]),
  async (req, res) => {
    const parsed = tenantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    
    const created = await prisma.tenant.create({ data: { ...parsed.data, agencyId: req.user.agencyId } });
    
    // Invalidate dashboard cache for tenant-related data
    await dashboardCacheService.invalidateOnDataUpdate(req.user.agencyId, 'tenant');
    
    res.status(201).json(created);
  }
);

tenantRouter.get(":id", async (req, res) => {
  const item = await prisma.tenant.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

tenantRouter.put(":id", async (req, res) => {
  const parsed = tenantSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.tenant.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.tenant.update({ where: { id: existing.id }, data: parsed.data });
  res.json(updated);
});

tenantRouter.delete(":id", async (req, res) => {
  const existing = await prisma.tenant.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.tenant.delete({ where: { id: existing.id } });
  res.status(204).end();
});
