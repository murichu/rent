import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { computeTenantRating } from "../services/rating.js";

export const penaltyRouter = Router();

penaltyRouter.use(requireAuth);

// GET all penalties for the agency
penaltyRouter.get("/", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const penalties = await prisma.penalty.findMany({
      where: { agencyId },
      include: {
        invoice: {
          include: {
            lease: {
              include: {
                tenant: { select: { name: true, email: true, phone: true } },
                property: { select: { name: true } },
                unit: { select: { unitNumber: true } }
              }
            }
          }
        },
        notice: {
          include: {
            lease: {
              include: {
                tenant: { select: { name: true, email: true, phone: true } },
                property: { select: { name: true } },
                unit: { select: { unitNumber: true } }
              }
            }
          }
        }
      },
      orderBy: { computedAt: 'desc' }
    });
    
    res.json({ success: true, data: penalties, count: penalties.length });
  } catch (error) {
    console.error('Error fetching penalties:', error);
    res.status(500).json({ error: "Failed to fetch penalties" });
  }
});

// Compute late payment penalty: KES 500/day past due for invoices not fully paid
penaltyRouter.post("/late-payments/run", async (req, res) => {
  const agencyId = req.user.agencyId;
  const today = new Date();
  const overdue = await prisma.invoice.findMany({ where: { agencyId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }, dueAt: { lt: today } } });
  const created = [];
  for (const inv of overdue) {
    const days = Math.ceil((today.getTime() - inv.dueAt.getTime()) / (1000 * 60 * 60 * 24));
    const amount = days * 500;
    const pen = await prisma.penalty.create({ data: { agencyId, invoiceId: inv.id, type: "LATE_PAYMENT", amount, days, computedAt: today } });
    created.push(pen);
    await prisma.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } });
    // Recompute rating for tenant on that lease
    const lease = await prisma.lease.findUnique({ where: { id: inv.leaseId }, select: { tenantId: true } });
    if (lease?.tenantId) await computeTenantRating(lease.tenantId);
  }
  res.json({ created: created.length });
});

// Compute overstaying beyond planned vacate date: KES 1000/day
penaltyRouter.post("/overstay/run", async (req, res) => {
  const agencyId = req.user.agencyId;
  const today = new Date();
  const notices = await prisma.vacateNotice.findMany({ where: { agencyId, status: { in: ["PENDING", "OVERDUE"] }, plannedVacateAt: { lt: today } } });
  const created = [];
  for (const n of notices) {
    const days = Math.ceil((today.getTime() - n.plannedVacateAt.getTime()) / (1000 * 60 * 60 * 24));
    const amount = days * 1000;
    const pen = await prisma.penalty.create({ data: { agencyId, noticeId: n.id, type: "OVERSTAY", amount, days, computedAt: today } });
    created.push(pen);
    await prisma.vacateNotice.update({ where: { id: n.id }, data: { status: "OVERDUE" } });
    const lease = await prisma.lease.findUnique({ where: { id: n.leaseId }, select: { tenantId: true } });
    if (lease?.tenantId) await computeTenantRating(lease.tenantId);
  }
  res.json({ created: created.length });
});
