import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { paginate } from "../middleware/pagination.js";
import { createResultLimiter } from "../middleware/resultLimiter.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
} from "../middleware/centralizedErrorHandler.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responses.js";

export const tenantRouter = Router();

tenantRouter.use(requireAuth);
tenantRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit
tenantRouter.use(
  createResultLimiter({
    maxResults: 500,
    entityType: "tenant",
    enableMemoryMonitoring: true,
  })
);

const tenantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

tenantRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        includeLeases: req.query.includeLeases === "true",
        stream: req.query.stream === "true",
      };

      // Handle streaming requests for large datasets
      if (options.stream) {
        const { default: streamingService } = await import(
          "../services/streamingService.js"
        );

        const tenantStream = await streamingService.streamTenants(
          req.user.agencyId,
          options
        );
        const csvHeaders = ["id", "name", "email", "phone", "createdAt"];

        if (options.includeLeases) {
          csvHeaders.push(
            "lease.property.title",
            "lease.unit.unitNumber",
            "lease.rentAmount",
            "lease.startDate"
          );
        }

        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream =
          streamingService.createMonitoringStream("tenants-export");

        // Set up streaming response
        res.streamPaginate(
          tenantStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: "text/csv",
            filename: `tenants-${req.user.agencyId}-${
              new Date().toISOString().split("T")[0]
            }.csv`,
            headers: {
              "X-Stream-Type": "tenants",
              "X-Agency-Id": req.user.agencyId,
            },
          }
        );
        return;
      }

      // Use optimized query with pagination
      const { getTenantsOptimized } = await import(
        "../services/queryOptimizer.js"
      );
      const result = await getTenantsOptimized(req.user.agencyId, options);
      return successResponse(res, result, "Tenants retrieved");
    } catch (error) {
      logger.error("Error fetching tenants:", error);
      return errorResponse(res, "Failed to fetch tenants", 500);
    }
  })
);

tenantRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const parsed = tenantSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError("Invalid input", parsed.error.flatten());

      const created = await prisma.tenant.create({
        data: { ...parsed.data, agencyId: req.user.agencyId },
      });
      return successResponse(res, created, "Tenant created", 201);
    } catch (error) {
      logger.error("Error creating tenant:", error);
      if (error instanceof ValidationError) throw error;
      return errorResponse(res, "Failed to create tenant", 500);
    }
  })
);

tenantRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const item = await prisma.tenant.findFirst({
        where: { id: req.params.id, agencyId: req.user.agencyId },
      });
      if (!item) throw new NotFoundError("Tenant not found");
      return successResponse(res, item, "Tenant retrieved");
    } catch (error) {
      logger.error("Error fetching tenant:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to fetch tenant", 500);
    }
  })
);

tenantRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const parsed = tenantSchema.partial().safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError("Invalid input", parsed.error.flatten());
      const existing = await prisma.tenant.findFirst({
        where: { id: req.params.id, agencyId: req.user.agencyId },
      });
      if (!existing) throw new NotFoundError("Tenant not found");
      const updated = await prisma.tenant.update({
        where: { id: existing.id },
        data: parsed.data,
      });
      return successResponse(res, updated, "Tenant updated");
    } catch (error) {
      logger.error("Error updating tenant:", error);
      if (error instanceof ValidationError || error instanceof NotFoundError)
        throw error;
      return errorResponse(res, "Failed to update tenant", 500);
    }
  })
);

tenantRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    try {
      const existing = await prisma.tenant.findFirst({
        where: { id: req.params.id, agencyId: req.user.agencyId },
      });
      if (!existing) throw new NotFoundError("Tenant not found");
      await prisma.tenant.delete({ where: { id: existing.id } });
      return successResponse(res, null, "Tenant deleted", 204);
    } catch (error) {
      logger.error("Error deleting tenant:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to delete tenant", 500);
    }
  })
);
