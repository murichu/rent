import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import logger from "../utils/logger.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  ValidationError,
  NotFoundError,
} from "../middleware/centralizedErrorHandler.js";
import { successResponse, errorResponse } from "../utils/responses.js";

export const expenseRouter = Router();

// Validation schemas
const createExpenseSchema = z.object({
  propertyId: z.string().optional(),
  category: z.enum([
    "MAINTENANCE",
    "UTILITIES",
    "REPAIRS",
    "INSURANCE",
    "TAXES",
    "SALARIES",
    "MARKETING",
    "OTHER",
  ]),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  expenseDate: z.string().datetime().optional(),
  vendor: z.string().optional(),
  receiptNumber: z.string().optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "MPESA", "CARD"]).optional(),
  isRecurring: z.boolean().optional(),
  recurringPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]).optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

// GET /expenses - List all expenses for the agency
expenseRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        propertyId,
        status,
        startDate,
        endDate,
        search,
      } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const agencyId = req.user.agencyId;
      const where = {
        agencyId,
        ...(category && { category }),
        ...(propertyId && { propertyId }),
        ...(status && { status }),
        ...(startDate &&
          endDate && {
            expenseDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
        ...(search && {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { vendor: { contains: search, mode: "insensitive" } },
            { receiptNumber: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            property: {
              select: {
                id: true,
                title: true,
                address: true,
              },
            },
          },
          orderBy: { expenseDate: "desc" },
        }),
        prisma.expense.count({ where }),
      ]);

      return successResponse(
        res,
        {
          expenses,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
        "Expenses retrieved"
      );
    } catch (error) {
      logger.error("Error fetching expenses:", error);
      return errorResponse(res, "Failed to fetch expenses", 500);
    }
  })
);

// GET /expenses/summary - Get expense summary
expenseRouter.get(
  "/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate, propertyId } = req.query;
      const agencyId = req.user.agencyId;

      const where = {
        agencyId,
        ...(propertyId && { propertyId }),
        ...(startDate &&
          endDate && {
            expenseDate: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      };

      const [totalExpenses, byCategory, byStatus, byProperty] =
        await Promise.all([
          prisma.expense.aggregate({
            where,
            _sum: { amount: true },
            _count: true,
          }),
          prisma.expense.groupBy({
            by: ["category"],
            where,
            _sum: { amount: true },
            _count: true,
          }),
          prisma.expense.groupBy({
            by: ["status"],
            where,
            _sum: { amount: true },
            _count: true,
          }),
          propertyId
            ? null
            : prisma.expense.groupBy({
                by: ["propertyId"],
                where: { ...where, propertyId: { not: null } },
                _sum: { amount: true },
                _count: true,
              }),
        ]);

      return successResponse(
        res,
        {
          total: {
            amount: totalExpenses._sum.amount || 0,
            count: totalExpenses._count || 0,
          },
          byCategory,
          byStatus,
          byProperty: byProperty || [],
        },
        "Expense summary retrieved"
      );
    } catch (error) {
      logger.error("Error fetching expense summary:", error);
      return errorResponse(res, "Failed to fetch expense summary", 500);
    }
  })
);

// GET /expenses/:id - Get specific expense
expenseRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const agencyId = req.user.agencyId;
      const expense = await prisma.expense.findFirst({
        where: {
          id: req.params.id,
          agencyId,
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
            },
          },
        },
      });

      if (!expense) throw new NotFoundError("Expense not found");

      return successResponse(res, expense, "Expense retrieved");
    } catch (error) {
      logger.error("Error fetching expense:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to fetch expense", 500);
    }
  })
);

// POST /expenses - Create new expense
expenseRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const parsed = createExpenseSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError("Validation failed", parsed.error.flatten());

      const agencyId = req.user.agencyId;
      const data = parsed.data;

      // Verify property belongs to agency if propertyId is provided
      if (data.propertyId) {
        const property = await prisma.property.findFirst({
          where: {
            id: data.propertyId,
            agencyId,
          },
        });

        if (!property) throw new NotFoundError("Property not found");
      }

      const expense = await prisma.expense.create({
        data: {
          ...data,
          agencyId,
          createdBy: req.user.id,
          expenseDate: data.expenseDate
            ? new Date(data.expenseDate)
            : new Date(),
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
            },
          },
        },
      });

      logger.info("Expense created", {
        expenseId: expense.id,
        agencyId,
        amount: expense.amount,
      });

      return successResponse(res, expense, "Expense created", 201);
    } catch (error) {
      logger.error("Error creating expense:", error);
      if (error instanceof ValidationError || error instanceof NotFoundError)
        throw error;
      return errorResponse(res, "Failed to create expense", 500);
    }
  })
);

// PUT /expenses/:id - Update expense
expenseRouter.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const parsed = updateExpenseSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError("Validation failed", parsed.error.flatten());

      const agencyId = req.user.agencyId;
      const data = parsed.data;

      // Check if expense exists and belongs to agency
      const existingExpense = await prisma.expense.findFirst({
        where: {
          id: req.params.id,
          agencyId,
        },
      });

      if (!existingExpense) throw new NotFoundError("Expense not found");

      // Verify property belongs to agency if propertyId is being updated
      if (data.propertyId) {
        const property = await prisma.property.findFirst({
          where: {
            id: data.propertyId,
            agencyId,
          },
        });

        if (!property) throw new NotFoundError("Property not found");
      }

      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          ...data,
          ...(data.expenseDate && { expenseDate: new Date(data.expenseDate) }),
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
            },
          },
        },
      });

      logger.info("Expense updated", {
        expenseId: expense.id,
        agencyId,
      });

      return successResponse(res, expense, "Expense updated");
    } catch (error) {
      logger.error("Error updating expense:", error);
      if (error instanceof ValidationError || error instanceof NotFoundError)
        throw error;
      return errorResponse(res, "Failed to update expense", 500);
    }
  })
);

// DELETE /expenses/:id - Delete expense
expenseRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      const agencyId = req.user.agencyId;

      // Check if expense exists and belongs to agency
      const expense = await prisma.expense.findFirst({
        where: {
          id: req.params.id,
          agencyId,
        },
      });

      if (!expense) throw new NotFoundError("Expense not found");

      await prisma.expense.delete({
        where: { id: req.params.id },
      });

      logger.info("Expense deleted", {
        expenseId: req.params.id,
        agencyId,
      });

      return successResponse(
        res,
        { message: "Expense deleted successfully" },
        "Expense deleted"
      );
    } catch (error) {
      logger.error("Error deleting expense:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to delete expense", 500);
    }
  })
);

// POST /expenses/:id/approve - Approve expense
expenseRouter.post(
  "/:id/approve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      const agencyId = req.user.agencyId;

      const expense = await prisma.expense.findFirst({
        where: {
          id: req.params.id,
          agencyId,
        },
      });

      if (!expense) throw new NotFoundError("Expense not found");

      const updatedExpense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          status: "APPROVED",
          approvedBy: req.user.id,
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
            },
          },
        },
      });

      logger.info("Expense approved", {
        expenseId: req.params.id,
        agencyId,
        approvedBy: req.user.id,
      });

      return successResponse(res, updatedExpense, "Expense approved");
    } catch (error) {
      logger.error("Error approving expense:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to approve expense", 500);
    }
  })
);

// POST /expenses/:id/reject - Reject expense
expenseRouter.post(
  "/:id/reject",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      const agencyId = req.user.agencyId;

      const expense = await prisma.expense.findFirst({
        where: {
          id: req.params.id,
          agencyId,
        },
      });

      if (!expense) throw new NotFoundError("Expense not found");

      const updatedExpense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          status: "REJECTED",
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
            },
          },
        },
      });

      logger.info("Expense rejected", {
        expenseId: req.params.id,
        agencyId,
      });

      return successResponse(res, updatedExpense, "Expense rejected");
    } catch (error) {
      logger.error("Error rejecting expense:", error);
      if (error instanceof NotFoundError) throw error;
      return errorResponse(res, "Failed to reject expense", 500);
    }
  })
);

export default expenseRouter;
