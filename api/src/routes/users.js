import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

usersRouter.get("/", async (req, res) => {
  const agencyId = req.user.agencyId;
  const users = await prisma.user.findMany({ where: { agencyId }, select: { id: true, email: true, name: true, role: true, createdAt: true } });
  res.json(users);
});

const createSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), role: z.enum(["ADMIN", "USER"]).optional() });
usersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { name, email, password, role } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email already in use" });
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({ data: { name, email, passwordHash, role: role || "USER", agencyId: req.user.agencyId } });
  res.status(201).json({ id: created.id, email: created.email, name: created.name, role: created.role });
});

const updateSchema = z.object({ name: z.string().min(2).optional(), role: z.enum(["ADMIN", "USER"]).optional() });
usersRouter.put(":id", async (req, res) => {
  const agencyId = req.user.agencyId;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.user.update({ where: { id: existing.id }, data: parsed.data });
  res.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role });
});

usersRouter.delete(":id", async (req, res) => {
  const agencyId = req.user.agencyId;
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.user.delete({ where: { id: existing.id } });
  res.status(204).end();
});
