import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { queryTimeMiddleware } from "../services/queryOptimizer.js";
import { 
  BulkPropertyOperations, 
  BulkPaymentOperations, 
  BulkTenantOperations,
  BulkOperationUtils 
} from "../services/bulkOperations.js";
import { z } from "zod";

export const bulkRouter = Router();

bulkRouter.use(requireAuth);
bulkRouter.use(queryTimeMiddleware);

// Validation schemas
const bulkPropertySchema = z.object({
  properties: z.array(z.object({
    title: z.string().min(1),
    address: z.string().min(1),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    bedrooms: z.number().int().nonnegative().optional(),
    bathrooms: z.number().nonnegative().optional(),
    sizeSqFt: z.number().int().nonnegative().optional(),
    rentAmount: z.number().int().nonnegative().optional(),
    status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "OFF_MARKET"]).optional(),
    type: z.enum([
      "SINGLE_ROOM", "DOUBLE_ROOM", "BEDSITTER", "ONE_BEDROOM", "TWO_BEDROOM", 
      "THREE_BEDROOM", "FOUR_BEDROOM", "MAISONETTE", "BUNGALOW", "SERVANT_QUARTER", 
      "PENTHOUSE", "TOWNHOUSE", "VILLA", "COMMERCIAL", "OFFICE"
    ])
  }))
});

const bulkPaymentSchema = z.object({
  payments: z.array(z.object({
    leaseId: z.string(),
    amount: z.number().int().positive(),
    paidAt: z.string().transform((s) => new Date(s)),
    method: z.enum(["MPESA_C2B", "MANUAL"]).default("MANUAL"),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
    invoiceId: z.string().optional(),
  }))
});

const bulkTenantSchema = z.object({
  tenants: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }))
});

// Bulk property operations
bulkRouter.post("/properties/import", async (req, res) => {
  try {
    const parsed = bulkPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid data format",
        details: parsed.error.flatten()
      });
    }
    
    const result = await BulkPropertyOperations.importProperties(
      req.user.agencyId, 
      parsed.data.properties
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: "Bulk property import failed",
      message: error.message 
    });
  }
});

bulkRouter.get("/properties/export", async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      includeUnits: req.query.includeUnits === 'true'
    };
    
    const properties = await BulkPropertyOperations.exportProperties(
      req.user.agencyId, 
      options
    );
    
    // Return as JSON or CSV based on Accept header
    const acceptHeader = req.get('Accept');
    if (acceptHeader && acceptHeader.includes('text/csv')) {
      const csv = BulkOperationUtils.convertToCSV(properties);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="properties.csv"');
      res.send(csv);
    } else {
      res.json({
        data: properties,
        count: properties.length,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: "Bulk property export failed",
      message: error.message 
    });
  }
});

// Bulk payment operations
bulkRouter.post("/payments/import", async (req, res) => {
  try {
    const parsed = bulkPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid data format",
        details: parsed.error.flatten()
      });
    }
    
    const result = await BulkPaymentOperations.processPaymentBatch(
      req.user.agencyId, 
      parsed.data.payments
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: "Bulk payment processing failed",
      message: error.message 
    });
  }
});

bulkRouter.get("/payments/export", async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      leaseId: req.query.leaseId
    };
    
    const payments = await BulkPaymentOperations.exportPayments(
      req.user.agencyId, 
      options
    );
    
    // Return as JSON or CSV based on Accept header
    const acceptHeader = req.get('Accept');
    if (acceptHeader && acceptHeader.includes('text/csv')) {
      // Flatten nested data for CSV export
      const flattenedPayments = payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
        tenantName: payment.lease?.tenant?.name,
        tenantEmail: payment.lease?.tenant?.email,
        tenantPhone: payment.lease?.tenant?.phone,
        propertyTitle: payment.lease?.property?.title,
        propertyAddress: payment.lease?.property?.address,
        unitNumber: payment.lease?.unit?.unitNumber,
        invoiceAmount: payment.invoice?.amount,
        invoiceDueAt: payment.invoice?.dueAt,
        invoiceStatus: payment.invoice?.status
      }));
      
      const csv = BulkOperationUtils.convertToCSV(flattenedPayments);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename="payments.csv"');
      res.send(csv);
    } else {
      res.json({
        data: payments,
        count: payments.length,
        exportedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: "Bulk payment export failed",
      message: error.message 
    });
  }
});

// Bulk tenant operations
bulkRouter.post("/tenants/import", async (req, res) => {
  try {
    const parsed = bulkTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid data format",
        details: parsed.error.flatten()
      });
    }
    
    const result = await BulkTenantOperations.importTenants(
      req.user.agencyId, 
      parsed.data.tenants
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: "Bulk tenant import failed",
      message: error.message 
    });
  }
});

// Bulk tenant rating updates (admin only)
bulkRouter.post("/tenants/update-ratings", async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    const { tenantUpdates } = req.body;
    
    if (!Array.isArray(tenantUpdates)) {
      return res.status(400).json({ error: "tenantUpdates must be an array" });
    }
    
    const result = await BulkTenantOperations.updateTenantRatings(tenantUpdates);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: "Bulk tenant rating update failed",
      message: error.message 
    });
  }
});

// Bulk operation status endpoint
bulkRouter.get("/status", async (req, res) => {
  try {
    // This could be extended to track ongoing bulk operations
    res.json({
      status: "ready",
      maxBatchSize: 100,
      supportedOperations: [
        "properties/import",
        "properties/export", 
        "payments/import",
        "payments/export",
        "tenants/import",
        "tenants/update-ratings"
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to get bulk operation status",
      message: error.message 
    });
  }
});