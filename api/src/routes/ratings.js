import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { computeTenantRating, computeAgencyRatings } from "../services/rating.js";

export const ratingRouter = Router();

ratingRouter.use(requireAuth);

// Manual feedback still allowed; contributes to average baseline
const ratingSchema = z.object({ tenantId: z.string(), stars: z.number().int().min(1).max(5), comment: z.string().optional(), unitId: z.string().optional(), propertyId: z.string().optional() });

ratingRouter.post("/", async (req, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await prisma.tenantRating.create({ data: { ...parsed.data, ratedByUserId: req.user.userId } });
  const result = await computeTenantRating(parsed.data.tenantId);
  res.status(201).json({ rating: created, recomputed: result });
});

// Recompute one tenant (id in path)
ratingRouter.post("/recompute/:tenantId", async (req, res) => {
  const out = await computeTenantRating(req.params.tenantId);
  res.json(out);
});

// Recompute all tenants in my agency
ratingRouter.post("/recompute", async (req, res) => {
  const out = await computeAgencyRatings(req.user.agencyId);
  res.json({ updated: out.length, details: out });
});
