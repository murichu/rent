import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getInvoicesOptimized, queryTimeMiddleware } from "../services/queryOptimizer.js";
import { cacheMiddleware, invalidateCacheMiddleware, cacheInvalidationPatterns } from "../middleware/cache.js";
import { paginate } from "../middleware/pagination.js";

export const invoiceRouter = Router();

invoiceRouter.use(requireAuth);
invoiceRouter.use(queryTimeMiddleware);
invoiceRouter.use(paginate({ maxLimit: 100, memoryLimit: 100 * 1024 * 1024 })); // 100MB memory limit

// Optimized invoices list with pagination, filtering, and streaming support
invoiceRouter.get("/", 
  cacheMiddleware({ 
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
      const { page = 1, limit = 50, status, leaseId, overdue, stream } = req.query;
      return `invoices:${req.user.agencyId}:list:page:${page}:limit:${limit}:status:${status || 'all'}:lease:${leaseId || 'all'}:overdue:${overdue || 'false'}:stream:${stream || 'false'}`;
    }
  }),
  async (req, res) => {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        leaseId: req.query.leaseId,
        overdue: req.query.overdue === 'true',
        stream: req.query.stream === 'true'
      };
      
      // Handle streaming requests for large datasets
      if (options.stream) {
        const { default: streamingService } = await import('../services/streamingService.js');
        
        const invoiceStream = await streamingService.streamInvoices(req.user.agencyId, options);
        const csvHeaders = [
          'id', 'amount', 'status', 'dueAt', 'issuedAt', 'totalPaid',
          'lease.tenant.name', 'lease.tenant.email', 'lease.tenant.phone',
          'lease.property.title', 'lease.property.address', 'lease.unit.unitNumber'
        ];
        
        const csvTransform = streamingService.createCSVTransform(csvHeaders);
        const monitoringStream = streamingService.createMonitoringStream('invoices-export');
        
        // Set up streaming response
        res.streamPaginate(
          invoiceStream.pipe(csvTransform).pipe(monitoringStream),
          {
            contentType: 'text/csv',
            filename: `invoices-${req.user.agencyId}-${new Date().toISOString().split('T')[0]}.csv`,
            headers: {
              'X-Stream-Type': 'invoices',
              'X-Agency-Id': req.user.agencyId
            }
          }
        );
        return;
      }
      
      const result = await getInvoicesOptimized(req.user.agencyId, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }
);

invoiceRouter.get("/generate/:leaseId", async (req, res) => {
  const lease = await prisma.lease.findFirst({ where: { id: req.params.leaseId, agencyId: req.user.agencyId } });
  if (!lease) return res.status(404).json({ error: "Lease not found" });

  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1; // 1-12

  const agency = await prisma.agency.findUnique({ where: { id: req.user.agencyId } });
  const issuedAt = new Date(now.getFullYear(), now.getMonth(), agency?.invoiceDayOfMonth || 28);
  const dueAt = new Date(now.getFullYear(), now.getMonth() + 1, agency?.dueDayOfMonth || 5);

  const existing = await prisma.invoice.findFirst({
    where: { leaseId: lease.id, periodYear, periodMonth },
  });
  if (existing) return res.json(existing);

  const created = await prisma.invoice.create({
    data: {
      leaseId: lease.id,
      agencyId: req.user.agencyId,
      amount: lease.rentAmount,
      periodYear,
      periodMonth,
      issuedAt,
      dueAt,
    },
  });
  res.status(201).json(created);
});

const statusUpdateSchema = z.object({ status: z.enum(["PENDING", "PARTIAL", "PAID", "OVERDUE"]) });
invoiceRouter.put(":id/status", async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.invoice.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
  res.json(updated);
});
