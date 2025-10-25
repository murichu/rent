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
invoiceRouter.put("/:id/status", async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, agencyId: req.user.agencyId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = await prisma.invoice.update({ where: { id: existing.id }, data: { status: parsed.data.status } });
  res.json(updated);
});

// GET /invoices/:id/branded - Get branded invoice with comprehensive styling
invoiceRouter.get("/:id/branded", async (req, res) => {
  try {
    const { usePropertyManagerBranding = 'auto', format = 'json' } = req.query;
    
    // Import branding service
    const { invoiceBrandingService } = await import("../services/invoiceBrandingService.js");
    
    const options = {
      usePropertyManagerBranding: usePropertyManagerBranding === 'false' ? false : 
                                 usePropertyManagerBranding === 'true' ? true : 
                                 usePropertyManagerBranding // 'auto' allows service to decide
    };

    const brandedInvoice = await invoiceBrandingService.getInvoiceBranding(req.params.id, options);

    if (format === 'html') {
      const htmlResult = await invoiceBrandingService.generateBrandedHTML(req.params.id, options);
      return res.json({
        format: 'html',
        html: htmlResult.html,
        css: htmlResult.css,
        data: htmlResult.data
      });
    }

    res.json({
      format: 'json',
      ...brandedInvoice
    });
  } catch (error) {
    console.error("Error fetching branded invoice:", error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to fetch branded invoice" });
  }
});

// POST /invoices/:id/share - Share invoice via multiple channels
invoiceRouter.post("/:id/share", async (req, res) => {
  try {
    const { channels = ["email"], message, includePaymentLink = true } = req.body;
    
    const invoice = await prisma.invoice.findFirst({
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      },
      include: {
        lease: {
          include: {
            tenant: true,
            property: {
              select: { title: true, address: true },
            },
            unit: {
              select: { unitNumber: true },
            },
          },
        },
        agency: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Import messaging service
    const { sendMessage } = await import("../services/messagingService.js");

    // Prepare invoice data for sharing
    const invoiceUrl = `${process.env.FRONTEND_URL}/invoices/${invoice.id}`;
    const paymentUrl = includePaymentLink ? `${process.env.FRONTEND_URL}/pay/${invoice.id}` : null;

    // Prepare message content
    const defaultMessage = `
Dear ${invoice.lease.tenant?.name || 'Tenant'},

Your rent invoice for ${invoice.lease.property?.title}${invoice.lease.unit?.unitNumber ? ` - Unit ${invoice.lease.unit.unitNumber}` : ''} is ready.

Invoice Details:
- Amount: KES ${invoice.amount.toLocaleString()}
- Due Date: ${new Date(invoice.dueAt).toLocaleDateString()}
- Period: ${new Date(invoice.periodYear, invoice.periodMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}

${paymentUrl ? `Pay online: ${paymentUrl}` : ''}
View invoice: ${invoiceUrl}

${message ? `\nAdditional message:\n${message}` : ''}

Best regards,
${invoice.agency.settings?.businessName || invoice.agency.name}
    `.trim();

    // Send message
    const result = await sendMessage({
      agencyId: req.user.agencyId,
      senderId: req.user.id,
      senderType: "USER",
      senderName: req.user.name,
      recipientIds: [invoice.lease.tenantId],
      recipientType: "TENANT",
      subject: `Rent Invoice - ${invoice.lease.property?.title}`,
      content: defaultMessage,
      messageType: "RENT_REMINDER",
      priority: "NORMAL",
      channels,
      leases: [invoice.leaseId],
      metadata: {
        invoiceId: invoice.id,
        invoiceAmount: invoice.amount,
        dueDate: invoice.dueAt,
        paymentUrl,
        invoiceUrl,
      },
    });

    res.json({
      message: "Invoice shared successfully",
      messageId: result.messageId,
      channels,
      recipientCount: result.recipientCount,
    });
  } catch (error) {
    console.error("Error sharing invoice:", error);
    res.status(500).json({ error: "Failed to share invoice" });
  }
});

// GET /invoices/:id/pdf - Generate branded PDF invoice
invoiceRouter.get("/:id/pdf", async (req, res) => {
  try {
    const { usePropertyManagerBranding = 'auto', download = 'true' } = req.query;
    
    // Import branding service
    const { invoiceBrandingService } = await import("../services/invoiceBrandingService.js");
    
    const options = {
      usePropertyManagerBranding: usePropertyManagerBranding === 'false' ? false : 
                                 usePropertyManagerBranding === 'true' ? true : 
                                 usePropertyManagerBranding
    };

    const pdfBuffer = await invoiceBrandingService.generateBrandedPDF(req.params.id, options);
    
    const filename = `invoice-${req.params.id.slice(-8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF invoice:", error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to generate PDF invoice" });
  }
});

// GET /invoices/:id/preview - Get invoice preview with branding options
invoiceRouter.get("/:id/preview", async (req, res) => {
  try {
    const { usePropertyManagerBranding = 'auto' } = req.query;
    
    // Import branding service
    const { invoiceBrandingService } = await import("../services/invoiceBrandingService.js");
    
    const options = {
      usePropertyManagerBranding: usePropertyManagerBranding === 'false' ? false : 
                                 usePropertyManagerBranding === 'true' ? true : 
                                 usePropertyManagerBranding
    };

    const htmlResult = await invoiceBrandingService.generateBrandedHTML(req.params.id, options);
    
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Preview</title>
        <style>${htmlResult.css}</style>
      </head>
      <body>
        ${htmlResult.html}
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(fullHTML);
  } catch (error) {
    console.error("Error generating invoice preview:", error);
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: "Invoice not found" });
    }
    res.status(500).json({ error: "Failed to generate invoice preview" });
  }
});

// POST /invoices/:id/generate-receipt - Generate receipt for invoice payment
invoiceRouter.post("/:id/generate-receipt", async (req, res) => {
  try {
    const { paymentId, usePropertyManagerBranding = 'auto' } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { 
        id: req.params.id, 
        agencyId: req.user.agencyId 
      },
      include: {
        lease: {
          include: {
            tenant: true,
            property: {
              include: {
                managers: {
                  include: {
                    user: true
                  }
                }
              }
            },
            unit: {
              select: {
                unitNumber: true,
              },
            },
          },
        },
        agency: {
          include: {
            settings: true,
          },
        },
        payments: paymentId ? {
          where: { id: paymentId },
        } : {
          orderBy: { paidAt: "desc" },
          take: 1,
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (!invoice.payments || invoice.payments.length === 0) {
      return res.status(404).json({ error: "No payments found for this invoice" });
    }

    // Import branding service for receipt generation
    const { invoiceBrandingService } = await import("../services/invoiceBrandingService.js");
    
    const options = {
      usePropertyManagerBranding: usePropertyManagerBranding === 'false' ? false : 
                                 usePropertyManagerBranding === 'true' ? true : 
                                 usePropertyManagerBranding
    };

    const branding = await invoiceBrandingService.buildBrandingHierarchy(invoice, options);
    const payment = invoice.payments[0];

    // Generate receipt with comprehensive branding
    const receipt = {
      receiptNumber: `RCT-${payment.id.slice(-8).toUpperCase()}`,
      invoiceNumber: `${branding.invoicePrefix || 'INV'}-${invoice.id.slice(-8).toUpperCase()}`,
      paymentId: payment.id,
      invoiceId: invoice.id,
      
      // Comprehensive branding
      branding: {
        businessName: branding.businessName,
        businessAddress: branding.businessAddress,
        businessPhone: branding.businessPhone,
        businessEmail: branding.businessEmail,
        businessWebsite: branding.businessWebsite,
        businessLicense: branding.businessLicense,
        taxId: branding.taxId,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        brandingSource: branding.brandingSource,
        propertyManagerInfo: branding.propertyManagerInfo
      },

      // Payment details
      payment: {
        amount: payment.amount,
        paidAt: payment.paidAt,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
      },

      // Invoice details
      invoice: {
        amount: invoice.amount,
        periodYear: invoice.periodYear,
        periodMonth: invoice.periodMonth,
        dueAt: invoice.dueAt,
        issuedAt: invoice.issuedAt,
      },

      // Property and tenant details
      property: {
        title: invoice.lease.property?.title,
        address: invoice.lease.property?.address,
        unitNumber: invoice.lease.unit?.unitNumber,
      },

      tenant: {
        name: invoice.lease.tenant?.name,
        email: invoice.lease.tenant?.email,
        phone: invoice.lease.tenant?.phone,
      },

      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name,
    };

    res.json({
      message: "Receipt generated successfully",
      receipt,
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({ error: "Failed to generate receipt" });
  }
});
