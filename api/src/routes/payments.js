import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { computeTenantRating } from "../services/rating.js";
import { getPaymentsOptimized, queryTimeMiddleware } from "../services/queryOptimizer.js";
import { 
  processPaymentWithLock, 
  processBatchPayments,
  getPaymentLockStatus,
  testConcurrentPayments
} from "../services/paymentConcurrencyHandler.js";

export const paymentRouter = Router();

paymentRouter.use(requireAuth);
paymentRouter.use(queryTimeMiddleware);

const paymentSchema = z.object({
  leaseId: z.string(),
  amount: z.number().int().positive(),
  paidAt: z.string().transform((s) => new Date(s)),
  method: z.enum(["MPESA_C2B", "MANUAL"]).default("MANUAL"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  invoiceId: z.string().optional(),
});

// Optimized payments list with pagination and filtering
paymentRouter.get("/", async (req, res) => {
  try {
    const options = {
      page: req.query.page,
      limit: req.query.limit,
      leaseId: req.query.leaseId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await getPaymentsOptimized(req.user.agencyId, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Optimized payment creation with concurrency control
paymentRouter.post("/", async (req, res) => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    
    const paymentData = {
      ...parsed.data,
      agencyId: req.user.agencyId
    };
    
    // Use concurrency handler for payment processing
    const result = await processPaymentWithLock(paymentData, {
      lockTimeout: 30000 // 30 second timeout
    });
    
    // Recompute tenant rating asynchronously
    if (result.lease?.tenant?.id) {
      computeTenantRating(result.lease.tenant.id).catch(error => {
        console.error('Failed to update tenant rating:', error);
      });
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Payment creation error:', error);
    
    // Handle specific concurrency errors
    if (error.message.includes('already in progress')) {
      return res.status(409).json({ 
        error: "Payment processing already in progress. Please wait and try again." 
      });
    }
    
    if (error.message.includes('Duplicate payment')) {
      return res.status(409).json({ 
        error: "Duplicate payment detected. Payment with this reference already exists." 
      });
    }
    
    if (error.message.includes('modified by another process')) {
      return res.status(409).json({ 
        error: "Invoice was updated by another process. Please refresh and try again." 
      });
    }
    
    res.status(500).json({ error: "Failed to create payment" });
  }
});

// Optimized single payment fetch
paymentRouter.get("/:id", async (req, res) => {
  try {
    const item = await prisma.payment.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      },
      include: {
        lease: {
          select: {
            id: true,
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            property: {
              select: {
                id: true,
                title: true,
                address: true
              }
            },
            unit: {
              select: {
                id: true,
                unitNumber: true
              }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueAt: true
          }
        }
      }
    });
    
    if (!item) return res.status(404).json({ error: "Payment not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

paymentRouter.put("/:id", async (req, res) => {
  try {
    const parsed = paymentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    
    const existing = await prisma.payment.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      } 
    });
    
    if (!existing) return res.status(404).json({ error: "Payment not found" });
    
    const updated = await prisma.payment.update({ 
      where: { id: existing.id }, 
      data: parsed.data 
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update payment" });
  }
});

paymentRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.payment.findFirst({ 
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      } 
    });
    
    if (!existing) return res.status(404).json({ error: "Payment not found" });
    
    await prisma.payment.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete payment" });
  }
});
// Batch payment processing with concurrency control
paymentRouter.post("/batch", async (req, res) => {
  try {
    const { payments, options = {} } = req.body;
    
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: "Payments array is required" });
    }

    // Validate each payment
    const validatedPayments = [];
    const validationErrors = [];

    for (let i = 0; i < payments.length; i++) {
      const parsed = paymentSchema.safeParse(payments[i]);
      if (parsed.success) {
        validatedPayments.push({
          ...parsed.data,
          agencyId: req.user.agencyId
        });
      } else {
        validationErrors.push({
          index: i,
          errors: parsed.error.flatten()
        });
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation errors in batch",
        validationErrors
      });
    }

    // Process batch payments
    const result = await processBatchPayments(validatedPayments, {
      batchSize: options.batchSize || 10,
      lockTimeout: options.lockTimeout || 30000
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Batch payment processing error:', error);
    res.status(500).json({ error: "Failed to process batch payments" });
  }
});

// Get payment lock status for monitoring
paymentRouter.get("/lock-status", async (req, res) => {
  try {
    const lockStatus = getPaymentLockStatus();
    res.json(lockStatus);
  } catch (error) {
    res.status(500).json({ error: "Failed to get lock status" });
  }
});

// Test concurrent payment scenarios (development/testing only)
if (process.env.NODE_ENV !== 'production') {
  paymentRouter.post("/test-concurrency", async (req, res) => {
    try {
      const { testPayments } = req.body;
      
      if (!Array.isArray(testPayments) || testPayments.length === 0) {
        return res.status(400).json({ error: "Test payments array is required" });
      }

      // Add agency ID to test payments
      const testData = testPayments.map(payment => ({
        ...payment,
        agencyId: req.user.agencyId
      }));

      const testResults = await testConcurrentPayments(testData);
      res.json(testResults);
    } catch (error) {
      console.error('Concurrency test error:', error);
      res.status(500).json({ error: "Failed to run concurrency test" });
    }
  });
}