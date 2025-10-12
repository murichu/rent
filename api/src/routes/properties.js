import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const propertyRouter = Router();
propertyRouter.use(requireAuth);

const propertySchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  sizeSqFt: z.number().int().nonnegative().optional(),
  rentAmount: z.number().int().nonnegative().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "OFF_MARKET"]).optional(),
});

propertyRouter.get("/", async (req, res) => {
  const items = await prisma.property.findMany({ where: { agencyId: req.user.agencyId } });
  res.json(items);
});

propertyRouter.post("/", async (req, res) => {
  const parsed = propertySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await prisma.property.create({ data: { ...parsed.data, agencyId: req.user.agencyId } });
  res.status(201).json(created);
});

propertyRouter.get(":id", async (req, res) => {
  const item = await prisma.property.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

propertyRouter.put(":id", async (req, res) => {
  const parsed = propertySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.property.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.property.update({ where: { id: existing.id }, data: parsed.data });
  res.json(updated);
});

propertyRouter.delete(":id", async (req, res) => {
  const existing = await prisma.property.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.property.delete({ where: { id: existing.id } });
  res.status(204).end();
});
