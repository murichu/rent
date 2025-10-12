import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
export const tenantRouter = Router();
tenantRouter.use(requireAuth);
const tenantSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
});
tenantRouter.get("/", async (req, res) => {
    const agencyId = req.user.agencyId;
    const items = await prisma.tenant.findMany({ where: { agencyId } });
    res.json(items);
});
tenantRouter.post("/", async (req, res) => {
    const agencyId = req.user.agencyId;
    const parsed = tenantSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.flatten());
    const created = await prisma.tenant.create({ data: { ...parsed.data, agencyId } });
    res.status(201).json(created);
});
tenantRouter.get(":id", async (req, res) => {
    const agencyId = req.user.agencyId;
    const item = await prisma.tenant.findFirst({ where: { id: req.params.id, agencyId } });
    if (!item)
        return res.status(404).json({ error: "Not found" });
    res.json(item);
});
tenantRouter.put(":id", async (req, res) => {
    const agencyId = req.user.agencyId;
    const parsed = tenantSchema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.flatten());
    const existing = await prisma.tenant.findFirst({ where: { id: req.params.id, agencyId } });
    if (!existing)
        return res.status(404).json({ error: "Not found" });
    const updated = await prisma.tenant.update({ where: { id: existing.id }, data: parsed.data });
    res.json(updated);
});
tenantRouter.delete(":id", async (req, res) => {
    const agencyId = req.user.agencyId;
    const existing = await prisma.tenant.findFirst({ where: { id: req.params.id, agencyId } });
    if (!existing)
        return res.status(404).json({ error: "Not found" });
    await prisma.tenant.delete({ where: { id: existing.id } });
    res.status(204).end();
});
