import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { cacheMiddleware, invalidateCacheMiddleware, cacheInvalidationPatterns } from "../middleware/cache.js";
import dashboardCacheService from "../services/dashboardCache.js";

export const tenantRouter = Router();

tenantRouter.use(requireAuth);

const tenantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

tenantRouter.get("/", 
  cacheMiddleware({ 
    ttl: 600, // 10 minutes
    keyGenerator: (req) => `tenants:${req.user.agencyId}:list`
  }),
  async (req, res) => {
    // Try to get from dashboard cache first
    const cachedTenants = await dashboardCacheService.getTenantList(req.user.agencyId);
    
    if (cachedTenants) {
      return res.json(cachedTenants);
    }
    
    const items = await prisma.tenant.findMany({ where: { agencyId: req.user.agencyId } });
    
    // Cache the tenant list
    await dashboardCacheService.setTenantList(req.user.agencyId, items);
    
    res.json(items);
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
