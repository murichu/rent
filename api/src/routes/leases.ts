import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const leaseRouter = Router();

leaseRouter.use(requireAuth);

const leaseSchema = z.object({
  propertyId: z.string(),
  tenantId: z.string(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  rentAmount: z.number().int().positive(),
  paymentDayOfMonth: z.number().int().min(1).max(28),
});

leaseRouter.get("/", async (req, res) => {
  const agencyId = (req as any).user!.agencyId;
  const items = await prisma.lease.findMany({ where: { agencyId } });
  res.json(items);
});

leaseRouter.post("/", async (req, res) => {
  const agencyId = (req as any).user!.agencyId;
  const parsed = leaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { propertyId, tenantId, ...rest } = parsed.data;
  const created = await prisma.lease.create({
    data: {
      propertyId,
      tenantId,
      agencyId,
      ...rest,
    },
  });
  res.status(201).json(created);
});

leaseRouter.get(":id", async (req, res) => {
  const agencyId = (req as any).user!.agencyId;
  const item = await prisma.lease.findFirst({ where: { id: req.params.id, agencyId } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

leaseRouter.put(":id", async (req, res) => {
  const agencyId = (req as any).user!.agencyId;
  const parsed = leaseSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.lease.findFirst({ where: { id: req.params.id, agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.lease.update({ where: { id: existing.id }, data: parsed.data as any });
  res.json(updated);
});

leaseRouter.delete(":id", async (req, res) => {
  const agencyId = (req as any).user!.agencyId;
  const existing = await prisma.lease.findFirst({ where: { id: req.params.id, agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.lease.delete({ where: { id: existing.id } });
  res.status(204).end();
});
