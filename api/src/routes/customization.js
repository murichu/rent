import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { requireSameAgency } from "../middleware/agentAuth.js";

export const customizationRouter = Router();

// Validation schemas
const brandingSchema = z.object({
  businessName: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  businessAddress: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
});

const currencySchema = z.object({
  defaultCurrency: z.string().length(3, "Currency code must be 3 characters"),
  exchangeRates: z.record(z.number()).optional(),
  autoUpdateRates: z.boolean().default(true),
});

const localizationSchema = z.object({
  defaultLanguage: z.string().length(2, "Language code must be 2 characters").default("en"),
  supportedLanguages: z.array(z.string().length(2)).default(["en"]),
  dateFormat: z.string().default("DD/MM/YYYY"),
  timeFormat: z.enum(["12h", "24h"]).default("24h"),
  timezone: z.string().default("Africa/Nairobi"),
  numberFormat: z.object({
    thousandSeparator: z.string().default(","),
    decimalSeparator: z.string().default("."),
    decimalPlaces: z.number().min(0).max(4).default(2),
  }).optional(),
});

const customFieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  label: z.string().min(1, "Field label is required"),
  type: z.enum(["text", "number", "date", "boolean", "select", "textarea"]),
  entityType: z.enum(["property", "tenant", "lease", "agent", "caretaker"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select fields
  defaultValue: z.string().optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  }).optional(),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

const updateCustomFieldSchema = customFieldSchema.partial();

// GET /customization/branding - Get agency branding settings
customizationRouter.get("/branding", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    
    const settings = await prisma.agencySettings.findUnique({
      where: { agencyId },
      select: {
        businessName: true,
        businessAddress: true,
        businessPhone: true,
        businessEmail: true,
        businessLogo: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    const branding = settings || {
      businessName: null,
      businessAddress: null,
      businessPhone: null,
      businessEmail: null,
      businessLogo: null,
      primaryColor: "#2563eb",
      secondaryColor: "#64748b",
    };

    res.json(branding);
  } catch (error) {
    console.error("Error fetching branding settings:", error);
    res.status(500).json({ error: "Failed to fetch branding settings" });
  }
});

// PUT /customization/branding - Update agency branding
customizationRouter.put("/branding", requireAuth, requireAdmin, requireSameAgency, async (req, res) => {
  try {
    const parsed = brandingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const updateData = {
      ...parsed.data,
      ...(parsed.data.logoUrl && { businessLogo: parsed.data.logoUrl }),
    };

    // Remove logoUrl from updateData since we map it to businessLogo
    delete updateData.logoUrl;

    const settings = await prisma.agencySettings.upsert({
      where: { agencyId },
      update: updateData,
      create: {
        agencyId,
        ...updateData,
      },
      select: {
        businessName: true,
        businessAddress: true,
        businessPhone: true,
        businessEmail: true,
        businessLogo: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    res.json({
      message: "Branding settings updated successfully",
      branding: {
        ...settings,
        logoUrl: settings.businessLogo,
      },
    });
  } catch (error) {
    console.error("Error updating branding settings:", error);
    res.status(500).json({ error: "Failed to update branding settings" });
  }
});

// GET /customization/currency - Get currency settings
customizationRouter.get("/currency", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    
    const settings = await prisma.agencySettings.findUnique({
      where: { agencyId },
      select: {
        defaultCurrency: true,
      },
    });

    // Get system-wide currency configuration
    const systemCurrencyConfig = await prisma.systemConfig.findMany({
      where: {
        key: { in: ["supported_currencies", "exchange_rates", "auto_update_rates"] },
      },
    });

    const systemConfig = systemCurrencyConfig.reduce((acc, config) => {
      acc[config.key] = config.dataType === "json" ? JSON.parse(config.value) : config.value;
      return acc;
    }, {});

    const currencySettings = {
      defaultCurrency: settings?.defaultCurrency || "KES",
      supportedCurrencies: systemConfig.supported_currencies || ["KES", "USD", "EUR", "GBP"],
      exchangeRates: systemConfig.exchange_rates || {},
      autoUpdateRates: systemConfig.auto_update_rates === "true",
      lastUpdated: new Date().toISOString(),
    };

    res.json(currencySettings);
  } catch (error) {
    console.error("Error fetching currency settings:", error);
    res.status(500).json({ error: "Failed to fetch currency settings" });
  }
});

// PUT /customization/currency - Update currency settings
customizationRouter.put("/currency", requireAuth, requireAdmin, requireSameAgency, async (req, res) => {
  try {
    const parsed = currencySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    const { defaultCurrency, exchangeRates, autoUpdateRates } = parsed.data;

    // Update agency default currency
    await prisma.agencySettings.upsert({
      where: { agencyId },
      update: { defaultCurrency },
      create: {
        agencyId,
        defaultCurrency,
      },
    });

    // Update system-wide exchange rates if provided (admin only)
    if (exchangeRates && req.user?.role === "ADMIN") {
      await prisma.systemConfig.upsert({
        where: { key: "exchange_rates" },
        update: {
          value: JSON.stringify(exchangeRates),
          dataType: "json",
        },
        create: {
          key: "exchange_rates",
          value: JSON.stringify(exchangeRates),
          dataType: "json",
          description: "Currency exchange rates",
          category: "currency",
        },
      });
    }

    if (autoUpdateRates !== undefined && req.user?.role === "ADMIN") {
      await prisma.systemConfig.upsert({
        where: { key: "auto_update_rates" },
        update: {
          value: autoUpdateRates.toString(),
          dataType: "boolean",
        },
        create: {
          key: "auto_update_rates",
          value: autoUpdateRates.toString(),
          dataType: "boolean",
          description: "Auto-update exchange rates",
          category: "currency",
        },
      });
    }

    res.json({
      message: "Currency settings updated successfully",
      defaultCurrency,
    });
  } catch (error) {
    console.error("Error updating currency settings:", error);
    res.status(500).json({ error: "Failed to update currency settings" });
  }
});

// GET /customization/localization - Get localization settings
customizationRouter.get("/localization", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;
    
    const userSettings = await prisma.userSettings.findFirst({
      where: { userId: req.user?.id },
      select: {
        language: true,
        timezone: true,
        dateFormat: true,
        timeFormat: true,
      },
    });

    // Get system-wide localization configuration
    const systemLocalizationConfig = await prisma.systemConfig.findMany({
      where: {
        key: { in: ["supported_languages", "default_language", "localization_settings"] },
      },
    });

    const systemConfig = systemLocalizationConfig.reduce((acc, config) => {
      acc[config.key] = config.dataType === "json" ? JSON.parse(config.value) : config.value;
      return acc;
    }, {});

    const localizationSettings = {
      defaultLanguage: systemConfig.default_language || "en",
      supportedLanguages: systemConfig.supported_languages || ["en", "sw"],
      currentLanguage: userSettings?.language || "en",
      timezone: userSettings?.timezone || "Africa/Nairobi",
      dateFormat: userSettings?.dateFormat || "DD/MM/YYYY",
      timeFormat: userSettings?.timeFormat || "24h",
      numberFormat: systemConfig.localization_settings?.numberFormat || {
        thousandSeparator: ",",
        decimalSeparator: ".",
        decimalPlaces: 2,
      },
    };

    res.json(localizationSettings);
  } catch (error) {
    console.error("Error fetching localization settings:", error);
    res.status(500).json({ error: "Failed to fetch localization settings" });
  }
});

// PUT /customization/localization - Update localization settings
customizationRouter.put("/localization", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const parsed = localizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const {
      defaultLanguage,
      supportedLanguages,
      dateFormat,
      timeFormat,
      timezone,
      numberFormat,
    } = parsed.data;

    // Update user-specific settings
    if (req.user?.id) {
      await prisma.userSettings.upsert({
        where: { userId: req.user.id },
        update: {
          language: defaultLanguage,
          timezone,
          dateFormat,
          timeFormat,
        },
        create: {
          userId: req.user.id,
          language: defaultLanguage,
          timezone,
          dateFormat,
          timeFormat,
        },
      });
    }

    // Update system-wide settings (admin only)
    if (req.user?.role === "ADMIN") {
      if (supportedLanguages) {
        await prisma.systemConfig.upsert({
          where: { key: "supported_languages" },
          update: {
            value: JSON.stringify(supportedLanguages),
            dataType: "json",
          },
          create: {
            key: "supported_languages",
            value: JSON.stringify(supportedLanguages),
            dataType: "json",
            description: "Supported languages",
            category: "localization",
          },
        });
      }

      await prisma.systemConfig.upsert({
        where: { key: "default_language" },
        update: {
          value: defaultLanguage,
          dataType: "string",
        },
        create: {
          key: "default_language",
          value: defaultLanguage,
          dataType: "string",
          description: "Default system language",
          category: "localization",
        },
      });

      if (numberFormat) {
        const localizationSettings = { numberFormat };
        await prisma.systemConfig.upsert({
          where: { key: "localization_settings" },
          update: {
            value: JSON.stringify(localizationSettings),
            dataType: "json",
          },
          create: {
            key: "localization_settings",
            value: JSON.stringify(localizationSettings),
            dataType: "json",
            description: "Localization settings",
            category: "localization",
          },
        });
      }
    }

    res.json({
      message: "Localization settings updated successfully",
      settings: parsed.data,
    });
  } catch (error) {
    console.error("Error updating localization settings:", error);
    res.status(500).json({ error: "Failed to update localization settings" });
  }
});

// GET /customization/custom-fields - Get custom fields
customizationRouter.get("/custom-fields", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { entityType } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    const where = {
      agencyId,
      ...(entityType && { entityType }),
    };

    const customFields = await prisma.customField.findMany({
      where,
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    res.json(customFields);
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    res.status(500).json({ error: "Failed to fetch custom fields" });
  }
});

// POST /customization/custom-fields - Create custom field
customizationRouter.post("/custom-fields", requireAuth, requireAdmin, requireSameAgency, async (req, res) => {
  try {
    const parsed = customFieldSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Check if field name already exists for this entity type
    const existingField = await prisma.customField.findFirst({
      where: {
        agencyId,
        name: parsed.data.name,
        entityType: parsed.data.entityType,
      },
    });

    if (existingField) {
      return res.status(400).json({
        error: "A custom field with this name already exists for this entity type",
      });
    }

    const customField = await prisma.customField.create({
      data: {
        ...parsed.data,
        agencyId,
        createdBy: req.user.id,
      },
    });

    res.status(201).json({
      message: "Custom field created successfully",
      customField,
    });
  } catch (error) {
    console.error("Error creating custom field:", error);
    res.status(500).json({ error: "Failed to create custom field" });
  }
});

// PUT /customization/custom-fields/:id - Update custom field
customizationRouter.put("/custom-fields/:id", requireAuth, requireAdmin, requireSameAgency, async (req, res) => {
  try {
    const parsed = updateCustomFieldSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Check if field exists and belongs to agency
    const existingField = await prisma.customField.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!existingField) {
      return res.status(404).json({ error: "Custom field not found" });
    }

    // Check for name conflicts if name is being updated
    if (parsed.data.name && parsed.data.name !== existingField.name) {
      const nameConflict = await prisma.customField.findFirst({
        where: {
          agencyId,
          name: parsed.data.name,
          entityType: existingField.entityType,
          id: { not: req.params.id },
        },
      });

      if (nameConflict) {
        return res.status(400).json({
          error: "A custom field with this name already exists for this entity type",
        });
      }
    }

    const updatedField = await prisma.customField.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        updatedBy: req.user.id,
      },
    });

    res.json({
      message: "Custom field updated successfully",
      customField: updatedField,
    });
  } catch (error) {
    console.error("Error updating custom field:", error);
    res.status(500).json({ error: "Failed to update custom field" });
  }
});

// DELETE /customization/custom-fields/:id - Delete custom field
customizationRouter.delete("/custom-fields/:id", requireAuth, requireAdmin, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Check if field exists and belongs to agency
    const existingField = await prisma.customField.findFirst({
      where: {
        id: req.params.id,
        agencyId,
      },
    });

    if (!existingField) {
      return res.status(404).json({ error: "Custom field not found" });
    }

    // Delete the custom field
    await prisma.customField.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "Custom field deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting custom field:", error);
    res.status(500).json({ error: "Failed to delete custom field" });
  }
});

// GET /customization/themes - Get available themes
customizationRouter.get("/themes", requireAuth, async (req, res) => {
  try {
    const themes = [
      {
        id: "default",
        name: "Default Blue",
        primaryColor: "#2563eb",
        secondaryColor: "#64748b",
        description: "Clean and professional blue theme",
      },
      {
        id: "green",
        name: "Nature Green",
        primaryColor: "#059669",
        secondaryColor: "#6b7280",
        description: "Fresh and natural green theme",
      },
      {
        id: "purple",
        name: "Royal Purple",
        primaryColor: "#7c3aed",
        secondaryColor: "#6b7280",
        description: "Elegant and sophisticated purple theme",
      },
      {
        id: "orange",
        name: "Vibrant Orange",
        primaryColor: "#ea580c",
        secondaryColor: "#6b7280",
        description: "Energetic and warm orange theme",
      },
      {
        id: "dark",
        name: "Dark Mode",
        primaryColor: "#1f2937",
        secondaryColor: "#374151",
        description: "Modern dark theme for reduced eye strain",
      },
    ];

    res.json(themes);
  } catch (error) {
    console.error("Error fetching themes:", error);
    res.status(500).json({ error: "Failed to fetch themes" });
  }
});

// GET /customization/export-settings - Export all customization settings
customizationRouter.get("/export-settings", requireAuth, requireAdmin, requireSameAgency, async (req, res) => {
  try {
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    const [agencySettings, customFields, userSettings] = await Promise.all([
      prisma.agencySettings.findUnique({
        where: { agencyId },
      }),
      prisma.customField.findMany({
        where: { agencyId },
      }),
      prisma.userSettings.findMany({
        where: {
          user: { agencyId },
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      agencyId,
      branding: agencySettings ? {
        businessName: agencySettings.businessName,
        businessAddress: agencySettings.businessAddress,
        businessPhone: agencySettings.businessPhone,
        businessEmail: agencySettings.businessEmail,
        businessLogo: agencySettings.businessLogo,
        primaryColor: agencySettings.primaryColor,
        secondaryColor: agencySettings.secondaryColor,
      } : null,
      currency: {
        defaultCurrency: agencySettings?.defaultCurrency || "KES",
      },
      customFields: customFields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        entityType: field.entityType,
        required: field.required,
        options: field.options,
        defaultValue: field.defaultValue,
        validation: field.validation,
        displayOrder: field.displayOrder,
        isActive: field.isActive,
      })),
      userSettings: userSettings.map(setting => ({
        userName: setting.user.name,
        userEmail: setting.user.email,
        language: setting.language,
        timezone: setting.timezone,
        dateFormat: setting.dateFormat,
        timeFormat: setting.timeFormat,
        theme: setting.theme,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="customization-settings-${agencyId}-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error("Error exporting settings:", error);
    res.status(500).json({ error: "Failed to export settings" });
  }
});