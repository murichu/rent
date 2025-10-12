import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { computeTenantRating } from "../services/rating.js";

export const paymentRouter = Router();

paymentRouter.use(requireAuth);

const paymentSchema = z.object({
  leaseId: z.string(),
  amount: z.number().int().positive(),
  paidAt: z.string().transform((s) => new Date(s)),
  method: z.enum(["MPESA_C2B", "MANUAL"]).default("MANUAL"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  invoiceId: z.string().optional(),
});

paymentRouter.get("/", async (req, res) => {
  const items = await prisma.payment.findMany({ where: { agencyId: req.user.agencyId } });
  res.json(items);
});

paymentRouter.post("/", async (req, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { leaseId, invoiceId, ...rest } = parsed.data;
  const created = await prisma.payment.create({
    data: {
      leaseId,
      invoiceId,
      agencyId: req.user.agencyId,
      ...rest,
    },
  });
  if (invoiceId) {
    const payments = await prisma.payment.aggregate({ _sum: { amount: true }, where: { invoiceId } });
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const totalPaid = payments._sum.amount || 0;
    let status = "PENDING";
    if (totalPaid > 0 && totalPaid < (invoice?.amount || 0)) status = "PARTIAL";
    if (totalPaid >= (invoice?.amount || 0)) status = "PAID";
    await prisma.invoice.update({ where: { id: invoiceId }, data: { totalPaid, status } });
  }
  // Recompute rating for tenant associated with this lease
  const lease = await prisma.lease.findUnique({ where: { id: created.leaseId }, select: { tenantId: true } });
  if (lease?.tenantId) await computeTenantRating(lease.tenantId);
  res.status(201).json(created);
});

paymentRouter.get(":id", async (req, res) => {
  const item = await prisma.payment.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

paymentRouter.put(":id", async (req, res) => {
  const parsed = paymentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.payment.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.payment.update({ where: { id: existing.id }, data: parsed.data });
  res.json(updated);
});

paymentRouter.delete(":id", async (req, res) => {
  const existing = await prisma.payment.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.payment.delete({ where: { id: existing.id } });
  res.status(204).end();
});
