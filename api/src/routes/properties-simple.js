import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

export const propertyRouter = Router();
propertyRouter.use(requireAuth);

// Property schema for validation
const propertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  type: z.enum(["APARTMENT", "HOUSE", "COMMERCIAL", "OFFICE", "WAREHOUSE", "LAND", "OTHER"]),
  totalUnits: z.number().int().min(1).optional(),
  description: z.string().optional(),
});

// GET /properties - List all properties for the agency
propertyRouter.get("/", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    
    const properties = await prisma.property.findMany({
      where: { agencyId },
      include: {
        units: {
          select: {
            id: true,
            unitNumber: true,
            status: true,
            rent: true
          }
        },
        _count: {
          select: {
            units: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: properties,
      count: properties.length
    });
  } catch (error) {
    console.error('Properties list error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch properties"
    });
  }
});

// POST /properties - Create a new property
propertyRouter.post("/", async (req, res) => {
  try {
    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten()
      });
    }

    const agencyId = req.user.agencyId;
    
    const property = await prisma.property.create({
      data: {
        ...parsed.data,
        agencyId
      },
      include: {
        _count: {
          select: {
            units: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Property creation error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to create property"
    });
  }
});

// GET /properties/:id - Get a specific property
propertyRouter.get("/:id", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const propertyId = req.params.id;

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        agencyId
      },
      include: {
        units: {
          include: {
            lease: {
              include: {
                tenant: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            units: true
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found"
      });
    }

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Property fetch error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch property"
    });
  }
});

// PUT /properties/:id - Update a property
propertyRouter.put("/:id", async (req, res) => {
  try {
    const parsed = propertySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten()
      });
    }

    const agencyId = req.user.agencyId;
    const propertyId = req.params.id;

    // Check if property exists and belongs to agency
    const existingProperty = await prisma.property.findFirst({
      where: {
        id: propertyId,
        agencyId
      }
    });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        error: "Property not found"
      });
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: parsed.data,
      include: {
        _count: {
          select: {
            units: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedProperty
    });
  } catch (error) {
    console.error('Property update error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update property"
    });
  }
});

// DELETE /properties/:id - Delete a property
propertyRouter.delete("/:id", async (req, res) => {
  try {
    const agencyId = req.user.agencyId;
    const propertyId = req.params.id;

    // Check if property exists and belongs to agency
    const existingProperty = await prisma.property.findFirst({
      where: {
        id: propertyId,
        agencyId
      },
      include: {
        _count: {
          select: {
            units: true
          }
        }
      }
    });

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        error: "Property not found"
      });
    }

    // Check if property has units
    if (existingProperty._count.units > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete property with existing units"
      });
    }

    await prisma.property.delete({
      where: { id: propertyId }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Property deletion error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to delete property"
    });
  }
});

export default propertyRouter;