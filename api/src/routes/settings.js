import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest, commonSchemas } from '../middleware/validation.js';
import { prisma } from '../db.js';
import { successResponse, errorResponse, notFoundResponse } from '../utils/responses.js';
import logger, { businessLog } from '../utils/logger.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(5).optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  currency: z.string().length(3).optional(),
  dashboardLayout: z.enum(['default', 'compact', 'detailed']).optional(),
  defaultView: z.enum(['dashboard', 'properties', 'tenants', 'payments']).optional(),
  itemsPerPage: z.number().int().min(5).max(100).optional(),
  showWelcomeMessage: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  rentReminders: z.boolean().optional(),
  paymentConfirmations: z.boolean().optional(),
  maintenanceUpdates: z.boolean().optional(),
  leaseExpirations: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
  preferredContactMethod: z.enum(['email', 'sms', 'whatsapp']).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  shareDataForAnalytics: z.boolean().optional(),
  allowMarketingEmails: z.boolean().optional(),
  autoLogoutMinutes: z.number().int().min(5).max(480).optional(),
  sessionTimeout: z.number().int().min(60).max(10080).optional(),
});

const agencySettingsSchema = z.object({
  businessName: z.string().max(200).optional(),
  businessAddress: z.string().max(500).optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  businessLicense: z.string().optional(),
  taxId: z.string().optional(),
  defaultRentDueDay: z.number().int().min(1).max(31).optional(),
  latePaymentGraceDays: z.number().int().min(0).max(30).optional(),
  latePaymentFeeAmount: z.number().int().min(0).optional(),
  latePaymentFeeType: z.enum(['FLAT', 'PERCENTAGE']).optional(),
  enableRentReminders: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(1).max(30).optional(),
  reminderChannels: z.array(z.enum(['email', 'sms', 'whatsapp'])).optional(),
  maxReminderAttempts: z.number().int().min(1).max(10).optional(),
  enableMaintenanceRequests: z.boolean().optional(),
  maintenanceResponseTime: z.number().int().min(1).max(168).optional(),
  allowTenantPhotos: z.boolean().optional(),
  requireMaintenanceApproval: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  securityDepositMonths: z.number().int().min(0).max(12).optional(),
  defaultEmailSender: z.string().email().optional(),
  smsProvider: z.string().optional(),
  whatsappProvider: z.string().optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  termsOfServiceUrl: z.string().url().optional(),
  privacyPolicyUrl: z.string().url().optional(),
});

/**
 * GET /api/v1/settings/user
 * Get current user's settings
 */
router.get('/user', requireAuth, async (req, res) => {
  try {
    let userSettings = await prisma.userSettings.findUnique({
      where: { userId: req.user.userId }
    });

    // Create default settings if they don't exist
    if (!userSettings) {
      userSettings = await prisma.userSettings.create({
        data: { userId: req.user.userId }
      });
    }

    businessLog('user_settings_viewed', {
      userId: req.user.userId,
      settingsId: userSettings.id
    });

    return successResponse(res, userSettings, 'User settings retrieved successfully');
  } catch (error) {
    logger.error('Failed to get user settings:', {
      userId: req.user.userId,
      error: error.message
    });
    return errorResponse(res, 'Failed to retrieve user settings', 500);
  }
});

/**
 * PUT /api/v1/settings/user
 * Update current user's settings
 */
router.put('/user', 
  requireAuth,
  validateRequest({ body: userSettingsSchema }),
  async (req, res) => {
    try {
      const userSettings = await prisma.userSettings.upsert({
        where: { userId: req.user.userId },
        update: {
          ...req.body,
          updatedAt: new Date()
        },
        create: {
          userId: req.user.userId,
          ...req.body
        }
      });

      businessLog('user_settings_updated', {
        userId: req.user.userId,
        settingsId: userSettings.id,
        updatedFields: Object.keys(req.body)
      });

      return successResponse(res, userSettings, 'User settings updated successfully');
    } catch (error) {
      logger.error('Failed to update user settings:', {
        userId: req.user.userId,
        error: error.message,
        data: req.body
      });
      return errorResponse(res, 'Failed to update user settings', 500);
    }
  }
);

/**
 * GET /api/v1/settings/agency
 * Get current user's agency settings
 */
router.get('/agency', requireAuth, async (req, res) => {
  try {
    let agencySettings = await prisma.agencySettings.findUnique({
      where: { agencyId: req.user.agencyId }
    });

    // Create default settings if they don't exist
    if (!agencySettings) {
      agencySettings = await prisma.agencySettings.create({
        data: { agencyId: req.user.agencyId }
      });
    }

    businessLog('agency_settings_viewed', {
      userId: req.user.userId,
      agencyId: req.user.agencyId,
      settingsId: agencySettings.id
    });

    return successResponse(res, agencySettings, 'Agency settings retrieved successfully');
  } catch (error) {
    logger.error('Failed to get agency settings:', {
      userId: req.user.userId,
      agencyId: req.user.agencyId,
      error: error.message
    });
    return errorResponse(res, 'Failed to retrieve agency settings', 500);
  }
});

/**
 * PUT /api/v1/settings/agency
 * Update current user's agency settings (admin only)
 */
router.put('/agency', 
  requireAuth,
  validateRequest({ body: agencySettingsSchema }),
  async (req, res) => {
    try {
      // Check if user has permission to update agency settings
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      });

      if (user.role !== 'ADMIN') {
        return errorResponse(res, 'Only administrators can update agency settings', 403);
      }

      const agencySettings = await prisma.agencySettings.upsert({
        where: { agencyId: req.user.agencyId },
        update: {
          ...req.body,
          updatedAt: new Date()
        },
        create: {
          agencyId: req.user.agencyId,
          ...req.body
        }
      });

      businessLog('agency_settings_updated', {
        userId: req.user.userId,
        agencyId: req.user.agencyId,
        settingsId: agencySettings.id,
        updatedFields: Object.keys(req.body)
      });

      return successResponse(res, agencySettings, 'Agency settings updated successfully');
    } catch (error) {
      logger.error('Failed to update agency settings:', {
        userId: req.user.userId,
        agencyId: req.user.agencyId,
        error: error.message,
        data: req.body
      });
      return errorResponse(res, 'Failed to update agency settings', 500);
    }
  }
);

/**
 * GET /api/v1/settings/system
 * Get public system configuration
 */
router.get('/system', async (req, res) => {
  try {
    const systemConfig = await prisma.systemConfig.findMany({
      where: { isPublic: true },
      select: {
        key: true,
        value: true,
        description: true,
        category: true,
        dataType: true
      }
    });

    // Convert values based on data type
    const config = systemConfig.reduce((acc, item) => {
      let value = item.value;
      
      switch (item.dataType) {
        case 'number':
          value = parseFloat(item.value);
          break;
        case 'boolean':
          value = item.value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(item.value);
          } catch {
            value = item.value;
          }
          break;
      }
      
      acc[item.key] = value;
      return acc;
    }, {});

    return successResponse(res, config, 'System configuration retrieved successfully');
  } catch (error) {
    logger.error('Failed to get system configuration:', error);
    return errorResponse(res, 'Failed to retrieve system configuration', 500);
  }
});

/**
 * GET /api/v1/settings/preferences
 * Get combined user and agency preferences for frontend
 */
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const [userSettings, agencySettings, systemConfig] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId: req.user.userId }
      }),
      prisma.agencySettings.findUnique({
        where: { agencyId: req.user.agencyId }
      }),
      prisma.systemConfig.findMany({
        where: { isPublic: true },
        select: { key: true, value: true, dataType: true }
      })
    ]);

    // Convert system config
    const systemPreferences = systemConfig.reduce((acc, item) => {
      let value = item.value;
      switch (item.dataType) {
        case 'number': value = parseFloat(item.value); break;
        case 'boolean': value = item.value === 'true'; break;
        case 'json': 
          try { value = JSON.parse(item.value); } catch { value = item.value; }
          break;
      }
      acc[item.key] = value;
      return acc;
    }, {});

    const preferences = {
      user: userSettings || {
        theme: 'system',
        language: 'en',
        timezone: 'Africa/Nairobi',
        currency: 'KES',
        itemsPerPage: 10,
        emailNotifications: true,
        preferredContactMethod: 'email'
      },
      agency: agencySettings || {
        currency: 'KES',
        defaultRentDueDay: 5,
        enableRentReminders: true,
        reminderChannels: ['email']
      },
      system: systemPreferences
    };

    return successResponse(res, preferences, 'Preferences retrieved successfully');
  } catch (error) {
    logger.error('Failed to get preferences:', {
      userId: req.user.userId,
      error: error.message
    });
    return errorResponse(res, 'Failed to retrieve preferences', 500);
  }
});

/**
 * POST /api/v1/settings/reset-user
 * Reset user settings to defaults
 */
router.post('/reset-user', requireAuth, async (req, res) => {
  try {
    await prisma.userSettings.deleteMany({
      where: { userId: req.user.userId }
    });

    const defaultSettings = await prisma.userSettings.create({
      data: { userId: req.user.userId }
    });

    businessLog('user_settings_reset', {
      userId: req.user.userId,
      settingsId: defaultSettings.id
    });

    return successResponse(res, defaultSettings, 'User settings reset to defaults');
  } catch (error) {
    logger.error('Failed to reset user settings:', {
      userId: req.user.userId,
      error: error.message
    });
    return errorResponse(res, 'Failed to reset user settings', 500);
  }
});

/**
 * GET /api/v1/settings/export
 * Export user settings as JSON
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: req.user.userId }
    });

    if (!userSettings) {
      return notFoundResponse(res, 'User settings');
    }

    // Remove sensitive fields
    const exportData = {
      ...userSettings,
      id: undefined,
      userId: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };

    businessLog('user_settings_exported', {
      userId: req.user.userId,
      settingsId: userSettings.id
    });

    res.setHeader('Content-Disposition', 'attachment; filename="haven-settings.json"');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
      success: true,
      data: exportData,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    });
  } catch (error) {
    logger.error('Failed to export user settings:', {
      userId: req.user.userId,
      error: error.message
    });
    return errorResponse(res, 'Failed to export user settings', 500);
  }
});

/**
 * POST /api/v1/settings/import
 * Import user settings from JSON
 */
router.post('/import', 
  requireAuth,
  validateRequest({ 
    body: z.object({
      settings: userSettingsSchema.required()
    })
  }),
  async (req, res) => {
    try {
      const { settings } = req.body;

      const userSettings = await prisma.userSettings.upsert({
        where: { userId: req.user.userId },
        update: {
          ...settings,
          updatedAt: new Date()
        },
        create: {
          userId: req.user.userId,
          ...settings
        }
      });

      businessLog('user_settings_imported', {
        userId: req.user.userId,
        settingsId: userSettings.id,
        importedFields: Object.keys(settings)
      });

      return successResponse(res, userSettings, 'User settings imported successfully');
    } catch (error) {
      logger.error('Failed to import user settings:', {
        userId: req.user.userId,
        error: error.message
      });
      return errorResponse(res, 'Failed to import user settings', 500);
    }
  }
);

export { router as settingsRouter };