import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import logger from "../utils/logger.js";

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
  paymentMethod: z
    .enum(["CASH", "BANK_TRANSFER", "MPESA", "CARD"])
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringPeriod: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "PAID"]).optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

// GET /expenses - List all expenses for the agency
expenseRouter.get("/", requireAuth, async (req, res) => {
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

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// GET /expenses/summary - Get expense summary
expenseRouter.get("/summary", requireAuth, async (req, res) => {
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

    const [totalExpenses, byCategory, byStatus, byProperty] = await Promise.all([
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

    res.json({
      total: {
        amount: totalExpenses._sum.amount || 0,
        count: totalExpenses._count || 0,
      },
      byCategory,
      byStatus,
      byProperty: byProperty || [],
    });
  } catch (error) {
    logger.error("Error fetching expense summary:", error);
    res.status(500).json({ error: "Failed to fetch expense summary" });
  }
});

// GET /expenses/:id - Get specific expense
expenseRouter.get("/:id", requireAuth, async (req, res) => {
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

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    logger.error("Error fetching expense:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

// POST /expenses - Create new expense
expenseRouter.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

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

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
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

    res.status(201).json(expense);
  } catch (error) {
    logger.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// PUT /expenses/:id - Update expense
expenseRouter.put("/:id", requireAuth, async (req, res) => {
  try {
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user.agencyId;
    const data = parsed.data;

    // Check if expense exists and belongs to agency
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Verify property belongs to agency if propertyId is being updated
    if (data.propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: data.propertyId,
          agencyId,
        },
      });

      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
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

    res.json(expense);
  } catch (error) {
    logger.error("Error updating expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// DELETE /expenses/:id - Delete expense
expenseRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const agencyId = req.user.agencyId;

    // Check if expense exists and belongs to agency
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await prisma.expense.delete({
      where: { id: req.params.id },
    });

    logger.info("Expense deleted", {
      expenseId: req.params.id,
      agencyId,
    });

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    logger.error("Error deleting expense:", error);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

// POST /expenses/:id/approve - Approve expense
expenseRouter.post("/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const agencyId = req.user.agencyId;

    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

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

    res.json(updatedExpense);
  } catch (error) {
    logger.error("Error approving expense:", error);
    res.status(500).json({ error: "Failed to approve expense" });
  }
});

// POST /expenses/:id/reject - Reject expense
expenseRouter.post("/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const agencyId = req.user.agencyId;

    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

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

    res.json(updatedExpense);
  } catch (error) {
    logger.error("Error rejecting expense:", error);
    res.status(500).json({ error: "Failed to reject expense" });
  }
});

export default expenseRouter;
