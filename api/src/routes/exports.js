import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import { exportService } from '../services/exportService.js';
import { reportService } from '../services/reportService.js';
import logger from '../utils/logger.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const exportFiltersSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  method: z.string().optional()
});

const reportParamsSchema = z.object({
  reportType: z.enum(['income', 'expenses', 'occupancy']),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string()
  }),
  format: z.enum(['csv', 'pdf']).default('csv')
});

/**
 * Export properties
 * POST /api/v1/exports/properties
 */
router.post('/properties', authenticateToken, async (req, res) => {
  try {
    const { filters = {}, format = 'csv' } = req.body;
    const userId = req.user.id;
    const agencyId = req.user.agencyId;

    // Validate filters
    const validatedFilters = exportFiltersSchema.parse(filters);

    const job = await exportService.exportProperties(validatedFilters, userId, agencyId, format);

    logger.info('Property export requested', {
      jobId: job.id,
      userId,
      agencyId,
      filters: validatedFilters
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Property export started. You will receive an email when complete.'
      }
    });

  } catch (error) {
    logger.error('Property export failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start property export'
    });
  }
});

/**
 * Export tenants
 * POST /api/v1/exports/tenants
 */
router.post('/tenants', authenticateToken, async (req, res) => {
  try {
    const { filters = {}, format = 'csv' } = req.body;
    const userId = req.user.id;
    const agencyId = req.user.agencyId;

    const validatedFilters = exportFiltersSchema.parse(filters);

    const job = await exportService.exportTenants(validatedFilters, userId, agencyId, format);

    logger.info('Tenant export requested', {
      jobId: job.id,
      userId,
      agencyId,
      filters: validatedFilters
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Tenant export started. You will receive an email when complete.'
      }
    });

  } catch (error) {
    logger.error('Tenant export failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start tenant export'
    });
  }
});

/**
 * Export payments
 * POST /api/v1/exports/payments
 */
router.post('/payments', authenticateToken, async (req, res) => {
  try {
    const { filters = {}, format = 'csv' } = req.body;
    const userId = req.user.id;
    const agencyId = req.user.agencyId;

    const validatedFilters = exportFiltersSchema.parse(filters);

    const job = await exportService.exportPayments(validatedFilters, userId, agencyId, format);

    logger.info('Payment export requested', {
      jobId: job.id,
      userId,
      agencyId,
      filters: validatedFilters
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Payment export started. You will receive an email when complete.'
      }
    });

  } catch (error) {
    logger.error('Payment export failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start payment export'
    });
  }
});

/**
 * Generate financial report
 * POST /api/v1/exports/financial-report
 */
router.post('/financial-report', authenticateToken, async (req, res) => {
  try {
    const validatedParams = reportParamsSchema.parse(req.body);
    const userId = req.user.id;
    const agencyId = req.user.agencyId;

    const job = await exportService.generateFinancialReport(
      validatedParams.reportType,
      validatedParams.dateRange,
      userId,
      agencyId,
      validatedParams.format
    );

    logger.info('Financial report requested', {
      jobId: job.id,
      userId,
      agencyId,
      reportType: validatedParams.reportType,
      dateRange: validatedParams.dateRange
    });

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Financial report generation started. You will receive an email when complete.'
      }
    });

  } catch (error) {
    logger.error('Financial report generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start financial report generation'
    });
  }
});

/**
 * Download export file
 * GET /api/v1/exports/download/:filename
 */
router.get('/download/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id;
    
    // Security: Only allow alphanumeric characters, dots, underscores, and hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    const filepath = path.join(process.cwd(), 'exports', filename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // TODO: Add additional security check to ensure user owns this export
    // This would require storing export metadata in database

    const stats = fs.statSync(filepath);
    const fileExtension = path.extname(filename).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (fileExtension === '.csv') {
      contentType = 'text/csv';
    } else if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (fileExtension === '.json') {
      contentType = 'application/json';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const readStream = fs.createReadStream(filepath);
    readStream.pipe(res);

    readStream.on('error', (error) => {
      logger.error('File download error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });

    logger.info('File downloaded', {
      filename,
      userId,
      fileSize: stats.size
    });

  } catch (error) {
    logger.error('Download failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * Get export history
 * GET /api/v1/exports/history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Get job history for export queues
    const exportHistory = await Promise.all([
      jobQueue.getJobHistory(userId, parseInt(limit), 'exports'),
      jobQueue.getJobHistory(userId, parseInt(limit), 'reports')
    ]);

    const allJobs = [...exportHistory[0], ...exportHistory[1]]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        exports: allJobs,
        total: allJobs.length
      }
    });

  } catch (error) {
    logger.error('Failed to get export history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export history'
    });
  }
});

/**
 * Clean up old export files (admin only)
 * POST /api/v1/exports/cleanup
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { maxAge = 7 * 24 * 60 * 60 * 1000 } = req.body; // Default 7 days

    const deletedCount = await exportService.cleanupOldExports(maxAge);

    logger.info('Export cleanup completed', {
      deletedCount,
      maxAge,
      adminId: req.user.id
    });

    res.json({
      success: true,
      data: {
        deletedCount,
        message: `${deletedCount} old export files deleted`
      }
    });

  } catch (error) {
    logger.error('Export cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old exports'
    });
  }
});

export { router as exportsRouter };