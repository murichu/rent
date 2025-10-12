import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const ratingRouter = Router();

ratingRouter.use(requireAuth);

const ratingSchema = z.object({ tenantId: z.string(), stars: z.number().int().min(1).max(5), comment: z.string().optional(), unitId: z.string().optional(), propertyId: z.string().optional() });

ratingRouter.post("/", async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await prisma.tenantRating.create({ data: { ...parsed.data, ratedByUserId: req.user.userId } });
  // Recompute average and risk flag
  const agg = await prisma.tenantRating.aggregate({ _avg: { stars: true }, where: { tenantId: parsed.data.tenantId } });
  const avg = Math.round((agg._avg.stars || 0) * 10) / 10;
  const isHighRisk = avg < 3; // threshold
  await prisma.tenant.update({ where: { id: parsed.data.tenantId }, data: { averageRating: avg, isHighRisk } });
  res.status(201).json(created);
});
