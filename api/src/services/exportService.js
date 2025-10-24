import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import logger from '../utils/logger.js';
import { jobQueue } from './jobQueue.js';
import { prisma } from '../db.js';
import { sendEmail } from './email.js';

/**
 * Export Service for handling large data exports
 * Processes exports in background jobs with streaming
 */
class ExportService {
  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.maxExportSize = 100000; // Max 100k records per export
    this.chunkSize = 1000; // Process 1000 records at a time
    
    // Ensure export directory exists
    this.ensureExportDirectory();
    
    // Register job processors
    this.registerProcessors();
  }

  /**
   * Ensure export directory exists
   */
  ensureExportDirectory() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
      logger.info('Export directory created:', this.exportDir);
    }
  }

  /**
   * Register job processors for different export types
   */
  registerProcessors() {
    // Property export processor
    jobQueue.registerProcessor('exports', 'property-export', async (job) => {
      return await this.processPropertyExport(job);
    });

    // Tenant export processor
    jobQueue.registerProcessor('exports', 'tenant-export', async (job) => {
      return await this.processTenantsExport(job);
    });

    // Payment export processor
    jobQueue.registerProcessor('exports', 'payment-export', async (job) => {
      return await this.processPaymentExport(job);
    });

    // Financial report export processor
    jobQueue.registerProcessor('exports', 'financial-report', async (job) => {
      return await this.processFinancialReport(job);
    });

    logger.info('Export job processors registered');
  }  /**

   * Queue property export job
   */
  async exportProperties(filters, userId, agencyId, format = 'csv') {
    const jobData = {
      type: 'property-export',
      filters,
      userId,
      agencyId,
      format,
      requestedAt: new Date().toISOString()
    };

    const job = await jobQueue.addJob('exports', 'property-export', jobData, {
      priority: 5,
      attempts: 3
    });

    logger.info('Property export job queued', {
      jobId: job.id,
      userId,
      agencyId,
      filters
    });

    return job;
  }

  /**
   * Queue tenant export job
   */
  async exportTenants(filters, userId, agencyId, format = 'csv') {
    const jobData = {
      type: 'tenant-export',
      filters,
      userId,
      agencyId,
      format,
      requestedAt: new Date().toISOString()
    };

    const job = await jobQueue.addJob('exports', 'tenant-export', jobData, {
      priority: 5,
      attempts: 3
    });

    logger.info('Tenant export job queued', {
      jobId: job.id,
      userId,
      agencyId,
      filters
    });

    return job;
  }

  /**
   * Queue payment export job
   */
  async exportPayments(filters, userId, agencyId, format = 'csv') {
    const jobData = {
      type: 'payment-export',
      filters,
      userId,
      agencyId,
      format,
      requestedAt: new Date().toISOString()
    };

    const job = await jobQueue.addJob('exports', 'payment-export', jobData, {
      priority: 5,
      attempts: 3
    });

    logger.info('Payment export job queued', {
      jobId: job.id,
      userId,
      agencyId,
      filters
    });

    return job;
  }

  /**
   * Queue financial report job
   */
  async generateFinancialReport(reportType, dateRange, userId, agencyId, format = 'csv') {
    const jobData = {
      type: 'financial-report',
      reportType,
      dateRange,
      userId,
      agencyId,
      format,
      requestedAt: new Date().toISOString()
    };

    const job = await jobQueue.addJob('exports', 'financial-report', jobData, {
      priority: 3,
      attempts: 2
    });

    logger.info('Financial report job queued', {
      jobId: job.id,
      userId,
      agencyId,
      reportType,
      dateRange
    });

    return job;
  }  /**

   * Process property export job
   */
  async processPropertyExport(job) {
    const { filters, userId, agencyId, format } = job.data;
    const filename = `properties_${agencyId}_${Date.now()}.${format}`;
    const filepath = path.join(this.exportDir, filename);

    try {
      await job.progress(10);

      // Count total records
      const totalCount = await prisma.property.count({
        where: {
          agencyId,
          ...this.buildPropertyFilters(filters)
        }
      });

      if (totalCount > this.maxExportSize) {
        throw new Error(`Export too large: ${totalCount} records (max: ${this.maxExportSize})`);
      }

      await job.progress(20);

      // Create CSV stream
      const writeStream = fs.createWriteStream(filepath);
      const csvTransform = this.createCSVTransform([
        'id', 'name', 'address', 'type', 'status', 'units', 'monthlyRent', 'createdAt'
      ]);

      let processed = 0;
      const batchSize = this.chunkSize;

      // Write CSV header
      writeStream.write('ID,Name,Address,Type,Status,Units,Monthly Rent,Created At\n');

      // Process in batches
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const properties = await prisma.property.findMany({
          where: {
            agencyId,
            ...this.buildPropertyFilters(filters)
          },
          include: {
            units: true
          },
          skip,
          take: batchSize,
          orderBy: { createdAt: 'desc' }
        });

        // Transform and write batch
        for (const property of properties) {
          const csvRow = [
            property.id,
            `"${property.name}"`,
            `"${property.address}"`,
            property.type,
            property.status,
            property.units.length,
            property.monthlyRent || 0,
            property.createdAt.toISOString()
          ].join(',') + '\n';

          writeStream.write(csvRow);
          processed++;
        }

        // Update progress
        const progress = Math.min(90, 20 + (processed / totalCount) * 70);
        await job.progress(progress);
      }

      writeStream.end();
      await job.progress(95);

      // Send completion email
      await this.sendExportCompletionEmail(userId, 'Properties', filename, totalCount);
      await job.progress(100);

      return {
        filename,
        recordCount: totalCount,
        fileSize: fs.statSync(filepath).size,
        downloadUrl: `/api/v1/exports/download/${filename}`
      };

    } catch (error) {
      // Clean up file on error
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }

  /**
   * Process tenant export job
   */
  async processTenantsExport(job) {
    const { filters, userId, agencyId, format } = job.data;
    const filename = `tenants_${agencyId}_${Date.now()}.${format}`;
    const filepath = path.join(this.exportDir, filename);

    try {
      await job.progress(10);

      const totalCount = await prisma.tenant.count({
        where: {
          agencyId,
          ...this.buildTenantFilters(filters)
        }
      });

      if (totalCount > this.maxExportSize) {
        throw new Error(`Export too large: ${totalCount} records (max: ${this.maxExportSize})`);
      }

      await job.progress(20);

      const writeStream = fs.createWriteStream(filepath);
      let processed = 0;
      const batchSize = this.chunkSize;

      // Write CSV header
      writeStream.write('ID,Name,Email,Phone,Status,Property,Unit,Lease Start,Lease End,Monthly Rent\n');

      // Process in batches
      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const tenants = await prisma.tenant.findMany({
          where: {
            agencyId,
            ...this.buildTenantFilters(filters)
          },
          include: {
            leases: {
              include: {
                property: true,
                unit: true
              },
              orderBy: { startDate: 'desc' },
              take: 1
            }
          },
          skip,
          take: batchSize,
          orderBy: { createdAt: 'desc' }
        });

        for (const tenant of tenants) {
          const currentLease = tenant.leases[0];
          const csvRow = [
            tenant.id,
            `"${tenant.firstName} ${tenant.lastName}"`,
            tenant.email,
            tenant.phone || '',
            tenant.status,
            currentLease ? `"${currentLease.property.name}"` : '',
            currentLease ? `"${currentLease.unit.unitNumber}"` : '',
            currentLease ? currentLease.startDate.toISOString().split('T')[0] : '',
            currentLease ? currentLease.endDate.toISOString().split('T')[0] : '',
            currentLease ? currentLease.monthlyRent : ''
          ].join(',') + '\n';

          writeStream.write(csvRow);
          processed++;
        }

        const progress = Math.min(90, 20 + (processed / totalCount) * 70);
        await job.progress(progress);
      }

      writeStream.end();
      await job.progress(95);

      await this.sendExportCompletionEmail(userId, 'Tenants', filename, totalCount);
      await job.progress(100);

      return {
        filename,
        recordCount: totalCount,
        fileSize: fs.statSync(filepath).size,
        downloadUrl: `/api/v1/exports/download/${filename}`
      };

    } catch (error) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }  /*
*
   * Process payment export job
   */
  async processPaymentExport(job) {
    const { filters, userId, agencyId, format } = job.data;
    const filename = `payments_${agencyId}_${Date.now()}.${format}`;
    const filepath = path.join(this.exportDir, filename);

    try {
      await job.progress(10);

      const totalCount = await prisma.payment.count({
        where: {
          lease: { agencyId },
          ...this.buildPaymentFilters(filters)
        }
      });

      if (totalCount > this.maxExportSize) {
        throw new Error(`Export too large: ${totalCount} records (max: ${this.maxExportSize})`);
      }

      await job.progress(20);

      const writeStream = fs.createWriteStream(filepath);
      let processed = 0;
      const batchSize = this.chunkSize;

      writeStream.write('ID,Amount,Status,Method,Reference,Tenant,Property,Unit,Payment Date,Created At\n');

      for (let skip = 0; skip < totalCount; skip += batchSize) {
        const payments = await prisma.payment.findMany({
          where: {
            lease: { agencyId },
            ...this.buildPaymentFilters(filters)
          },
          include: {
            lease: {
              include: {
                tenant: true,
                property: true,
                unit: true
              }
            }
          },
          skip,
          take: batchSize,
          orderBy: { createdAt: 'desc' }
        });

        for (const payment of payments) {
          const csvRow = [
            payment.id,
            payment.amount,
            payment.status,
            payment.method || '',
            payment.reference || '',
            `"${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}"`,
            `"${payment.lease.property.name}"`,
            `"${payment.lease.unit.unitNumber}"`,
            payment.paidAt ? payment.paidAt.toISOString().split('T')[0] : '',
            payment.createdAt.toISOString()
          ].join(',') + '\n';

          writeStream.write(csvRow);
          processed++;
        }

        const progress = Math.min(90, 20 + (processed / totalCount) * 70);
        await job.progress(progress);
      }

      writeStream.end();
      await job.progress(95);

      await this.sendExportCompletionEmail(userId, 'Payments', filename, totalCount);
      await job.progress(100);

      return {
        filename,
        recordCount: totalCount,
        fileSize: fs.statSync(filepath).size,
        downloadUrl: `/api/v1/exports/download/${filename}`
      };

    } catch (error) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }

  /**
   * Process financial report job
   */
  async processFinancialReport(job) {
    const { reportType, dateRange, userId, agencyId, format } = job.data;
    const filename = `financial_report_${reportType}_${agencyId}_${Date.now()}.${format}`;
    const filepath = path.join(this.exportDir, filename);

    try {
      await job.progress(10);

      let reportData;
      switch (reportType) {
        case 'income':
          reportData = await this.generateIncomeReport(agencyId, dateRange);
          break;
        case 'expenses':
          reportData = await this.generateExpenseReport(agencyId, dateRange);
          break;
        case 'occupancy':
          reportData = await this.generateOccupancyReport(agencyId, dateRange);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      await job.progress(50);

      // Write report to CSV
      const writeStream = fs.createWriteStream(filepath);
      
      // Write headers based on report type
      const headers = this.getReportHeaders(reportType);
      writeStream.write(headers.join(',') + '\n');

      // Write data rows
      for (const row of reportData) {
        const csvRow = headers.map(header => {
          const value = row[header.toLowerCase().replace(' ', '_')];
          return typeof value === 'string' ? `"${value}"` : (value || '');
        }).join(',') + '\n';
        
        writeStream.write(csvRow);
      }

      writeStream.end();
      await job.progress(95);

      await this.sendExportCompletionEmail(userId, `Financial Report (${reportType})`, filename, reportData.length);
      await job.progress(100);

      return {
        filename,
        recordCount: reportData.length,
        fileSize: fs.statSync(filepath).size,
        downloadUrl: `/api/v1/exports/download/${filename}`
      };

    } catch (error) {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      throw error;
    }
  }  /**
   
* Build property filters for database query
   */
  buildPropertyFilters(filters) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.type) {
      where.type = filters.type;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }
    
    return where;
  }

  /**
   * Build tenant filters for database query
   */
  buildTenantFilters(filters) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }
    
    return where;
  }

  /**
   * Build payment filters for database query
   */
  buildPaymentFilters(filters) {
    const where = {};
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (filters.method) {
      where.method = filters.method;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.paidAt = {};
      if (filters.dateFrom) {
        where.paidAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.paidAt.lte = new Date(filters.dateTo);
      }
    }
    
    return where;
  }

  /**
   * Generate income report data
   */
  async generateIncomeReport(agencyId, dateRange) {
    const { startDate, endDate } = dateRange;
    
    const payments = await prisma.payment.findMany({
      where: {
        lease: { agencyId },
        status: 'COMPLETED',
        paidAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        lease: {
          include: {
            property: true,
            unit: true,
            tenant: true
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    return payments.map(payment => ({
      date: payment.paidAt.toISOString().split('T')[0],
      property: payment.lease.property.name,
      unit: payment.lease.unit.unitNumber,
      tenant: `${payment.lease.tenant.firstName} ${payment.lease.tenant.lastName}`,
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference
    }));
  }

  /**
   * Generate occupancy report data
   */
  async generateOccupancyReport(agencyId, dateRange) {
    const properties = await prisma.property.findMany({
      where: { agencyId },
      include: {
        units: {
          include: {
            leases: {
              where: {
                OR: [
                  {
                    startDate: { lte: new Date(dateRange.endDate) },
                    endDate: { gte: new Date(dateRange.startDate) }
                  }
                ]
              }
            }
          }
        }
      }
    });

    return properties.map(property => {
      const totalUnits = property.units.length;
      const occupiedUnits = property.units.filter(unit => 
        unit.leases.some(lease => lease.status === 'ACTIVE')
      ).length;
      
      return {
        property: property.name,
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        vacant_units: totalUnits - occupiedUnits,
        occupancy_rate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(2) : 0
      };
    });
  }

  /**
   * Get report headers based on report type
   */
  getReportHeaders(reportType) {
    switch (reportType) {
      case 'income':
        return ['Date', 'Property', 'Unit', 'Tenant', 'Amount', 'Method', 'Reference'];
      case 'occupancy':
        return ['Property', 'Total Units', 'Occupied Units', 'Vacant Units', 'Occupancy Rate'];
      default:
        return ['Date', 'Description', 'Amount'];
    }
  }

  /**
   * Send export completion email
   */
  async sendExportCompletionEmail(userId, exportType, filename, recordCount) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: `Export Complete: ${exportType}`,
          template: 'export-complete',
          data: {
            userName: `${user.firstName} ${user.lastName}`,
            exportType,
            recordCount,
            filename,
            downloadUrl: `${process.env.FRONTEND_URL}/exports/download/${filename}`
          }
        });

        logger.info('Export completion email sent', {
          userId,
          email: user.email,
          exportType,
          filename
        });
      }
    } catch (error) {
      logger.error('Failed to send export completion email:', error);
    }
  }

  /**
   * Create CSV transform stream
   */
  createCSVTransform(headers) {
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const csvRow = headers.map(header => chunk[header] || '').join(',') + '\n';
        callback(null, csvRow);
      }
    });
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const files = fs.readdirSync(this.exportDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.exportDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
          deletedCount++;
          logger.info('Deleted old export file:', file);
        }
      }

      logger.info(`Cleanup completed: ${deletedCount} old export files deleted`);
      return deletedCount;
    } catch (error) {
      logger.error('Export cleanup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const exportService = new ExportService();
export default exportService;