import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { requireSameAgency } from "../middleware/agentAuth.js";

export const propertySalesRouter = Router();

// Validation schemas
const createListingSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  listingPrice: z.number().min(1, "Listing price must be greater than 0"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  features: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  agentId: z.string().optional(),
  marketingChannels: z.array(z.string()).optional(),
  availableFrom: z.string().datetime().optional(),
  negotiable: z.boolean().default(true),
});

const updateListingSchema = z.object({
  listingPrice: z.number().min(1).optional(),
  description: z.string().min(10).optional(),
  features: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  agentId: z.string().optional(),
  marketingChannels: z.array(z.string()).optional(),
  availableFrom: z.string().datetime().optional(),
  negotiable: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SOLD", "WITHDRAWN"]).optional(),
});

const createInquirySchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  buyerName: z.string().min(2, "Buyer name must be at least 2 characters"),
  buyerPhone: z.string().min(10, "Phone number must be at least 10 characters"),
  buyerEmail: z.string().email().optional(),
  message: z.string().optional(),
  interestedPrice: z.number().min(1).optional(),
  financingType: z.enum(["CASH", "MORTGAGE", "MIXED"]).optional(),
  viewingRequested: z.boolean().default(false),
  preferredViewingDate: z.string().datetime().optional(),
});

const updateInquirySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "VIEWING_SCHEDULED", "VIEWED", "OFFER_MADE", "NEGOTIATING", "CLOSED", "LOST"]).optional(),
  notes: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  offerAmount: z.number().min(1).optional(),
  agentResponse: z.string().optional(),
});

const recordSaleSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  inquiryId: z.string().optional(),
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerPhone: z.string().min(10, "Buyer phone is required"),
  buyerEmail: z.string().email().optional(),
  salePrice: z.number().min(1, "Sale price must be greater than 0"),
  agentId: z.string().optional(),
  agentCommissionRate: z.number().min(0).max(100).optional(),
  saleDate: z.string().datetime().optional(),
  paymentMethod: z.enum(["CASH", "MORTGAGE", "MIXED"]).default("CASH"),
  notes: z.string().optional(),
});

// GET /property-sales/listings - Get all property listings
propertySalesRouter.get("/listings", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, agentId, minPrice, maxPrice, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Build filter
    const where = {
      property: { agencyId },
      ...(status && { status }),
      ...(agentId && { agentId }),
      ...(minPrice && { listingPrice: { gte: parseInt(minPrice) } }),
      ...(maxPrice && { listingPrice: { ...where.listingPrice, lte: parseInt(maxPrice) } }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { property: { title: { contains: search, mode: "insensitive" } } },
          { property: { address: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [listings, total] = await Promise.all([
      prisma.propertyListing.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
              type: true,
              bedrooms: true,
              bathrooms: true,
              sizeSqFt: true,
            },
          },
          agent: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          inquiries: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              inquiries: true,
              viewings: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.propertyListing.count({ where }),
    ]);

    res.json({
      listings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching property listings:", error);
    res.status(500).json({ error: "Failed to fetch property listings" });
  }
});

// GET /property-sales/listings/:id - Get specific listing details
propertySalesRouter.get("/listings/:id", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    
    const listing = await prisma.propertyListing.findFirst({
      where: {
        id: req.params.id,
        property: { agencyId },
      },
      include: {
        property: {
          include: {
            leases: {
              where: {
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } },
                ],
              },
              include: {
                tenant: {
                  select: { name: true, phone: true },
                },
              },
            },
          },
        },
        agent: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        inquiries: {
          include: {
            viewings: true,
          },
          orderBy: { createdAt: "desc" },
        },
        viewings: {
          orderBy: { scheduledAt: "desc" },
        },
        marketAnalysis: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Property listing not found" });
    }

    res.json(listing);
  } catch (error) {
    console.error("Error fetching listing details:", error);
    res.status(500).json({ error: "Failed to fetch listing details" });
  }
});

// POST /property-sales/listings - Create new property listing
propertySalesRouter.post("/listings", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const {
      propertyId,
      listingPrice,
      description,
      features,
      photos,
      agentId,
      marketingChannels,
      availableFrom,
      negotiable,
    } = parsed.data;

    // Verify property belongs to agency
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        agencyId,
      },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Verify agent belongs to agency if provided
    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          agencyId,
        },
      });

      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
    }

    // Check if property already has an active listing
    const existingListing = await prisma.propertyListing.findFirst({
      where: {
        propertyId,
        status: "ACTIVE",
      },
    });

    if (existingListing) {
      return res.status(400).json({ 
        error: "Property already has an active listing" 
      });
    }

    const listing = await prisma.propertyListing.create({
      data: {
        propertyId,
        listingPrice,
        description,
        features: features || [],
        photos: photos || [],
        agentId,
        marketingChannels: marketingChannels || [],
        availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
        negotiable,
        status: "ACTIVE",
        createdBy: req.user?.id || req.agent?.agentId,
      },
      include: {
        property: {
          select: {
            title: true,
            address: true,
            type: true,
          },
        },
        agent: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Property listing created successfully",
      listing,
    });
  } catch (error) {
    console.error("Error creating property listing:", error);
    res.status(500).json({ error: "Failed to create property listing" });
  }
});

// PUT /property-sales/listings/:id - Update property listing
propertySalesRouter.put("/listings/:id", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const parsed = updateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Check if listing exists and belongs to agency
    const existingListing = await prisma.propertyListing.findFirst({
      where: {
        id: req.params.id,
        property: { agencyId },
      },
    });

    if (!existingListing) {
      return res.status(404).json({ error: "Property listing not found" });
    }

    // Verify agent belongs to agency if provided
    if (parsed.data.agentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          id: parsed.data.agentId,
          agencyId,
        },
      });

      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
    }

    const updatedListing = await prisma.propertyListing.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        ...(parsed.data.availableFrom && { 
          availableFrom: new Date(parsed.data.availableFrom) 
        }),
        updatedBy: req.user?.id || req.agent?.agentId,
      },
      include: {
        property: {
          select: {
            title: true,
            address: true,
            type: true,
          },
        },
        agent: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    res.json({
      message: "Property listing updated successfully",
      listing: updatedListing,
    });
  } catch (error) {
    console.error("Error updating property listing:", error);
    res.status(500).json({ error: "Failed to update property listing" });
  }
});

// DELETE /property-sales/listings/:id - Delete property listing
propertySalesRouter.delete("/listings/:id", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Check if listing exists and belongs to agency
    const existingListing = await prisma.propertyListing.findFirst({
      where: {
        id: req.params.id,
        property: { agencyId },
      },
      include: {
        inquiries: true,
        sales: true,
      },
    });

    if (!existingListing) {
      return res.status(404).json({ error: "Property listing not found" });
    }

    // Check if listing has sales records
    if (existingListing.sales.length > 0) {
      return res.status(400).json({
        error: "Cannot delete listing with sales records. Set status to WITHDRAWN instead.",
      });
    }

    // Delete related inquiries first
    await prisma.propertyInquiry.deleteMany({
      where: { listingId: req.params.id },
    });

    // Delete the listing
    await prisma.propertyListing.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "Property listing deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting property listing:", error);
    res.status(500).json({ error: "Failed to delete property listing" });
  }
});

// GET /property-sales/inquiries - Get buyer inquiries
propertySalesRouter.get("/inquiries", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, listingId, agentId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Build filter
    const where = {
      listing: {
        property: { agencyId },
      },
      ...(status && { status }),
      ...(listingId && { listingId }),
      ...(agentId && { listing: { agentId } }),
    };

    const [inquiries, total] = await Promise.all([
      prisma.propertyInquiry.findMany({
        where,
        include: {
          listing: {
            include: {
              property: {
                select: {
                  title: true,
                  address: true,
                  type: true,
                },
              },
              agent: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
          viewings: {
            orderBy: { scheduledAt: "desc" },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.propertyInquiry.count({ where }),
    ]);

    res.json({
      inquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
});

// POST /property-sales/inquiries - Create buyer inquiry
propertySalesRouter.post("/inquiries", async (req, res) => {
  try {
    const parsed = createInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const {
      listingId,
      buyerName,
      buyerPhone,
      buyerEmail,
      message,
      interestedPrice,
      financingType,
      viewingRequested,
      preferredViewingDate,
    } = parsed.data;

    // Verify listing exists and is active
    const listing = await prisma.propertyListing.findFirst({
      where: {
        id: listingId,
        status: "ACTIVE",
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Active property listing not found" });
    }

    const inquiry = await prisma.propertyInquiry.create({
      data: {
        listingId,
        buyerName,
        buyerPhone,
        buyerEmail,
        message,
        interestedPrice,
        financingType,
        viewingRequested,
        preferredViewingDate: preferredViewingDate ? new Date(preferredViewingDate) : null,
        status: "NEW",
      },
      include: {
        listing: {
          include: {
            property: {
              select: {
                title: true,
                address: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Inquiry submitted successfully",
      inquiry,
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({ error: "Failed to create inquiry" });
  }
});

// PUT /property-sales/inquiries/:id - Update inquiry status
propertySalesRouter.put("/inquiries/:id", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const parsed = updateInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Check if inquiry exists and belongs to agency
    const existingInquiry = await prisma.propertyInquiry.findFirst({
      where: {
        id: req.params.id,
        listing: {
          property: { agencyId },
        },
      },
    });

    if (!existingInquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    const updatedInquiry = await prisma.propertyInquiry.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        ...(parsed.data.followUpDate && { 
          followUpDate: new Date(parsed.data.followUpDate) 
        }),
        updatedBy: req.user?.id || req.agent?.agentId,
      },
      include: {
        listing: {
          include: {
            property: {
              select: {
                title: true,
                address: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: "Inquiry updated successfully",
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error("Error updating inquiry:", error);
    res.status(500).json({ error: "Failed to update inquiry" });
  }
});

// POST /property-sales/sales - Record property sale
propertySalesRouter.post("/sales", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const parsed = recordSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const {
      listingId,
      inquiryId,
      buyerName,
      buyerPhone,
      buyerEmail,
      salePrice,
      agentId,
      agentCommissionRate,
      saleDate,
      paymentMethod,
      notes,
    } = parsed.data;

    // Verify listing exists and belongs to agency
    const listing = await prisma.propertyListing.findFirst({
      where: {
        id: listingId,
        property: { agencyId },
      },
      include: {
        agent: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: "Property listing not found" });
    }

    // Verify agent if provided
    let finalAgentId = agentId || listing.agentId;
    let finalCommissionRate = agentCommissionRate;

    if (finalAgentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          id: finalAgentId,
          agencyId,
        },
      });

      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      if (!finalCommissionRate) {
        finalCommissionRate = agent.commissionRate;
      }
    }

    // Calculate commission amount
    const commissionAmount = finalCommissionRate 
      ? Math.round((salePrice * finalCommissionRate) / 100)
      : 0;

    // Create sale record
    const sale = await prisma.propertySale.create({
      data: {
        listingId,
        inquiryId,
        buyerName,
        buyerPhone,
        buyerEmail,
        salePrice,
        agentId: finalAgentId,
        agentCommissionRate: finalCommissionRate,
        agentCommissionAmount: commissionAmount,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        paymentMethod,
        notes,
        recordedBy: req.user?.id || req.agent?.agentId,
      },
      include: {
        listing: {
          include: {
            property: {
              select: {
                title: true,
                address: true,
              },
            },
          },
        },
        agent: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    // Update listing status to SOLD
    await prisma.propertyListing.update({
      where: { id: listingId },
      data: { 
        status: "SOLD",
        soldAt: new Date(),
        soldPrice: salePrice,
      },
    });

    // Update inquiry status if provided
    if (inquiryId) {
      await prisma.propertyInquiry.update({
        where: { id: inquiryId },
        data: { status: "CLOSED" },
      });
    }

    // Update agent's total earned
    if (finalAgentId && commissionAmount > 0) {
      await prisma.agent.update({
        where: { id: finalAgentId },
        data: {
          totalEarned: {
            increment: commissionAmount / 100, // Convert cents to currency units
          },
        },
      });
    }

    res.status(201).json({
      message: "Property sale recorded successfully",
      sale,
    });
  } catch (error) {
    console.error("Error recording property sale:", error);
    res.status(500).json({ error: "Failed to record property sale" });
  }
});

// GET /property-sales/sales - Get sales records
propertySalesRouter.get("/sales", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { page = 1, limit = 10, agentId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Build filter
    const where = {
      listing: {
        property: { agencyId },
      },
      ...(agentId && { agentId }),
      ...(startDate && endDate && {
        saleDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    };

    const [sales, total] = await Promise.all([
      prisma.propertySale.findMany({
        where,
        include: {
          listing: {
            include: {
              property: {
                select: {
                  title: true,
                  address: true,
                  type: true,
                },
              },
            },
          },
          agent: {
            select: {
              name: true,
              phone: true,
            },
          },
          inquiry: {
            select: {
              buyerName: true,
              createdAt: true,
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { saleDate: "desc" },
      }),
      prisma.propertySale.count({ where }),
    ]);

    // Calculate summary statistics
    const totalSalesValue = sales.reduce((sum, sale) => sum + sale.salePrice, 0);
    const totalCommissions = sales.reduce((sum, sale) => sum + (sale.agentCommissionAmount || 0), 0);

    res.json({
      sales,
      summary: {
        totalSales: sales.length,
        totalSalesValue,
        totalCommissions,
        averageSalePrice: sales.length > 0 ? totalSalesValue / sales.length : 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching sales records:", error);
    res.status(500).json({ error: "Failed to fetch sales records" });
  }
});

// GET /property-sales/analytics - Get sales analytics
propertySalesRouter.get("/analytics", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { startDate, endDate, agentId } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Default to current year if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Build base filter
    const baseFilter = {
      listing: {
        property: { agencyId },
      },
      saleDate: { gte: start, lte: end },
      ...(agentId && { agentId }),
    };

    // Get sales data
    const [
      totalSales,
      salesByMonth,
      salesByAgent,
      salesByPropertyType,
      averageTimeToSell,
      topPerformingListings,
    ] = await Promise.all([
      // Total sales summary
      prisma.propertySale.aggregate({
        where: baseFilter,
        _count: { _all: true },
        _sum: { salePrice: true, agentCommissionAmount: true },
        _avg: { salePrice: true },
      }),

      // Sales by month
      prisma.propertySale.groupBy({
        by: ['saleDate'],
        where: baseFilter,
        _count: { _all: true },
        _sum: { salePrice: true },
      }),

      // Sales by agent
      prisma.propertySale.groupBy({
        by: ['agentId'],
        where: baseFilter,
        _count: { _all: true },
        _sum: { salePrice: true, agentCommissionAmount: true },
      }),

      // Sales by property type
      prisma.propertySale.groupBy({
        by: ['listing'],
        where: baseFilter,
        _count: { _all: true },
        _sum: { salePrice: true },
      }),

      // Average time to sell (placeholder - would need listing creation date)
      prisma.propertySale.findMany({
        where: baseFilter,
        select: {
          saleDate: true,
          listing: {
            select: {
              createdAt: true,
            },
          },
        },
      }),

      // Top performing listings
      prisma.propertySale.findMany({
        where: baseFilter,
        include: {
          listing: {
            include: {
              property: {
                select: {
                  title: true,
                  address: true,
                  type: true,
                },
              },
            },
          },
          agent: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { salePrice: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate average time to sell
    const avgTimeToSell = averageTimeToSell.length > 0 
      ? averageTimeToSell.reduce((sum, sale) => {
          const timeToSell = new Date(sale.saleDate) - new Date(sale.listing.createdAt);
          return sum + timeToSell;
        }, 0) / (averageTimeToSell.length * 1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Process sales by month
    const monthlySales = salesByMonth.reduce((acc, sale) => {
      const month = new Date(sale.saleDate).toISOString().slice(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { count: 0, value: 0 };
      }
      acc[month].count += sale._count._all;
      acc[month].value += sale._sum.salePrice || 0;
      return acc;
    }, {});

    // Get agent names for sales by agent
    const agentIds = salesByAgent.map(s => s.agentId).filter(Boolean);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    const agentMap = agents.reduce((acc, agent) => {
      acc[agent.id] = agent.name;
      return acc;
    }, {});

    const analytics = {
      period: { start, end },
      summary: {
        totalSales: totalSales._count._all,
        totalSalesValue: totalSales._sum.salePrice || 0,
        totalCommissions: totalSales._sum.agentCommissionAmount || 0,
        averageSalePrice: totalSales._avg.salePrice || 0,
        averageTimeToSellDays: Math.round(avgTimeToSell),
      },
      trends: {
        monthlySales,
        salesByAgent: salesByAgent.map(s => ({
          agentId: s.agentId,
          agentName: s.agentId ? agentMap[s.agentId] || 'Unknown' : 'No Agent',
          salesCount: s._count._all,
          totalValue: s._sum.salePrice || 0,
          totalCommissions: s._sum.agentCommissionAmount || 0,
        })),
      },
      topPerformingListings: topPerformingListings.map(sale => ({
        propertyTitle: sale.listing.property.title,
        propertyAddress: sale.listing.property.address,
        propertyType: sale.listing.property.type,
        salePrice: sale.salePrice,
        agentName: sale.agent?.name,
        saleDate: sale.saleDate,
      })),
    };

    res.json(analytics);
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    res.status(500).json({ error: "Failed to fetch sales analytics" });
  }
});