import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { queryTimeMiddleware } from "../services/queryOptimizer.js";
import { paginate } from "../middleware/pagination.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
} from "../middleware/centralizedErrorHandler.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responses.js";

export const unitRouter = Router();

unitRouter.use(requireAuth);
unitRouter.use(queryTimeMiddleware);
unitRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit

const unitSchema = z.object({
  propertyId: z.string(),
  unitNumber: z.string(),
  type: z.enum([
    "SINGLE_ROOM",
    "DOUBLE_ROOM",
    "BEDSEATER",
    "ONE_BEDROOM",
    "TWO_BEDROOM",
    "THREE_BEDROOM",
    "MAISONETTE",
    "BUNGALOW",
  ]),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  sizeSqFt: z.number().int().nonnegative().optional(),
  rentAmount: z.number().int().positive(),
});

// Optimized units list with pagination, filtering, and streaming support
unitRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const { page, limit, skip } = req.pagination;
      const { propertyId, status, stream } = req.query;

      // Handle streaming requests for large datasets
      if (stream === "true") {
        const { default: streamingService } = await import(
          "../services/streamingService.js"
        );

        const where = { property: { agencyId: req.user.agencyId } };
        if (propertyId) where.propertyId = propertyId;
        if (status) where.status = status;

        const include = {
          property: {
            select: {
              title: true,
              address: true,
            },
          },
          leases: {
            where: { endDate: null },
            select: {
              tenant: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        };

        const unitStream = streamingService.createDatabaseStream(
          "unit",
          { where, orderBy: { unitNumber: "asc" } },
          { include, batchSize: 50 }
        );
        const csvHeaders = [
          "id",
          "unitNumber",
          "type",
          "bedrooms",
          "bathrooms",
          "sizeSqFt",
          "rentAmount",
          "status",
          "property.title",
          "property.address",
          "leases.tenant.name",
          "leases.tenant.email",
        ];

        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream =
          streamingService.createMonitoringStream("units-export");

        // Set up streaming response
        res.streamPaginate(
          unitStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: "text/csv",
            filename: `units-${req.user.agencyId}-${
              new Date().toISOString().split("T")[0]
            }.csv`,
            headers: {
              "X-Stream-Type": "units",
              "X-Agency-Id": req.user.agencyId,
            },
          }
        );
        return;
      }

      // Build query conditions
      const where = { property: { agencyId: req.user.agencyId } };
      if (propertyId) where.propertyId = propertyId;
      if (status) where.status = status;

      // Optimized includes with selected fields only
      const include = {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        leases: {
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
                phone: true,
              },
            },
          },
        },
      };

      const [units, total] = await Promise.all([
        prisma.unit.findMany({
          where,
          include,
          skip,
          take: limit,
          orderBy: { unitNumber: "asc" },
        }),
        prisma.unit.count({ where }),
      ]);

      return successResponse(res, { items: units, total }, "Units retrieved");
    } catch (error) {
      logger.error("Error fetching units:", error);
      return errorResponse(res, "Failed to fetch units", 500);
    }
  })
);

unitRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const parsed = unitSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error.flatten());

      const created = await prisma.unit.create({ data: parsed.data });
      return successResponse(res, created, "Unit created", 201);
    } catch (error) {
      logger.error("Error creating unit:", error);
      return errorResponse(res, "Failed to create unit", 500);
    }
  })
);

unitRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const includeDetails = req.query.includeDetails === "true";

      const include = includeDetails
        ? {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
              },
            },
            leases: {
              select: {
                id: true,
                startDate: true,
                endDate: true,
                rentAmount: true,
                tenant: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
              orderBy: { startDate: "desc" },
              take: 5, // Limit recent leases
            },
          }
        : {};

      const item = await prisma.unit.findFirst({
        where: {
          id: req.params.id,
          property: { agencyId: req.user.agencyId },
        },
        include,
      });

      if (!item) return res.status(404).json({ error: "Unit not found" });
      return successResponse(res, item, "Unit retrieved");
    } catch (error) {
      logger.error("Error fetching unit:", error);
      return errorResponse(res, "Failed to fetch unit", 500);
    }
  })
);

unitRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const parsed = unitSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error.flatten());

      const existing = await prisma.unit.findFirst({
        where: {
          id: req.params.id,
          property: { agencyId: req.user.agencyId },
        },
      });

      if (!existing) return res.status(404).json({ error: "Unit not found" });

      const updated = await prisma.unit.update({
        where: { id: existing.id },
        data: parsed.data,
      });

      return successResponse(res, updated, "Unit updated");
    } catch (error) {
      logger.error("Error updating unit:", error);
      return errorResponse(res, "Failed to update unit", 500);
    }
  })
);

unitRouter.put(
  "/:id/status",
  asyncHandler(async (req, res) => {
    try {
      const parsed = z
        .object({
          status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "OFF_MARKET"]),
        })
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json(parsed.error.flatten());

      const existing = await prisma.unit.findFirst({
        where: {
          id: req.params.id,
          property: { agencyId: req.user.agencyId },
        },
      });

      if (!existing) return res.status(404).json({ error: "Unit not found" });

      const updated = await prisma.unit.update({
        where: { id: existing.id },
        data: { status: parsed.data.status },
      });

      return successResponse(res, updated, "Unit status updated");
    } catch (error) {
      logger.error("Error updating unit status:", error);
      return errorResponse(res, "Failed to update unit status", 500);
    }
  })
);

unitRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const existing = await prisma.unit.findFirst({
        where: {
          id: req.params.id,
          property: { agencyId: req.user.agencyId },
        },
      });

      if (!existing) return res.status(404).json({ error: "Unit not found" });

      await prisma.unit.delete({ where: { id: existing.id } });
      return successResponse(res, null, "Unit deleted", 204);
    } catch (error) {
      logger.error("Error deleting unit:", error);
      return errorResponse(res, "Failed to delete unit", 500);
    }
  })
);
