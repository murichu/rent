import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const noticeRouter = Router();

noticeRouter.use(requireAuth);

const noticeSchema = z.object({
  leaseId: z.string(),
  plannedVacateAt: z.string().transform((s) => new Date(s)),
});

// Tenant posts notice to vacate
noticeRouter.post("/", async (req, res) => {
  const parsed = noticeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const lease = await prisma.lease.findFirst({ where: { id: parsed.data.leaseId, agencyId: req.user.agencyId } });
  if (!lease) return res.status(404).json({ error: "Lease not found" });
  const created = await prisma.vacateNotice.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      unitId: lease.unitId || undefined,
      agencyId: req.user.agencyId,
      noticeDate: new Date(),
      plannedVacateAt: parsed.data.plannedVacateAt,
    },
  });
  res.status(201).json(created);
});

// Mark completed with actual date
noticeRouter.put(":id/complete", async (req, res) => {
  const parsed = z.object({ actualVacateAt: z.string().transform((s) => new Date(s)) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.vacateNotice.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.vacateNotice.update({ where: { id: existing.id }, data: { actualVacateAt: parsed.data.actualVacateAt, status: "COMPLETED" } });
  res.json(updated);
});
