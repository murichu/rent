import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export const agentRouter = Router();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  email: z.string().email().optional(),
  commissionRate: z.number().min(0).max(100).default(10), // Percentage
});

const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
});

const assignPropertiesSchema = z.object({
  propertyIds: z.array(z.string()),
});

// GET /agents - List all agents for the agency
agentRouter.get("/", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const where = {
      agencyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          leases: {
            include: {
              lease: {
                include: {
                  property: { select: { title: true } },
                  unit: { select: { unitNumber: true } },
                  tenant: { select: { name: true } },
                },
              },
            },
          },
          settings: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agent.count({ where }),
    ]);

    res.json({
      agents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

// GET /agents/:id - Get specific agent details
agentRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
      include: {
        leases: {
          include: {
            lease: {
              include: {
                property: { select: { title: true, address: true } },
                unit: { select: { unitNumber: true } },
                tenant: { select: { name: true, phone: true, email: true } },
              },
            },
          },
        },
        settings: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json(agent);
  } catch (error) {
    console.error("Error fetching agent:", error);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

// POST /agents - Create new agent
agentRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { name, phone, email, commissionRate } = parsed.data;

    // Check if agent with same phone already exists in agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const existingAgent = await prisma.agent.findFirst({
      where: {
        phone,
        agencyId,
      },
    });

    if (existingAgent) {
      return res.status(409).json({ 
        error: "Agent with this phone number already exists" 
      });
    }

    // Check if email is provided and already exists
    if (email) {
      const existingEmail = await prisma.agent.findFirst({
        where: {
          email,
          agencyId,
        },
      });

      if (existingEmail) {
        return res.status(409).json({ 
          error: "Agent with this email already exists" 
        });
      }
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        phone,
        email,
        commissionRate,
        agencyId,
      },
      include: {
        settings: true,
      },
    });

    res.status(201).json(agent);
  } catch (error) {
    console.error("Error creating agent:", error);
    res.status(500).json({ error: "Failed to create agent" });
  }
});

// PUT /agents/:id - Update agent
agentRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = updateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { name, phone, email, commissionRate } = parsed.data;

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const existingAgent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!existingAgent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Check for phone conflicts if phone is being updated
    if (phone && phone !== existingAgent.phone) {
      const phoneConflict = await prisma.agent.findFirst({
        where: {
          phone,
          agencyId,
          id: { not: req.params.id },
        },
      });

      if (phoneConflict) {
        return res.status(409).json({ 
          error: "Another agent with this phone number already exists" 
        });
      }
    }

    // Check for email conflicts if email is being updated
    if (email && email !== existingAgent.email) {
      const emailConflict = await prisma.agent.findFirst({
        where: {
          email,
          agencyId,
          id: { not: req.params.id },
        },
      });

      if (emailConflict) {
        return res.status(409).json({ 
          error: "Another agent with this email already exists" 
        });
      }
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(commissionRate !== undefined && { commissionRate }),
      },
      include: {
        leases: {
          include: {
            lease: {
              include: {
                property: { select: { title: true } },
                unit: { select: { unitNumber: true } },
                tenant: { select: { name: true } },
              },
            },
          },
        },
        settings: true,
      },
    });

    res.json(updatedAgent);
  } catch (error) {
    console.error("Error updating agent:", error);
    res.status(500).json({ error: "Failed to update agent" });
  }
});

// DELETE /agents/:id - Delete agent
agentRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
      include: {
        leases: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Check if agent has active leases
    if (agent.leases.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete agent with active lease assignments. Please reassign or remove lease assignments first." 
      });
    }

    await prisma.agent.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Agent deleted successfully" });
  } catch (error) {
    console.error("Error deleting agent:", error);
    res.status(500).json({ error: "Failed to delete agent" });
  }
});

// POST /agents/:id/assign-properties - Assign properties to agent
agentRouter.post("/:id/assign-properties", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = assignPropertiesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { propertyIds } = parsed.data;

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Verify all properties belong to the agency
    const properties = await prisma.property.findMany({
      where: {
        id: { in: propertyIds },
        agencyId,
      },
    });

    if (properties.length !== propertyIds.length) {
      return res.status(400).json({ 
        error: "Some properties do not exist or do not belong to your agency" 
      });
    }

    // Get active leases for these properties
    const activeLeases = await prisma.lease.findMany({
      where: {
        OR: [
          { propertyId: { in: propertyIds } },
          { 
            unit: {
              propertyId: { in: propertyIds }
            }
          }
        ],
        endDate: { gte: new Date() }, // Active leases
        agencyId,
      },
    });

    // Create agent lease assignments
    const agentLeaseData = activeLeases.map(lease => ({
      agentId: agent.id,
      leaseId: lease.id,
      commission: (lease.rentAmount * agent.commissionRate) / 100,
    }));

    // Remove existing assignments for these leases to avoid duplicates
    await prisma.agentLease.deleteMany({
      where: {
        leaseId: { in: activeLeases.map(l => l.id) },
      },
    });

    // Create new assignments
    if (agentLeaseData.length > 0) {
      await prisma.agentLease.createMany({
        data: agentLeaseData,
      });
    }

    // Get updated agent with assignments
    const updatedAgent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        leases: {
          include: {
            lease: {
              include: {
                property: { select: { title: true, address: true } },
                unit: { select: { unitNumber: true } },
                tenant: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    res.json({
      message: `Successfully assigned ${activeLeases.length} active leases to agent`,
      agent: updatedAgent,
      assignedLeases: activeLeases.length,
    });
  } catch (error) {
    console.error("Error assigning properties to agent:", error);
    res.status(500).json({ error: "Failed to assign properties to agent" });
  }
});

// DELETE /agents/:id/unassign-properties - Remove property assignments from agent
agentRouter.delete("/:id/unassign-properties", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = assignPropertiesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { propertyIds } = parsed.data;

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Get leases for the specified properties
    const leasesToUnassign = await prisma.lease.findMany({
      where: {
        OR: [
          { propertyId: { in: propertyIds } },
          { 
            unit: {
              propertyId: { in: propertyIds }
            }
          }
        ],
        agencyId,
      },
    });

    // Remove agent lease assignments
    const deletedAssignments = await prisma.agentLease.deleteMany({
      where: {
        agentId: agent.id,
        leaseId: { in: leasesToUnassign.map(l => l.id) },
      },
    });

    res.json({
      message: `Successfully removed ${deletedAssignments.count} lease assignments from agent`,
      removedAssignments: deletedAssignments.count,
    });
  } catch (error) {
    console.error("Error removing property assignments:", error);
    res.status(500).json({ error: "Failed to remove property assignments" });
  }
});

// GET /agents/:id/commissions - Get agent commission history
agentRouter.get("/:id/commissions", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if agent exists and belongs to agency (or user is the agent)
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const where = {
      agentId: req.params.id,
      ...(status && { paid: status === "paid" }),
    };

    const [commissions, total] = await Promise.all([
      prisma.agentLease.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          lease: {
            include: {
              property: { select: { title: true, address: true } },
              unit: { select: { unitNumber: true } },
              tenant: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agentLease.count({ where }),
    ]);

    // Calculate summary statistics
    const totalEarned = await prisma.agentLease.aggregate({
      where: { agentId: req.params.id, paid: true },
      _sum: { commission: true },
    });

    const totalPending = await prisma.agentLease.aggregate({
      where: { agentId: req.params.id, paid: false },
      _sum: { commission: true },
    });

    res.json({
      commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      summary: {
        totalEarned: totalEarned._sum.commission || 0,
        totalPending: totalPending._sum.commission || 0,
        totalCommissions: total,
      },
    });
  } catch (error) {
    console.error("Error fetching agent commissions:", error);
    res.status(500).json({ error: "Failed to fetch agent commissions" });
  }
});

// PUT /agents/:id/commissions/:commissionId/pay - Mark commission as paid
agentRouter.put("/:id/commissions/:commissionId/pay", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Update commission as paid
    const commission = await prisma.agentLease.update({
      where: {
        id: req.params.commissionId,
        agentId: req.params.id,
      },
      data: {
        paid: true,
        paidAt: new Date(),
      },
      include: {
        lease: {
          include: {
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
            tenant: { select: { name: true } },
          },
        },
      },
    });

    // Update agent's total earned
    const totalEarned = await prisma.agentLease.aggregate({
      where: { agentId: req.params.id, paid: true },
      _sum: { commission: true },
    });

    await prisma.agent.update({
      where: { id: req.params.id },
      data: { totalEarned: totalEarned._sum.commission || 0 },
    });

    res.json({
      message: "Commission marked as paid successfully",
      commission,
    });
  } catch (error) {
    console.error("Error marking commission as paid:", error);
    res.status(500).json({ error: "Failed to mark commission as paid" });
  }
});

// ===== AGENT COMMISSION PAYMENT ROUTES =====

// GET /agents/:id/commission-payments - Get commission payment history for agent
agentRouter.get("/:id/commission-payments", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, period, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Build payment filter
    const paymentFilter = {
      agentId: req.params.id,
      agencyId,
    };

    if (period) {
      paymentFilter.paymentPeriod = period;
    }

    if (status) {
      paymentFilter.status = status.toUpperCase();
    }

    const [payments, total] = await Promise.all([
      prisma.agentCommissionPayment.findMany({
        where: paymentFilter,
        include: {
          agent: {
            select: { name: true, phone: true },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { paymentDate: "desc" },
      }),
      prisma.agentCommissionPayment.count({ where: paymentFilter }),
    ]);

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching agent commission payments:", error);
    res.status(500).json({ error: "Failed to fetch agent commission payments" });
  }
});

// POST /agents/:id/commission-payments - Create commission payment for agent
agentRouter.post("/:id/commission-payments", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      amount, 
      paymentDate, 
      paymentPeriod, 
      rentCollected, 
      commissionRate, 
      method, 
      referenceNumber, 
      description, 
      leaseIds, 
      properties 
    } = req.body;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required" });
    }

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Check for duplicate payment period
    const existingPayment = await prisma.agentCommissionPayment.findFirst({
      where: {
        agentId: req.params.id,
        paymentPeriod,
      },
    });

    if (existingPayment) {
      return res.status(400).json({ 
        error: `Commission payment for period ${paymentPeriod} already exists` 
      });
    }

    // Create the payment
    const payment = await prisma.agentCommissionPayment.create({
      data: {
        agentId: req.params.id,
        agencyId,
        amount: amount || 0,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentPeriod,
        rentCollected: rentCollected || 0,
        commissionRate: commissionRate || agent.commissionRate,
        method: method || "MANUAL",
        referenceNumber,
        description,
        paidBy: req.user?.id || req.agent?.agentId,
        status: "COMPLETED",
        leaseIds: leaseIds || [],
        properties: properties || [],
      },
      include: {
        agent: {
          select: { name: true, phone: true },
        },
      },
    });

    res.status(201).json({
      message: "Commission payment created successfully",
      payment,
    });
  } catch (error) {
    console.error("Error creating agent commission payment:", error);
    res.status(500).json({ error: "Failed to create agent commission payment" });
  }
});

// POST /agents/:id/auto-commission-payment - Auto-calculate and create commission payment
agentRouter.post("/:id/auto-commission-payment", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { paymentPeriod, properties } = req.body;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
    }

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Import and validate payment period
    const { validatePaymentPeriod, autoCalculateAgentCommissionPayment } = await import("../services/commissionCalculation.js");
    validatePaymentPeriod(paymentPeriod);

    // Auto-calculate and create payment
    const result = await autoCalculateAgentCommissionPayment(req.params.id, paymentPeriod, properties || []);

    // Update agent's total earned
    await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        totalEarned: {
          increment: result.calculation.totalCommissionAmount / 100, // Convert cents to currency units
        },
      },
    });

    res.status(201).json({
      message: "Auto-commission payment created successfully",
      payment: result.payment,
      calculation: result.calculation,
    });
  } catch (error) {
    console.error("Error creating auto-commission payment:", error);
    res.status(500).json({ error: error.message || "Failed to create auto-commission payment" });
  }
});

// PUT /agents/:id/commission-payments/:paymentId - Update commission payment
agentRouter.put("/:id/commission-payments/:paymentId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      amount, 
      paymentDate, 
      method, 
      referenceNumber, 
      description, 
      status 
    } = req.body;

    // Check if payment exists
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const existingPayment = await prisma.agentCommissionPayment.findFirst({
      where: {
        id: req.params.paymentId,
        agentId: req.params.id,
        agencyId,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({ error: "Commission payment not found" });
    }

    // Update the payment
    const updatedPayment = await prisma.agentCommissionPayment.update({
      where: { id: req.params.paymentId },
      data: {
        ...(amount !== undefined && { amount }),
        ...(paymentDate && { paymentDate: new Date(paymentDate) }),
        ...(method && { method }),
        ...(referenceNumber !== undefined && { referenceNumber }),
        ...(description !== undefined && { description }),
        ...(status && { status: status.toUpperCase() }),
      },
      include: {
        agent: {
          select: { name: true, phone: true },
        },
      },
    });

    res.json({
      message: "Commission payment updated successfully",
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Error updating agent commission payment:", error);
    res.status(500).json({ error: "Failed to update agent commission payment" });
  }
});

// DELETE /agents/:id/commission-payments/:paymentId - Delete commission payment
agentRouter.delete("/:id/commission-payments/:paymentId", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if payment exists
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const existingPayment = await prisma.agentCommissionPayment.findFirst({
      where: {
        id: req.params.paymentId,
        agentId: req.params.id,
        agencyId,
      },
    });

    if (!existingPayment) {
      return res.status(404).json({ error: "Commission payment not found" });
    }

    // Delete the payment
    await prisma.agentCommissionPayment.delete({
      where: { id: req.params.paymentId },
    });

    res.json({
      message: "Commission payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting agent commission payment:", error);
    res.status(500).json({ error: "Failed to delete agent commission payment" });
  }
});

// GET /agents/:id/commission-payments/:paymentId/receipt - Generate commission payment receipt
agentRouter.get("/:id/commission-payments/:paymentId/receipt", requireAuth, async (req, res) => {
  try {
    // Check if payment exists
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const payment = await prisma.agentCommissionPayment.findFirst({
      where: {
        id: req.params.paymentId,
        agentId: req.params.id,
        agencyId,
      },
      include: {
        agent: {
          select: { name: true, phone: true, email: true },
        },
        agency: {
          select: { name: true },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Commission payment not found" });
    }

    // Generate receipt
    const receipt = {
      receiptNumber: `AC-${payment.id.slice(-8).toUpperCase()}`,
      paymentId: payment.id,
      agentName: payment.agent?.name,
      agentPhone: payment.agent?.phone,
      agentEmail: payment.agent?.email,
      agencyName: payment.agency?.name,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentPeriod: payment.paymentPeriod,
      rentCollected: payment.rentCollected,
      commissionRate: payment.commissionRate,
      method: payment.method,
      referenceNumber: payment.referenceNumber,
      description: payment.description,
      generatedAt: new Date().toISOString(),
    };

    res.json({
      message: "Commission payment receipt generated successfully",
      receipt,
    });
  } catch (error) {
    console.error("Error generating commission payment receipt:", error);
    res.status(500).json({ error: "Failed to generate commission payment receipt" });
  }
});

// GET /commission-payments/summary - Get commission payment summary for agency
agentRouter.get("/commission-payments/summary", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Build filter for payments
    const paymentFilter = {
      agencyId,
    };

    if (period) {
      paymentFilter.paymentPeriod = period;
    }

    if (startDate && endDate) {
      paymentFilter.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [totalPayments, totalAmount, paymentsByMethod, recentPayments] = await Promise.all([
      prisma.agentCommissionPayment.count({ where: paymentFilter }),
      prisma.agentCommissionPayment.aggregate({
        where: paymentFilter,
        _sum: { amount: true },
      }),
      prisma.agentCommissionPayment.groupBy({
        by: ['method'],
        where: paymentFilter,
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.agentCommissionPayment.findMany({
        where: paymentFilter,
        include: {
          agent: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { paymentDate: "desc" },
        take: 5,
      }),
    ]);

    res.json({
      summary: {
        totalPayments,
        totalAmount: totalAmount._sum.amount || 0,
        paymentsByMethod: paymentsByMethod.map(method => ({
          method: method.method,
          count: method._count._all,
          amount: method._sum.amount || 0,
        })),
      },
      recentPayments,
    });
  } catch (error) {
    console.error("Error fetching commission payment summary:", error);
    res.status(500).json({ error: "Failed to fetch commission payment summary" });
  }
});

// ===== BULK COMMISSION PROCESSING ROUTES =====

// POST /agents/bulk-commission-payments - Bulk process commission payments for all agents
agentRouter.post("/bulk-commission-payments", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { paymentPeriod } = req.body;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Import and validate payment period
    const { validatePaymentPeriod, bulkProcessAgentCommissions } = await import("../services/commissionCalculation.js");
    validatePaymentPeriod(paymentPeriod);

    // Bulk process agent commissions
    const results = await bulkProcessAgentCommissions(agencyId, paymentPeriod);

    res.json({
      message: `Bulk commission processing completed. ${results.totalProcessed} agents processed successfully.`,
      results,
    });
  } catch (error) {
    console.error("Error bulk processing agent commissions:", error);
    res.status(500).json({ error: error.message || "Failed to bulk process agent commissions" });
  }
});

// POST /caretakers/bulk-commission-payments - Bulk process commission payments for all caretakers
agentRouter.post("/caretakers/bulk-commission-payments", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { paymentPeriod } = req.body;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Import and validate payment period
    const { validatePaymentPeriod, bulkProcessCaretakerCommissions } = await import("../services/commissionCalculation.js");
    validatePaymentPeriod(paymentPeriod);

    // Bulk process caretaker commissions
    const results = await bulkProcessCaretakerCommissions(agencyId, paymentPeriod);

    res.json({
      message: `Bulk caretaker payment processing completed. ${results.totalProcessed} caretakers processed successfully.`,
      results,
    });
  } catch (error) {
    console.error("Error bulk processing caretaker payments:", error);
    res.status(500).json({ error: error.message || "Failed to bulk process caretaker payments" });
  }
});

// GET /payments/agency-summary - Get comprehensive payment summary for agency
agentRouter.get("/payments/agency-summary", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { paymentPeriod } = req.query;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Import and validate payment period
    const { validatePaymentPeriod, getAgencyPaymentSummary } = await import("../services/commissionCalculation.js");
    validatePaymentPeriod(paymentPeriod);

    // Get comprehensive payment summary
    const summary = await getAgencyPaymentSummary(agencyId, paymentPeriod);

    res.json({
      message: "Agency payment summary retrieved successfully",
      summary,
    });
  } catch (error) {
    console.error("Error fetching agency payment summary:", error);
    res.status(500).json({ error: error.message || "Failed to fetch agency payment summary" });
  }
});

// ===== AGENT COMMISSION CALCULATION ROUTES =====

// POST /agents/:id/calculate-commission - Calculate commission for agent
agentRouter.post("/:id/calculate-commission", requireAuth, async (req, res) => {
  try {
    const { paymentPeriod, properties } = req.body;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
    }

    // Check if agent exists and belongs to agency
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Import and validate payment period
    const { validatePaymentPeriod, calculateAgentCommission } = await import("../services/commissionCalculation.js");
    validatePaymentPeriod(paymentPeriod);

    // Calculate commission
    const calculation = await calculateAgentCommission(req.params.id, paymentPeriod, properties || []);

    res.json({
      message: "Commission calculated successfully",
      calculation,
    });
  } catch (error) {
    console.error("Error calculating agent commission:", error);
    res.status(500).json({ error: error.message || "Failed to calculate commission" });
  }
});

// GET /agents/commissions/summary - Get commission summary for all agents
agentRouter.get("/commissions/summary", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { paymentPeriod } = req.query;

    if (!paymentPeriod) {
      return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Import and validate payment period
    const { validatePaymentPeriod, getAgencyCommissionSummary } = await import("../services/commissionCalculation.js");
    validatePaymentPeriod(paymentPeriod);

    // Get commission summary
    const summary = await getAgencyCommissionSummary(agencyId, paymentPeriod);

    res.json({
      message: "Commission summary retrieved successfully",
      summary,
    });
  } catch (error) {
    console.error("Error fetching commission summary:", error);
    res.status(500).json({ error: error.message || "Failed to fetch commission summary" });
  }
});