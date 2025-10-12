import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { computeTenantRating, computeAgencyRatings } from "../services/rating.js";

export const ratingRouter = Router();

ratingRouter.use(requireAuth);

// Manual ratings removed; system is automated.

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
