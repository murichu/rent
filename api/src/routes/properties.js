import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getPropertiesOptimized, queryTimeMiddleware } from "../services/queryOptimizer.js";
import { cacheMiddleware, invalidateCacheMiddleware, cacheInvalidationPatterns } from "../middleware/cache.js";
import dashboardCacheService from "../services/dashboardCache.js";
import { paginate } from "../middleware/pagination.js";
import { createResultLimiter } from "../middleware/resultLimiter.js";

export const propertyRouter = Router();
propertyRouter.use(requireAuth);
propertyRouter.use(queryTimeMiddleware);
propertyRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit
propertyRouter.use(createResultLimiter({ 
  maxResults: 500, 
  entityType: 'property',
  enableMemoryMonitoring: true 
}));

const propertySchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  sizeSqFt: z.number().int().nonnegative().optional(),
  rentAmount: z.number().int().nonnegative().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "OFF_MARKET"]).optional(),
  type: z.enum([
    "SINGLE_ROOM", "DOUBLE_ROOM", "BEDSITTER", "ONE_BEDROOM", "TWO_BEDROOM", 
    "THREE_BEDROOM", "FOUR_BEDROOM", "MAISONETTE", "BUNGALOW", "SERVANT_QUARTER", 
    "PENTHOUSE", "TOWNHOUSE", "VILLA", "COMMERCIAL", "OFFICE"
  ])
});

// Optimized properties list with pagination, filtering, and streaming support
propertyRouter.get("/", 
  cacheMiddleware({ 
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
      const { page = 1, limit = 50, status, includeUnits, includeLeases, stream } = req.query;
      return `properties:${req.user.agencyId}:list:page:${page}:limit:${limit}:status:${status || 'all'}:units:${includeUnits || 'false'}:leases:${includeLeases || 'false'}:stream:${stream || 'false'}`;
    }
  }),
  async (req, res) => {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        includeUnits: req.query.includeUnits === 'true',
        includeLeases: req.query.includeLeases === 'true',
        stream: req.query.stream === 'true'
      };
      
      // Handle streaming requests for large datasets
      if (options.stream) {
        const { default: streamingService } = await import('../services/streamingService.js');
        
        const propertyStream = await streamingService.streamProperties(req.user.agencyId, options);
        const csvHeaders = [
          'id', 'title', 'address', 'city', 'state', 'zip', 
          'bedrooms', 'bathrooms', 'sizeSqFt', 'rentAmount', 'status', 'type'
        ];
        
        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream = streamingService.createMonitoringStream('properties-export');
        
        // Set up streaming response
        res.streamPaginate(
          propertyStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: 'text/csv',
            filename: `properties-${req.user.agencyId}-${new Date().toISOString().split('T')[0]}.csv`,
            headers: {
              'X-Stream-Type': 'properties',
              'X-Agency-Id': req.user.agencyId
            }
          }
        );
        return;
      }
      
      // Try to get from dashboard cache first for basic property list
      if (!options.includeUnits && !options.includeLeases && !options.status) {
        const cachedProperties = await dashboardCacheService.getPropertyList(
          req.user.agencyId, 
          parseInt(options.page) || 1, 
          parseInt(options.limit) || 50
        );
        
        if (cachedProperties) {
          return res.json(cachedProperties);
        }
      }
      
      const result = await getPropertiesOptimized(req.user.agencyId, options);
      
      // Cache basic property list in dashboard cache
      if (!options.includeUnits && !options.includeLeases && !options.status) {
        await dashboardCacheService.setPropertyList(
          req.user.agencyId, 
          result, 
          parseInt(options.page) || 1, 
          parseInt(options.limit) || 50
        );
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  }
);

propertyRouter.post("/", 
  invalidateCacheMiddleware([
    cacheInvalidationPatterns.properties,
    cacheInvalidationPatterns.dashboard,
    cacheInvalidationPatterns.apiResponses
  ]),
  async (req, res) => {
    try {
      const parsed = propertySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error.flatten());
      
      const created = await prisma.property.create({ 
        data: { 
          ...parsed.data, 
          agencyId: req.user.agencyId 
        } 
      });
      
      // Invalidate dashboard cache for property-related data
      await dashboardCacheService.invalidateOnDataUpdate(req.user.agencyId, 'property');
      
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: "Failed to create property" });
    }
  }
);

// Optimized single property fetch with related data
propertyRouter.get("/:id", async (req, res) => {
  try {
    const includeUnits = req.query.includeUnits === 'true';
    const includeLeases = req.query.includeLeases === 'true';
    
    const include = {};
    if (includeUnits) {
      include.units = {
        select: {
          id: true,
          unitNumber: true,
          status: true,
          rentAmount: true,
          type: true,
          bedrooms: true,
          bathrooms: true
        }
      };
    }
    if (includeLeases) {
      include.leases = {
        where: { endDate: null },
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
    
    const item = await prisma.property.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      },
      include
    });
    
    if (!item) return res.status(404).json({ error: "Property not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

propertyRouter.put("/:id", async (req, res) => {
  try {
    const parsed = propertySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    
    const existing = await prisma.property.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      } 
    });
    
    if (!existing) return res.status(404).json({ error: "Property not found" });
    
    const updated = await prisma.property.update({ 
      where: { id: existing.id }, 
      data: parsed.data 
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update property" });
  }
});

propertyRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.property.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      } 
    });
    
    if (!existing) return res.status(404).json({ error: "Property not found" });
    
    await prisma.property.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete property" });
  }
});
