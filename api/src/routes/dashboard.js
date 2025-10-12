import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// Me (user) dashboard
// Shows my agency summary scoped by my token
// role expands available metrics on FE

dashboardRouter.get("/me", async (req, res) => {
  const agencyId = req.user.agencyId;
  const [properties, tenants, leases, unpaidInvoices] = await Promise.all([
    prisma.property.count({ where: { agencyId } }),
    prisma.tenant.count({ where: { agencyId } }),
    prisma.lease.count({ where: { agencyId } }),
    prisma.invoice.count({ where: { agencyId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } } }),
  ]);
  res.json({ properties, tenants, leases, unpaidInvoices });
});

// Agency level detail

dashboardRouter.get("/agency", async (req, res) => {
  const agencyId = req.user.agencyId;
  const [recentPayments, overdueInvoices] = await Promise.all([
    prisma.payment.findMany({ where: { agencyId }, orderBy: { paidAt: "desc" }, take: 10 }),
    prisma.invoice.findMany({ where: { agencyId, status: "OVERDUE" }, orderBy: { dueAt: "asc" }, take: 20 }),
  ]);
  res.json({ recentPayments, overdueInvoices });
});

// Admin dashboard can be same endpoint but FE uses role to show extra cards
