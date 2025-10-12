import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const penaltyRouter = Router();

penaltyRouter.use(requireAuth);

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
  }
  res.json({ created: created.length });
});
