import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
} from "../middleware/centralizedErrorHandler.js";
import logger from "../utils/logger.js";
import { successResponse, errorResponse } from "../utils/responses.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    try {
      const users = await prisma.user.findMany({
        where: { agencyId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      return successResponse(res, users, "Users retrieved successfully");
    } catch (error) {
      logger.error("Error fetching users:", error);
      return errorResponse(res, "Failed to fetch users", 500);
    }
  })
);

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "USER"]).optional(),
});
usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten());
    }
    const { name, email, password, role } = parsed.data;

    try {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return errorResponse(res, "Email already in use", 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const created = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role || "USER",
          agencyId: req.user.agencyId,
        },
      });
      return successResponse(
        res,
        {
          id: created.id,
          email: created.email,
          name: created.name,
          role: created.role,
        },
        "User created successfully",
        201
      );
    } catch (error) {
      logger.error("Error creating user:", error);
      return errorResponse(res, "Failed to create user", 500);
    }
  })
);

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
});
usersRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid input", parsed.error.flatten());
    }

    try {
      const existing = await prisma.user.findFirst({
        where: { id: req.params.id, agencyId },
      });
      if (!existing) {
        throw new NotFoundError("User not found");
      }
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: parsed.data,
      });
      return successResponse(
        res,
        {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
        },
        "User updated successfully"
      );
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error("Error updating user:", error);
      return errorResponse(res, "Failed to update user", 500);
    }
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    try {
      const existing = await prisma.user.findFirst({
        where: { id: req.params.id, agencyId },
      });
      if (!existing) {
        throw new NotFoundError("User not found");
      }
      await prisma.user.delete({ where: { id: existing.id } });
      return successResponse(res, null, "User deleted successfully", 204);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error("Error deleting user:", error);
      return errorResponse(res, "Failed to delete user", 500);
    }
  })
);
