import { prisma as prismaClient } from "../db.js";

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

export async function computeTenantRating(tenantId, prisma = prismaClient) {
  // Look back 365 days
  const now = new Date();
  const since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Get all leases for tenant
  const leases = await prisma.lease.findMany({ where: { tenantId } });
  if (leases.length === 0) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { averageRating: 5, isHighRisk: false } });
    return { rating: 5, isHighRisk: false };
  }
  const leaseIds = leases.map((l) => l.id);

  // Invoices in last year for these leases
  const invoices = await prisma.invoice.findMany({
    where: { leaseId: { in: leaseIds }, issuedAt: { gte: since } },
    select: { id: true, dueAt: true, status: true, amount: true },
  });

  // Sum penalties by type for this tenant in last year
  const latePaymentPenalties = await prisma.penalty.findMany({
    where: { type: "LATE_PAYMENT", invoice: { leaseId: { in: leaseIds } }, computedAt: { gte: since } },
    select: { days: true },
  });
  const overstayPenalties = await prisma.penalty.findMany({
    where: { type: "OVERSTAY", notice: { leaseId: { in: leaseIds } }, computedAt: { gte: since } },
    select: { days: true },
  });

  const lateDays = latePaymentPenalties.reduce((s, p) => s + (p.days || 0), 0);
  const overstayDays = overstayPenalties.reduce((s, p) => s + (p.days || 0), 0);
  const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length;

  // On-time ratio: invoice is on-time if fully paid and final payment happened on/before dueAt
  // We approximate via max payment paidAt for the invoice
  const invoiceIds = invoices.map((i) => i.id);
  const payments = invoiceIds.length
    ? await prisma.payment.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: { invoiceId: true, paidAt: true },
      })
    : [];
  const invoiceIdToMaxPaidAt = new Map();
  for (const p of payments) {
    const prev = invoiceIdToMaxPaidAt.get(p.invoiceId);
    if (!prev || p.paidAt > prev) invoiceIdToMaxPaidAt.set(p.invoiceId, p.paidAt);
  }
  let totalInvoices = invoices.length;
  let onTimeCount = 0;
  for (const inv of invoices) {
    const lastPaidAt = invoiceIdToMaxPaidAt.get(inv.id);
    if (inv.status === "PAID" && lastPaidAt && lastPaidAt <= inv.dueAt) onTimeCount += 1;
  }
  const onTimeRatio = totalInvoices > 0 ? onTimeCount / totalInvoices : 1;

  // Score construction
  let rating = 5.0;
  rating -= Math.min(overdueCount, 3) * 0.8; // each overdue hurts
  rating -= lateDays * 0.02; // 50 days => -1
  rating -= overstayDays * 0.05; // 20 days => -1
  if (onTimeRatio >= 0.8) rating += 0.5;
  if (onTimeRatio < 0.5) rating -= 0.5;
  rating = clamp(Math.round(rating * 10) / 10, 1, 5);

  const isHighRisk = rating < 3 || overdueCount >= 2 || overstayDays >= 15;

  await prisma.tenant.update({ where: { id: tenantId }, data: { averageRating: rating, isHighRisk } });
  return { rating, isHighRisk, metrics: { overdueCount, lateDays, overstayDays, onTimeRatio } };
}

export async function computeAgencyRatings(agencyId, prisma = prismaClient) {
  const tenants = await prisma.tenant.findMany({ where: { agencyId }, select: { id: true } });
  const results = [];
  for (const t of tenants) {
    results.push({ tenantId: t.id, ...(await computeTenantRating(t.id, prisma)) });
  }
  return results;
}
