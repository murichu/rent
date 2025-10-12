import { Router } from "express";
import { prisma } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

export const authRouter = Router();

const registerSchema = z.object({
  agencyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { agencyName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const agency = await prisma.agency.create({ data: { name: agencyName } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      agencyId: agency.id,
    },
  });

  const token = jwt.sign(
    { userId: user.id, agencyId: agency.id, email: user.email, name: user.name },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name }, agency });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user.id, agencyId: user.agencyId, email: user.email, name: user.name },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );

  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
