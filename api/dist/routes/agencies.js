import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
export const agencyRouter = Router();
agencyRouter.use(requireAuth);
agencyRouter.get("/me", async (req, res) => {
    const agencyId = req.user.agencyId;
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency)
        return res.status(404).json({ error: "Not found" });
    res.json(agency);
});
const updateSchema = z.object({ name: z.string().min(2) });
agencyRouter.put("/me", async (req, res) => {
    const agencyId = req.user.agencyId;
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.flatten());
    const updated = await prisma.agency.update({ where: { id: agencyId }, data: parsed.data });
    res.json(updated);
});
