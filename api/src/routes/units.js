import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const unitRouter = Router();

unitRouter.use(requireAuth);

const unitSchema = z.object({
  propertyId: z.string(),
  unitNumber: z.string(),
  type: z.enum(["SINGLE_ROOM","DOUBLE_ROOM","BEDSEATER","ONE_BEDROOM","TWO_BEDROOM","THREE_BEDROOM","MAISONETTE","BUNGALOW"]),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  sizeSqFt: z.number().int().nonnegative().optional(),
  rentAmount: z.number().int().positive(),
});

unitRouter.get("/", async (req, res) => {
  const items = await prisma.unit.findMany({ where: { property: { agencyId: req.user.agencyId } } });
  res.json(items);
});

unitRouter.post("/", async (req, res) => {
  const parsed = unitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await prisma.unit.create({ data: parsed.data });
  res.status(201).json(created);
});

unitRouter.put(":id/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(["VACANT","OCCUPIED","MAINTENANCE","OFF_MARKET"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.unit.findFirst({ where: { id: req.params.id, property: { agencyId: req.user.agencyId } } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.unit.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
  res.json(updated);
});
