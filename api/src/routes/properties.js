import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  getPropertiesOptimized,
  queryTimeMiddleware,
} from "../services/queryOptimizer.js";
import { paginate } from "../middleware/pagination.js";
import { createResultLimiter } from "../middleware/resultLimiter.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
} from "../middleware/centralizedErrorHandler.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responses.js";

export const propertyRouter = Router();
propertyRouter.use(requireAuth);
propertyRouter.use(queryTimeMiddleware);
propertyRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit
propertyRouter.use(
  createResultLimiter({
    maxResults: 500,
    entityType: "property",
    enableMemoryMonitoring: true,
  })
);

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
  status: z
    .enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "OFF_MARKET"])
    .optional(),
  type: z.enum([
    "SINGLE_ROOM",
    "DOUBLE_ROOM",
    "BEDSITTER",
    "ONE_BEDROOM",
    "TWO_BEDROOM",
    "THREE_BEDROOM",
    "FOUR_BEDROOM",
    "APARTMENT",
    "MAISONETTE",
    "BUNGALOW",
    "SERVANT_QUARTER",
    "PENTHOUSE",
    "TOWNHOUSE",
    "VILLA",
    "COMMERCIAL",
    "OFFICE",
  ]),
});

// Optimized properties list with pagination, filtering, and streaming support
propertyRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        includeUnits: req.query.includeUnits === "true",
        includeLeases: req.query.includeLeases === "true",
        stream: req.query.stream === "true",
      };

      // Handle streaming requests for large datasets
      if (options.stream) {
        const { default: streamingService } = await import(
          "../services/streamingService.js"
        );

        const propertyStream = await streamingService.streamProperties(
          req.user.agencyId,
          options
        );
        const csvHeaders = [
          "id",
          "title",
          "address",
          "city",
          "state",
          "zip",
          "bedrooms",
          "bathrooms",
          "sizeSqFt",
          "rentAmount",
          "status",
          "type",
        ];

        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream =
          streamingService.createMonitoringStream("properties-export");

        // Set up streaming response
        res.streamPaginate(
          propertyStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: "text/csv",
            filename: `properties-${req.user.agencyId}-${
              new Date().toISOString().split("T")[0]
            }.csv`,
            headers: {
              "X-Stream-Type": "properties",
              "X-Agency-Id": req.user.agencyId,
            },
          }
        );
        return;
      }

      const result = await getPropertiesOptimized(req.user.agencyId, options);
      return successResponse(res, result, "Properties retrieved");
    } catch (error) {
      logger.error("Error fetching properties:", error);
      return errorResponse(res, "Failed to fetch properties", 500);
    }
  })
);

propertyRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const parsed = propertySchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError("Invalid input", parsed.error.flatten());

      const created = await prisma.property.create({
        data: {
          ...parsed.data,
          agencyId: req.user.agencyId,
        },
      });

      return successResponse(res, created, "Property created", 201);
    } catch (error) {
      logger.error("Error creating property:", error);
      if (error instanceof ValidationError) throw error;
      return errorResponse(res, "Failed to create property", 500);
    }
  })
);

// Optimized single property fetch with related data
propertyRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const includeUnits = req.query.includeUnits === "true";
      const includeLeases = req.query.includeLeases === "true";

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
            bathrooms: true,
          },
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
                phone: true,
              },
            },
          },
        };
      }

      const item = await prisma.property.findFirst({
        where: {
          id: req.params.id,
          agencyId: req.user.agencyId,
        },
        include,
      });

      if (!item) throw new NotFoundError("Property not found");
      return successResponse(res, item, "Property retrieved");
    } catch (error) {
      logger.error("Error fetching property:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to fetch property", 500);
    }
  })
);

propertyRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const parsed = propertySchema.partial().safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError("Invalid input", parsed.error.flatten());

      const existing = await prisma.property.findFirst({
        where: {
          id: req.params.id,
          agencyId: req.user.agencyId,
        },
      });

      if (!existing) throw new NotFoundError("Property not found");

      const updated = await prisma.property.update({
        where: { id: existing.id },
        data: parsed.data,
      });

      return successResponse(res, updated, "Property updated");
    } catch (error) {
      logger.error("Error updating property:", error);
      if (error instanceof ValidationError || error instanceof NotFoundError)
        throw error;
      return errorResponse(res, "Failed to update property", 500);
    }
  })
);

propertyRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const existing = await prisma.property.findFirst({
        where: {
          id: req.params.id,
          agencyId: req.user.agencyId,
        },
      });

      if (!existing) throw new NotFoundError("Property not found");

      await prisma.property.delete({ where: { id: existing.id } });
      return successResponse(res, null, "Property deleted", 204);
    } catch (error) {
      logger.error("Error deleting property:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to delete property", 500);
    }
  })
);
