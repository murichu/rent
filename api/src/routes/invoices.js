import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth);

invoiceRouter.get("/", async (req, res) => {
  const items = await prisma.invoice.findMany({ where: { agencyId: req.user.agencyId } });
  res.json(items);
});

invoiceRouter.get("/generate/:leaseId", async (req, res) => {
  const lease = await prisma.lease.findFirst({ where: { id: req.params.leaseId, agencyId: req.user.agencyId } });
  if (!lease) return res.status(404).json({ error: "Lease not found" });

  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1; // 1-12

  const agency = await prisma.agency.findUnique({ where: { id: req.user.agencyId } });
  const issuedAt = new Date(now.getFullYear(), now.getMonth(), agency?.invoiceDayOfMonth || 28);
  const dueAt = new Date(now.getFullYear(), now.getMonth() + 1, agency?.dueDayOfMonth || 5);

  const existing = await prisma.invoice.findFirst({
    where: { leaseId: lease.id, periodYear, periodMonth },
  });
  if (existing) return res.json(existing);

  const created = await prisma.invoice.create({
    data: {
      leaseId: lease.id,
      agencyId: req.user.agencyId,
      amount: lease.rentAmount,
      periodYear,
      periodMonth,
      issuedAt,
      dueAt,
    },
  });
  res.status(201).json(created);
});

const statusUpdateSchema = z.object({ status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]) });
invoiceRouter.put(":id/status", async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.invoice.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
  res.json(updated);
});
