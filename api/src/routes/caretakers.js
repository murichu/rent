import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireSameAgency } from "../middleware/agentAuth.js";

export const caretakerRouter = Router();

// Validation schemas
const createCaretakerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    email: z.string().email("Invalid email address").optional(),
    idNumber: z.string().optional(),
    paymentType: z.enum(["SALARY", "COMMISSION", "MIXED"]).default("SALARY"),
    salaryAmount: z.number().min(0).optional(),
    commissionRate: z.number().min(0).max(100).default(0),
    commissionType: z.enum(["PERCENTAGE", "FLAT_RATE"]).default("PERCENTAGE"),
});

const updateCaretakerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    phone: z.string().min(10, "Phone number must be at least 10 characters").optional(),
    email: z.string().email("Invalid email address").optional(),
    idNumber: z.string().optional(),
    paymentType: z.enum(["SALARY", "COMMISSION", "MIXED"]).optional(),
    salaryAmount: z.number().min(0).optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    commissionType: z.enum(["PERCENTAGE", "FLAT_RATE"]).optional(),
});

const assignCaretakerSchema = z.object({
    propertyId: z.string(),
});

const createPaymentSchema = z.object({
    amount: z.number().min(1, "Amount must be greater than 0").optional(), // Optional if auto-calculating
    paymentDate: z.string().datetime().optional(),
    paymentPeriod: z.string().min(1, "Payment period is required"), // e.g., "2024-01"
    paymentType: z.enum(["SALARY", "COMMISSION", "MIXED"]).optional(),
    salaryAmount: z.number().min(0).optional(),
    commissionAmount: z.number().min(0).optional(),
    rentCollected: z.number().min(0).optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    method: z.enum(["MPESA_C2B", "MANUAL", "BANK_TRANSFER", "CASH"]).default("MANUAL"),
    referenceNumber: z.string().optional(),
    description: z.string().optional(),
    properties: z.array(z.string()).optional(), // Property IDs this payment covers
});

const updatePaymentSchema = z.object({
    amount: z.number().min(1, "Amount must be greater than 0").optional(),
    paymentDate: z.string().datetime().optional(),
    paymentType: z.enum(["SALARY", "COMMISSION", "MIXED"]).optional(),
    salaryAmount: z.number().min(0).optional(),
    commissionAmount: z.number().min(0).optional(),
    rentCollected: z.number().min(0).optional(),
    commissionRate: z.number().min(0).max(100).optional(),
    method: z.enum(["MPESA_C2B", "MANUAL", "BANK_TRANSFER", "CASH"]).optional(),
    referenceNumber: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
    properties: z.array(z.string()).optional(),
});

// GET /caretakers - Get all caretakers for agency
caretakerRouter.get("/", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build search filter
        const searchFilter = search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search } },
                    { email: { contains: search, mode: "insensitive" } },
                ],
            }
            : {};

        // Get filtered caretakers based on user permissions
        const baseFilter = {
            agencyId: req.agencyId,
            ...searchFilter,
        };

        const where = await getCaretakerFilter(req, baseFilter);

        const [caretakers, total] = await Promise.all([
            prisma.caretaker.findMany({
                where,
                include: {
                    properties: {
                        include: {
                            property: {
                                select: {
                                    id: true,
                                    title: true,
                                    address: true,
                                },
                            },
                        },
                    },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.caretaker.count({ where }),
        ]);

        res.json({
            caretakers: caretakers.map(caretaker => ({
                ...caretaker,
                assignedProperties: caretaker.properties.map(p => p.property),
                properties: undefined, // Remove the nested structure
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Error fetching caretakers:", error);
        res.status(500).json({ error: "Failed to fetch caretakers" });
    }
});

// GET /caretakers/:id - Get specific caretaker
caretakerRouter.get("/:id", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to view caretakers" });
        }

        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    include: {
                        property: {
                            select: {
                                id: true,
                                title: true,
                                address: true,
                                city: true,
                                rentAmount: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, filter properties to only show their managed ones
        let assignedProperties = caretaker.properties.map(p => p.property);
        if (restrictedProperties) {
            assignedProperties = assignedProperties.filter(prop =>
                restrictedProperties.includes(prop.id)
            );
        }

        res.json({
            ...caretaker,
            assignedProperties,
            properties: undefined, // Remove the nested structure
        });
    } catch (error) {
        console.error("Error fetching caretaker:", error);
        res.status(500).json({ error: "Failed to fetch caretaker" });
    }
});

// POST /caretakers - Create new caretaker (Admin, Agent with permission, or Property Manager/Landlord)
caretakerRouter.post("/", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to manage caretakers
        const { canManage } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to manage caretakers" });
        }

        const parsed = createCaretakerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const { name, phone, email, idNumber, commissionRate } = parsed.data;

        // Check if caretaker with same phone already exists in agency
        const existingCaretaker = await prisma.caretaker.findFirst({
            where: {
                phone,
                agencyId: req.agencyId,
            },
        });

        if (existingCaretaker) {
            return res.status(400).json({ error: "Caretaker with this phone number already exists" });
        }

        const caretaker = await prisma.caretaker.create({
            data: {
                name,
                phone,
                email,
                idNumber,
                commissionRate,
                agencyId: req.agencyId,
            },
        });

        res.status(201).json({
            message: "Caretaker created successfully",
            caretaker,
        });
    } catch (error) {
        console.error("Error creating caretaker:", error);
        res.status(500).json({ error: "Failed to create caretaker" });
    }
});

// PUT /caretakers/:id - Update caretaker
caretakerRouter.put("/:id", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to manage caretakers
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to manage caretakers" });
        }

        const parsed = updateCaretakerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        // Check if caretaker exists and belongs to agency
        const existingCaretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    select: { propertyId: true },
                },
            },
        });

        if (!existingCaretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, check if they manage any of the caretaker's properties
        if (restrictedProperties) {
            const caretakerPropertyIds = existingCaretaker.properties.map(p => p.propertyId);
            const hasAccess = caretakerPropertyIds.some(propId =>
                restrictedProperties.includes(propId)
            );

            if (!hasAccess) {
                return res.status(403).json({
                    error: "You can only manage caretakers assigned to your properties"
                });
            }
        }

        // If phone is being updated, check for duplicates
        if (parsed.data.phone && parsed.data.phone !== existingCaretaker.phone) {
            const phoneExists = await prisma.caretaker.findFirst({
                where: {
                    phone: parsed.data.phone,
                    agencyId: req.agencyId,
                    id: { not: req.params.id },
                },
            });

            if (phoneExists) {
                return res.status(400).json({ error: "Caretaker with this phone number already exists" });
            }
        }

        const updatedCaretaker = await prisma.caretaker.update({
            where: { id: req.params.id },
            data: parsed.data,
        });

        res.json({
            message: "Caretaker updated successfully",
            caretaker: updatedCaretaker,
        });
    } catch (error) {
        console.error("Error updating caretaker:", error);
        res.status(500).json({ error: "Failed to update caretaker" });
    }
});

// DELETE /caretakers/:id - Delete caretaker
caretakerRouter.delete("/:id", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to manage caretakers
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to manage caretakers" });
        }

        // Check if caretaker exists and belongs to agency
        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    select: { propertyId: true },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, check if they manage any of the caretaker's properties
        if (restrictedProperties) {
            const caretakerPropertyIds = caretaker.properties.map(p => p.propertyId);
            const hasAccess = caretakerPropertyIds.some(propId =>
                restrictedProperties.includes(propId)
            );

            if (!hasAccess) {
                return res.status(403).json({
                    error: "You can only delete caretakers assigned to your properties"
                });
            }
        }

        // Remove all property assignments first
        await prisma.propertyCaretaker.deleteMany({
            where: { caretakerId: req.params.id },
        });

        // Delete the caretaker
        await prisma.caretaker.delete({
            where: { id: req.params.id },
        });

        res.json({
            message: "Caretaker deleted successfully",
            removedAssignments: caretaker.properties.length,
        });
    } catch (error) {
        console.error("Error deleting caretaker:", error);
        res.status(500).json({ error: "Failed to delete caretaker" });
    }
});

// POST /caretakers/:id/assign - Assign caretaker to property
caretakerRouter.post("/:id/assign", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to manage caretakers
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to manage caretakers" });
        }

        const parsed = assignCaretakerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const { propertyId } = parsed.data;

        // Check if caretaker exists and belongs to agency
        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // Check if property exists and belongs to agency
        const property = await prisma.property.findFirst({
            where: {
                id: propertyId,
                agencyId: req.agencyId,
            },
        });

        if (!property) {
            return res.status(404).json({ error: "Property not found" });
        }

        // If user has restricted access, check if they can manage this property
        if (restrictedProperties && !restrictedProperties.includes(propertyId)) {
            return res.status(403).json({
                error: "You can only assign caretakers to properties you manage"
            });
        }

        // Check if assignment already exists
        const existingAssignment = await prisma.propertyCaretaker.findFirst({
            where: {
                caretakerId: req.params.id,
                propertyId,
            },
        });

        if (existingAssignment) {
            return res.status(400).json({ error: "Caretaker is already assigned to this property" });
        }

        // Create the assignment
        const assignment = await prisma.propertyCaretaker.create({
            data: {
                caretakerId: req.params.id,
                propertyId,
            },
            include: {
                property: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                    },
                },
            },
        });

        res.status(201).json({
            message: "Caretaker assigned to property successfully",
            assignment,
        });
    } catch (error) {
        console.error("Error assigning caretaker:", error);
        res.status(500).json({ error: "Failed to assign caretaker" });
    }
});

// DELETE /caretakers/:id/unassign/:propertyId - Unassign caretaker from property
caretakerRouter.delete("/:id/unassign/:propertyId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to manage caretakers
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to manage caretakers" });
        }

        const { id: caretakerId, propertyId } = req.params;

        // If user has restricted access, check if they can manage this property
        if (restrictedProperties && !restrictedProperties.includes(propertyId)) {
            return res.status(403).json({
                error: "You can only unassign caretakers from properties you manage"
            });
        }

        // Check if assignment exists
        const assignment = await prisma.propertyCaretaker.findFirst({
            where: {
                caretakerId,
                propertyId,
            },
            include: {
                caretaker: {
                    where: { agencyId: req.agencyId },
                },
                property: {
                    where: { agencyId: req.agencyId },
                },
            },
        });

        if (!assignment || !assignment.caretaker || !assignment.property) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        // Remove the assignment
        await prisma.propertyCaretaker.delete({
            where: { id: assignment.id },
        });

        res.json({
            message: "Caretaker unassigned from property successfully",
        });
    } catch (error) {
        console.error("Error unassigning caretaker:", error);
        res.status(500).json({ error: "Failed to unassign caretaker" });
    }
});

// GET /caretakers/:id/properties - Get properties assigned to caretaker
caretakerRouter.get("/:id/properties", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to view caretaker properties" });
        }

        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    include: {
                        property: {
                            include: {
                                leases: {
                                    where: { endDate: null }, // Active leases only
                                    include: {
                                        tenant: {
                                            select: { name: true, phone: true },
                                        },
                                    },
                                },
                                units: {
                                    select: {
                                        id: true,
                                        unitNumber: true,
                                        status: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        let properties = caretaker.properties.map(p => ({
            ...p.property,
            assignedAt: p.assignedAt,
            activeLeases: p.property.leases.length,
            tenants: p.property.leases.map(lease => lease.tenant),
        }));

        // If user has restricted access, filter properties to only show their managed ones
        if (restrictedProperties) {
            properties = properties.filter(prop =>
                restrictedProperties.includes(prop.id)
            );
        }

        res.json({
            caretaker: {
                id: caretaker.id,
                name: caretaker.name,
                phone: caretaker.phone,
                email: caretaker.email,
            },
            properties,
        });
    } catch (error) {
        console.error("Error fetching caretaker properties:", error);
        res.status(500).json({ error: "Failed to fetch caretaker properties" });
    }
});

// ===== CARETAKER PAYMENT ROUTES =====

// GET /caretakers/:id/payments - Get payment history for caretaker
caretakerRouter.get("/:id/payments", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to view caretaker payments" });
        }

        const { page = 1, limit = 10, period } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Check if caretaker exists and user has access
        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    select: { propertyId: true },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, check if they manage any of the caretaker's properties
        if (restrictedProperties) {
            const caretakerPropertyIds = caretaker.properties.map(p => p.propertyId);
            const hasAccess = caretakerPropertyIds.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only view payments for caretakers assigned to your properties" 
                });
            }
        }

        // Build payment filter
        const paymentFilter = {
            caretakerId: req.params.id,
            agencyId: req.agencyId,
        };

        if (period) {
            paymentFilter.paymentPeriod = period;
        }

        const [payments, total] = await Promise.all([
            prisma.caretakerPayment.findMany({
                where: paymentFilter,
                include: {
                    caretaker: {
                        select: { name: true, phone: true },
                    },
                },
                skip,
                take: parseInt(limit),
                orderBy: { paymentDate: "desc" },
            }),
            prisma.caretakerPayment.count({ where: paymentFilter }),
        ]);

        res.json({
            payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Error fetching caretaker payments:", error);
        res.status(500).json({ error: "Failed to fetch caretaker payments" });
    }
});

// POST /caretakers/:id/payments - Create payment for caretaker
caretakerRouter.post("/:id/payments", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to create caretaker payments" });
        }

        const parsed = createPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const { amount, paymentDate, paymentPeriod, method, referenceNumber, description, properties } = parsed.data;

        // Check if caretaker exists and user has access
        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    select: { propertyId: true },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, check if they manage any of the caretaker's properties
        if (restrictedProperties) {
            const caretakerPropertyIds = caretaker.properties.map(p => p.propertyId);
            const hasAccess = caretakerPropertyIds.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only create payments for caretakers assigned to your properties" 
                });
            }
        }

        // Check for duplicate payment period
        const existingPayment = await prisma.caretakerPayment.findFirst({
            where: {
                caretakerId: req.params.id,
                paymentPeriod,
            },
        });

        if (existingPayment) {
            return res.status(400).json({ 
                error: `Payment for period ${paymentPeriod} already exists` 
            });
        }

        // Validate properties if provided
        let validatedProperties = [];
        if (properties && properties.length > 0) {
            const propertyFilter = {
                id: { in: properties },
                agencyId: req.agencyId,
            };

            // If user has restricted access, only allow their managed properties
            if (restrictedProperties) {
                propertyFilter.id = { in: properties.filter(id => restrictedProperties.includes(id)) };
            }

            const validProperties = await prisma.property.findMany({
                where: propertyFilter,
                select: { id: true },
            });

            validatedProperties = validProperties.map(p => p.id);
        }

        // Create the payment
        const payment = await prisma.caretakerPayment.create({
            data: {
                caretakerId: req.params.id,
                agencyId: req.agencyId,
                amount,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                paymentPeriod,
                method,
                referenceNumber,
                description,
                properties: validatedProperties,
                paidBy: req.user?.id || req.agent?.agentId,
                status: "COMPLETED",
            },
            include: {
                caretaker: {
                    select: { name: true, phone: true },
                },
            },
        });

        res.status(201).json({
            message: "Payment created successfully",
            payment,
        });
    } catch (error) {
        console.error("Error creating caretaker payment:", error);
        res.status(500).json({ error: "Failed to create caretaker payment" });
    }
});

// GET /caretakers/:id/payments/:paymentId - Get specific payment
caretakerRouter.get("/:id/payments/:paymentId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to view caretaker payments" });
        }

        const payment = await prisma.caretakerPayment.findFirst({
            where: {
                id: req.params.paymentId,
                caretakerId: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                caretaker: {
                    select: { name: true, phone: true, email: true },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // If user has restricted access, check if they manage any of the payment's properties
        if (restrictedProperties && payment.properties.length > 0) {
            const hasAccess = payment.properties.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only view payments for properties you manage" 
                });
            }
        }

        res.json(payment);
    } catch (error) {
        console.error("Error fetching caretaker payment:", error);
        res.status(500).json({ error: "Failed to fetch caretaker payment" });
    }
});

// PUT /caretakers/:id/payments/:paymentId - Update payment
caretakerRouter.put("/:id/payments/:paymentId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to update caretaker payments" });
        }

        const parsed = updatePaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        // Check if payment exists
        const existingPayment = await prisma.caretakerPayment.findFirst({
            where: {
                id: req.params.paymentId,
                caretakerId: req.params.id,
                agencyId: req.agencyId,
            },
        });

        if (!existingPayment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // If user has restricted access, check if they manage any of the payment's properties
        if (restrictedProperties && existingPayment.properties.length > 0) {
            const hasAccess = existingPayment.properties.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only update payments for properties you manage" 
                });
            }
        }

        // Validate properties if provided
        let validatedProperties = existingPayment.properties;
        if (parsed.data.properties) {
            const propertyFilter = {
                id: { in: parsed.data.properties },
                agencyId: req.agencyId,
            };

            // If user has restricted access, only allow their managed properties
            if (restrictedProperties) {
                propertyFilter.id = { in: parsed.data.properties.filter(id => restrictedProperties.includes(id)) };
            }

            const validProperties = await prisma.property.findMany({
                where: propertyFilter,
                select: { id: true },
            });

            validatedProperties = validProperties.map(p => p.id);
        }

        // Update the payment
        const updatedPayment = await prisma.caretakerPayment.update({
            where: { id: req.params.paymentId },
            data: {
                ...parsed.data,
                paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : undefined,
                properties: validatedProperties,
            },
            include: {
                caretaker: {
                    select: { name: true, phone: true },
                },
            },
        });

        res.json({
            message: "Payment updated successfully",
            payment: updatedPayment,
        });
    } catch (error) {
        console.error("Error updating caretaker payment:", error);
        res.status(500).json({ error: "Failed to update caretaker payment" });
    }
});

// DELETE /caretakers/:id/payments/:paymentId - Delete payment
caretakerRouter.delete("/:id/payments/:paymentId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to delete caretaker payments" });
        }

        // Check if payment exists
        const existingPayment = await prisma.caretakerPayment.findFirst({
            where: {
                id: req.params.paymentId,
                caretakerId: req.params.id,
                agencyId: req.agencyId,
            },
        });

        if (!existingPayment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // If user has restricted access, check if they manage any of the payment's properties
        if (restrictedProperties && existingPayment.properties.length > 0) {
            const hasAccess = existingPayment.properties.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only delete payments for properties you manage" 
                });
            }
        }

        // Delete the payment
        await prisma.caretakerPayment.delete({
            where: { id: req.params.paymentId },
        });

        res.json({
            message: "Payment deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting caretaker payment:", error);
        res.status(500).json({ error: "Failed to delete caretaker payment" });
    }
});

// GET /caretakers/payments/summary - Get payment summary across all caretakers
caretakerRouter.get("/payments/summary", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to view payment summary" });
        }

        const { period, startDate, endDate } = req.query;

        // Build filter for payments
        const paymentFilter = {
            agencyId: req.agencyId,
        };

        if (period) {
            paymentFilter.paymentPeriod = period;
        }

        if (startDate && endDate) {
            paymentFilter.paymentDate = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        // If user has restricted access, filter by caretakers assigned to their properties
        if (restrictedProperties) {
            paymentFilter.caretaker = {
                properties: {
                    some: {
                        propertyId: { in: restrictedProperties },
                    },
                },
            };
        }

        const [totalPayments, totalAmount, paymentsByMethod, recentPayments] = await Promise.all([
            prisma.caretakerPayment.count({ where: paymentFilter }),
            prisma.caretakerPayment.aggregate({
                where: paymentFilter,
                _sum: { amount: true },
            }),
            prisma.caretakerPayment.groupBy({
                by: ['method'],
                where: paymentFilter,
                _count: { _all: true },
                _sum: { amount: true },
            }),
            prisma.caretakerPayment.findMany({
                where: paymentFilter,
                include: {
                    caretaker: {
                        select: { name: true, phone: true },
                    },
                },
                orderBy: { paymentDate: "desc" },
                take: 5,
            }),
        ]);

        res.json({
            summary: {
                totalPayments,
                totalAmount: totalAmount._sum.amount || 0,
                paymentsByMethod: paymentsByMethod.map(method => ({
                    method: method.method,
                    count: method._count._all,
                    amount: method._sum.amount || 0,
                })),
            },
            recentPayments,
        });
    } catch (error) {
        console.error("Error fetching payment summary:", error);
        res.status(500).json({ error: "Failed to fetch payment summary" });
    }
});

// GET /caretakers/:id/payments/:paymentId/receipt - Generate payment receipt
caretakerRouter.get("/:id/payments/:paymentId/receipt", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to generate payment receipts" });
        }

        const payment = await prisma.caretakerPayment.findFirst({
            where: {
                id: req.params.paymentId,
                caretakerId: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                caretaker: {
                    select: { name: true, phone: true, email: true },
                },
                agency: {
                    select: { name: true },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({ error: "Payment not found" });
        }

        // If user has restricted access, check if they manage any of the payment's properties
        if (restrictedProperties && payment.properties.length > 0) {
            const hasAccess = payment.properties.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only generate receipts for payments on properties you manage" 
                });
            }
        }

        // Generate receipt
        const receipt = await generatePaymentReceipt(payment);

        res.json({
            message: "Payment receipt generated successfully",
            receipt: {
                ...receipt,
                agencyName: payment.agency.name,
                caretakerPhone: payment.caretaker.phone,
                caretakerEmail: payment.caretaker.email,
            },
        });
    } catch (error) {
        console.error("Error generating payment receipt:", error);
        res.status(500).json({ error: "Failed to generate payment receipt" });
    }
});

// ===== COMMISSION CALCULATION ROUTES =====

// POST /caretakers/:id/calculate-commission - Calculate commission for caretaker
caretakerRouter.post("/:id/calculate-commission", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to calculate commissions" });
        }

        const { paymentPeriod, properties } = req.body;

        if (!paymentPeriod) {
            return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
        }

        // Validate payment period format
        const { validatePaymentPeriod, calculateCaretakerCommission } = await import("../services/commissionCalculation.js");
        validatePaymentPeriod(paymentPeriod);

        // Check if caretaker exists and user has access
        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    select: { propertyId: true },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, check if they manage any of the caretaker's properties
        if (restrictedProperties) {
            const caretakerPropertyIds = caretaker.properties.map(p => p.propertyId);
            const hasAccess = caretakerPropertyIds.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only calculate commissions for caretakers assigned to your properties" 
                });
            }
        }

        // Filter properties if user has restricted access
        let calculationProperties = properties || [];
        if (restrictedProperties && calculationProperties.length > 0) {
            calculationProperties = calculationProperties.filter(propId => 
                restrictedProperties.includes(propId)
            );
        }

        // Calculate commission
        const calculation = await calculateCaretakerCommission(req.params.id, paymentPeriod, calculationProperties);

        res.json({
            message: "Commission calculated successfully",
            calculation,
        });
    } catch (error) {
        console.error("Error calculating caretaker commission:", error);
        res.status(500).json({ error: error.message || "Failed to calculate commission" });
    }
});

// POST /caretakers/:id/auto-payment - Auto-calculate and create payment
caretakerRouter.post("/:id/auto-payment", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage, restrictedProperties } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to create auto-payments" });
        }

        const { paymentPeriod, properties } = req.body;

        if (!paymentPeriod) {
            return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
        }

        // Validate payment period format
        const { validatePaymentPeriod, autoCalculateCaretakerPayment } = await import("../services/commissionCalculation.js");
        validatePaymentPeriod(paymentPeriod);

        // Check if caretaker exists and user has access
        const caretaker = await prisma.caretaker.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                properties: {
                    select: { propertyId: true },
                },
            },
        });

        if (!caretaker) {
            return res.status(404).json({ error: "Caretaker not found" });
        }

        // If user has restricted access, check if they manage any of the caretaker's properties
        if (restrictedProperties) {
            const caretakerPropertyIds = caretaker.properties.map(p => p.propertyId);
            const hasAccess = caretakerPropertyIds.some(propId => 
                restrictedProperties.includes(propId)
            );
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "You can only create auto-payments for caretakers assigned to your properties" 
                });
            }
        }

        // Filter properties if user has restricted access
        let calculationProperties = properties || [];
        if (restrictedProperties && calculationProperties.length > 0) {
            calculationProperties = calculationProperties.filter(propId => 
                restrictedProperties.includes(propId)
            );
        }

        // Auto-calculate and create payment
        const result = await autoCalculateCaretakerPayment(req.params.id, paymentPeriod, calculationProperties);

        // Update caretaker's total earned
        await prisma.caretaker.update({
            where: { id: req.params.id },
            data: {
                totalEarned: {
                    increment: result.calculation.totalAmount / 100, // Convert cents to currency units
                },
            },
        });

        res.status(201).json({
            message: "Auto-payment created successfully",
            payment: result.payment,
            calculation: result.calculation,
        });
    } catch (error) {
        console.error("Error creating auto-payment:", error);
        res.status(500).json({ error: error.message || "Failed to create auto-payment" });
    }
});

// GET /commissions/summary - Get commission summary for agency
caretakerRouter.get("/commissions/summary", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check permissions first
        const { canManage } = await canManageCaretakers(req);
        if (!canManage) {
            return res.status(403).json({ error: "Insufficient permissions to view commission summary" });
        }

        const { paymentPeriod } = req.query;

        if (!paymentPeriod) {
            return res.status(400).json({ error: "Payment period is required (format: YYYY-MM)" });
        }

        // Validate payment period format
        const { validatePaymentPeriod, getAgencyCommissionSummary } = await import("../services/commissionCalculation.js");
        validatePaymentPeriod(paymentPeriod);

        // Get commission summary
        const summary = await getAgencyCommissionSummary(req.agencyId, paymentPeriod);

        res.json({
            message: "Commission summary retrieved successfully",
            summary,
        });
    } catch (error) {
        console.error("Error fetching commission summary:", error);
        res.status(500).json({ error: error.message || "Failed to fetch commission summary" });
    }
});

// Helper function to check agent permissions
async function checkAgentPermission(agentId, permission) {
    try {
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: { permissions: true, isActive: true },
        });

        return agent && agent.isActive && agent.permissions.includes(permission);
    } catch (error) {
        console.error("Error checking agent permission:", error);
        return false;
    }
}

// Helper function to get properties managed by a user (property manager/landlord)
async function getUserManagedProperties(userId, agencyId) {
    try {
        const managedProperties = await prisma.propertyManager.findMany({
            where: {
                userId,
                property: {
                    agencyId, // Ensure property belongs to the same agency
                },
            },
            select: {
                propertyId: true,
                role: true,
            },
        });

        return managedProperties.map(pm => pm.propertyId);
    } catch (error) {
        console.error("Error getting user managed properties:", error);
        return [];
    }
}

// Helper function to check if user can manage caretakers
async function canManageCaretakers(req) {
    // Admin users can manage all caretakers in their agency
    if (req.userType === "user" && req.user?.role === "ADMIN") {
        return { canManage: true, restrictedProperties: null };
    }

    // Agents need specific permission
    if (req.userType === "agent") {
        const hasPermission = await checkAgentPermission(req.agent.agentId, "manage_caretakers");
        return { canManage: hasPermission, restrictedProperties: null };
    }

    // Property managers/landlords can manage caretakers for their properties only
    if (req.userType === "user" && req.user?.id) {
        const managedProperties = await getUserManagedProperties(req.user.id, req.agencyId);
        return {
            canManage: managedProperties.length > 0,
            restrictedProperties: managedProperties
        };
    }

    return { canManage: false, restrictedProperties: null };
}

// Helper function to filter caretakers based on user permissions
async function getCaretakerFilter(req, baseFilter = {}) {
    const { canManage, restrictedProperties } = await canManageCaretakers(req);

    if (!canManage) {
        // Return filter that matches nothing
        return { ...baseFilter, id: "non-existent-id" };
    }

    // If user has restricted access, only show caretakers assigned to their properties
    if (restrictedProperties) {
        return {
            ...baseFilter,
            properties: {
                some: {
                    propertyId: { in: restrictedProperties },
                },
            },
        };
    }

    // Admin/Agent with permission can see all caretakers in agency
    return baseFilter;
}

// Helper function to generate payment receipt (placeholder for future implementation)
async function generatePaymentReceipt(payment) {
    // This would integrate with a PDF generation service or template engine
    // For now, return a simple receipt object
    return {
        receiptNumber: `CR-${payment.id.slice(-8).toUpperCase()}`,
        paymentId: payment.id,
        caretakerName: payment.caretaker?.name,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentPeriod: payment.paymentPeriod,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        description: payment.description,
        generatedAt: new Date().toISOString(),
    };
}