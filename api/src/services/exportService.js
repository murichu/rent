import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import logger from '../utils/logger.js';
import { jobQueue } from './jobQueue.js';
import { prisma } from '../db.js';
import { sendEmail } from './email.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

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
   * Export report to PDF format
   */
  async exportToPDF(reportData, reportType) {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {});

      // Add header
      doc.fontSize(20).text(`${this.formatReportTitle(reportType)}`, { align: 'center' });
      doc.moveDown();

      // Add period information
      if (reportData.period) {
        doc.fontSize(12).text(`Period: ${new Date(reportData.period.start).toLocaleDateString()} - ${new Date(reportData.period.end).toLocaleDateString()}`, { align: 'center' });
        doc.moveDown();
      }

      // Add summary section
      if (reportData.summary) {
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown(0.5);
        
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (typeof value === 'number') {
            const formattedValue = key.toLowerCase().includes('rate') || key.toLowerCase().includes('margin') 
              ? `${value.toFixed(2)}%` 
              : key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('income')
              ? `KES ${value.toLocaleString()}`
              : value.toLocaleString();
            doc.fontSize(10).text(`${this.formatLabel(key)}: ${formattedValue}`);
          } else if (typeof value === 'object' && value !== null) {
            doc.fontSize(10).text(`${this.formatLabel(key)}: ${JSON.stringify(value)}`);
          } else {
            doc.fontSize(10).text(`${this.formatLabel(key)}: ${value}`);
          }
        });
        doc.moveDown();
      }

      // Add detailed data based on report type
      this.addReportDetails(doc, reportData, reportType);

      // Add footer
      doc.fontSize(8).text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 50);
      doc.text(`Report Type: ${reportType}`, 50, doc.page.height - 35);

      doc.end();

      return new Promise((resolve) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Export report to Excel format
   */
  async exportToExcel(reportData, reportType) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Property Management System';
      workbook.created = new Date();

      // Summary worksheet
      const summarySheet = workbook.addWorksheet('Summary');
      this.addExcelSummary(summarySheet, reportData, reportType);

      // Add detailed data worksheets based on report type
      this.addExcelDetails(workbook, reportData, reportType);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  /**
   * Export report to CSV format
   */
  async exportToCSV(reportData, reportType) {
    try {
      let csvData = '';

      // Add summary as CSV
      if (reportData.summary) {
        csvData += `${this.formatReportTitle(reportType)} - Summary\n`;
        if (reportData.period) {
          csvData += `Period,${new Date(reportData.period.start).toLocaleDateString()} - ${new Date(reportData.period.end).toLocaleDateString()}\n`;
        }
        csvData += '\nMetric,Value\n';
        
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (typeof value === 'number') {
            const formattedValue = key.toLowerCase().includes('rate') || key.toLowerCase().includes('margin') 
              ? `${value.toFixed(2)}%` 
              : key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('income')
              ? value
              : value;
            csvData += `${this.formatLabel(key)},${formattedValue}\n`;
          } else if (typeof value !== 'object') {
            csvData += `${this.formatLabel(key)},${value}\n`;
          }
        });
        csvData += '\n';
      }

      // Add detailed data based on report type
      csvData += this.getCSVDetails(reportData, reportType);

      return csvData;
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  /**
   * Add report details to PDF document
   */
  addReportDetails(doc, reportData, reportType) {
    switch (reportType) {
      case 'financial-report':
        this.addFinancialDetailsToPDF(doc, reportData);
        break;
      case 'occupancy-report':
        this.addOccupancyDetailsToPDF(doc, reportData);
        break;
      case 'agent-performance-report':
        this.addAgentPerformanceDetailsToPDF(doc, reportData);
        break;
      case 'maintenance-report':
        this.addMaintenanceDetailsToPDF(doc, reportData);
        break;
      default:
        this.addGenericDetailsToPDF(doc, reportData);
    }
  }

  /**
   * Add financial details to PDF
   */
  addFinancialDetailsToPDF(doc, reportData) {
    if (reportData.rentCollection) {
      doc.fontSize(14).text('Rent Collection by Method', { underline: true });
      doc.moveDown(0.5);
      Object.entries(reportData.rentCollection.byMethod).forEach(([method, amount]) => {
        doc.fontSize(10).text(`${method}: KES ${amount.toLocaleString()}`);
      });
      doc.moveDown();
    }

    if (reportData.expenses) {
      doc.fontSize(14).text('Expenses by Category', { underline: true });
      doc.moveDown(0.5);
      Object.entries(reportData.expenses.byCategory).forEach(([category, amount]) => {
        doc.fontSize(10).text(`${category}: KES ${amount.toLocaleString()}`);
      });
      doc.moveDown();
    }
  }

  /**
   * Add occupancy details to PDF
   */
  addOccupancyDetailsToPDF(doc, reportData) {
    if (reportData.propertyMetrics && reportData.propertyMetrics.length > 0) {
      doc.fontSize(14).text('Property Performance', { underline: true });
      doc.moveDown(0.5);
      
      reportData.propertyMetrics.forEach(property => {
        doc.fontSize(10).text(`${property.propertyTitle}:`);
        doc.fontSize(9).text(`  Occupancy: ${property.occupancyRate.toFixed(1)}% (${property.occupiedUnits}/${property.totalUnits} units)`);
        doc.fontSize(9).text(`  Collection Rate: ${property.collectionRate.toFixed(1)}%`);
        doc.fontSize(9).text(`  Rent Collected: KES ${property.rentCollected.toLocaleString()}`);
        doc.moveDown(0.3);
      });
    }
  }

  /**
   * Add agent performance details to PDF
   */
  addAgentPerformanceDetailsToPDF(doc, reportData) {
    if (reportData.agentPerformance && reportData.agentPerformance.length > 0) {
      doc.fontSize(14).text('Agent Performance Details', { underline: true });
      doc.moveDown(0.5);
      
      reportData.agentPerformance.slice(0, 10).forEach((agent, index) => {
        doc.fontSize(10).text(`${index + 1}. ${agent.agentName}`);
        doc.fontSize(9).text(`  Properties: ${agent.propertiesManaged}, Tenants: ${agent.tenantsManaged}`);
        doc.fontSize(9).text(`  Rent Collected: KES ${agent.rentCollected.toLocaleString()}`);
        doc.fontSize(9).text(`  Commissions: KES ${agent.commissionsEarned.toLocaleString()}`);
        doc.moveDown(0.3);
      });
    }
  }

  /**
   * Add maintenance details to PDF
   */
  addMaintenanceDetailsToPDF(doc, reportData) {
    if (reportData.breakdowns) {
      doc.fontSize(14).text('Maintenance Breakdown', { underline: true });
      doc.moveDown(0.5);
      
      if (reportData.breakdowns.byCategory) {
        doc.fontSize(12).text('By Category:');
        Object.entries(reportData.breakdowns.byCategory).forEach(([category, count]) => {
          doc.fontSize(10).text(`  ${category}: ${count} requests`);
        });
        doc.moveDown(0.5);
      }

      if (reportData.breakdowns.byPriority) {
        doc.fontSize(12).text('By Priority:');
        Object.entries(reportData.breakdowns.byPriority).forEach(([priority, count]) => {
          doc.fontSize(10).text(`  ${priority}: ${count} requests`);
        });
      }
    }
  }

  /**
   * Add generic details to PDF
   */
  addGenericDetailsToPDF(doc, reportData) {
    Object.entries(reportData).forEach(([key, value]) => {
      if (key !== 'summary' && key !== 'period' && key !== 'generatedAt') {
        doc.fontSize(14).text(this.formatLabel(key), { underline: true });
        doc.moveDown(0.5);
        
        if (Array.isArray(value)) {
          value.slice(0, 20).forEach(item => {
            if (typeof item === 'object') {
              const displayText = item.name || item.title || item.id || JSON.stringify(item).substring(0, 100);
              doc.fontSize(9).text(`• ${displayText}`);
            } else {
              doc.fontSize(9).text(`• ${item}`);
            }
          });
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            doc.fontSize(9).text(`${this.formatLabel(subKey)}: ${subValue}`);
          });
        }
        doc.moveDown();
      }
    });
  }

  /**
   * Add summary to Excel worksheet
   */
  addExcelSummary(worksheet, reportData, reportType) {
    worksheet.name = 'Summary';
    
    // Add title
    worksheet.addRow([this.formatReportTitle(reportType)]);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.addRow([]);

    // Add period
    if (reportData.period) {
      worksheet.addRow(['Period', `${new Date(reportData.period.start).toLocaleDateString()} - ${new Date(reportData.period.end).toLocaleDateString()}`]);
      worksheet.addRow([]);
    }

    // Add summary data
    if (reportData.summary) {
      worksheet.addRow(['Metric', 'Value']);
      worksheet.getRow(worksheet.rowCount).font = { bold: true };
      
      Object.entries(reportData.summary).forEach(([key, value]) => {
        if (typeof value === 'number') {
          worksheet.addRow([this.formatLabel(key), value]);
        } else if (typeof value !== 'object') {
          worksheet.addRow([this.formatLabel(key), value]);
        }
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  /**
   * Add detailed data to Excel workbook
   */
  addExcelDetails(workbook, reportData, reportType) {
    switch (reportType) {
      case 'financial-report':
        this.addFinancialDetailsToExcel(workbook, reportData);
        break;
      case 'occupancy-report':
        this.addOccupancyDetailsToExcel(workbook, reportData);
        break;
      case 'agent-performance-report':
        this.addAgentPerformanceDetailsToExcel(workbook, reportData);
        break;
      case 'maintenance-report':
        this.addMaintenanceDetailsToExcel(workbook, reportData);
        break;
      default:
        this.addGenericDetailsToExcel(workbook, reportData);
    }
  }

  /**
   * Add financial details to Excel
   */
  addFinancialDetailsToExcel(workbook, reportData) {
    if (reportData.rentCollection?.byMethod) {
      const sheet = workbook.addWorksheet('Rent Collection');
      sheet.addRow(['Payment Method', 'Amount']);
      sheet.getRow(1).font = { bold: true };
      
      Object.entries(reportData.rentCollection.byMethod).forEach(([method, amount]) => {
        sheet.addRow([method, amount]);
      });
    }

    if (reportData.expenses?.byCategory) {
      const sheet = workbook.addWorksheet('Expenses');
      sheet.addRow(['Category', 'Amount']);
      sheet.getRow(1).font = { bold: true };
      
      Object.entries(reportData.expenses.byCategory).forEach(([category, amount]) => {
        sheet.addRow([category, amount]);
      });
    }
  }

  /**
   * Add occupancy details to Excel
   */
  addOccupancyDetailsToExcel(workbook, reportData) {
    if (reportData.propertyMetrics) {
      const sheet = workbook.addWorksheet('Property Metrics');
      sheet.addRow(['Property', 'Total Units', 'Occupied', 'Vacant', 'Occupancy Rate', 'Rent Collected', 'Collection Rate']);
      sheet.getRow(1).font = { bold: true };
      
      reportData.propertyMetrics.forEach(property => {
        sheet.addRow([
          property.propertyTitle,
          property.totalUnits,
          property.occupiedUnits,
          property.vacantUnits,
          property.occupancyRate,
          property.rentCollected,
          property.collectionRate
        ]);
      });
    }
  }

  /**
   * Add agent performance details to Excel
   */
  addAgentPerformanceDetailsToExcel(workbook, reportData) {
    if (reportData.agentPerformance) {
      const sheet = workbook.addWorksheet('Agent Performance');
      sheet.addRow(['Agent Name', 'Properties', 'Tenants', 'Rent Collected', 'Commissions Earned', 'Commission Rate']);
      sheet.getRow(1).font = { bold: true };
      
      reportData.agentPerformance.forEach(agent => {
        sheet.addRow([
          agent.agentName,
          agent.propertiesManaged,
          agent.tenantsManaged,
          agent.rentCollected,
          agent.commissionsEarned,
          agent.commissionRate
        ]);
      });
    }
  }

  /**
   * Add maintenance details to Excel
   */
  addMaintenanceDetailsToExcel(workbook, reportData) {
    if (reportData.requests) {
      const sheet = workbook.addWorksheet('Maintenance Requests');
      sheet.addRow(['Title', 'Category', 'Priority', 'Status', 'Property', 'Tenant', 'Created', 'Completed', 'Cost']);
      sheet.getRow(1).font = { bold: true };
      
      reportData.requests.forEach(request => {
        sheet.addRow([
          request.title,
          request.category,
          request.priority,
          request.status,
          request.propertyTitle,
          request.tenantName,
          request.createdAt,
          request.completedDate,
          request.actualCost || request.estimatedCost
        ]);
      });
    }
  }

  /**
   * Add generic details to Excel
   */
  addGenericDetailsToExcel(workbook, reportData) {
    Object.entries(reportData).forEach(([key, value]) => {
      if (key !== 'summary' && key !== 'period' && key !== 'generatedAt' && Array.isArray(value)) {
        const sheet = workbook.addWorksheet(this.formatLabel(key));
        
        if (value.length > 0 && typeof value[0] === 'object') {
          const headers = Object.keys(value[0]);
          sheet.addRow(headers.map(h => this.formatLabel(h)));
          sheet.getRow(1).font = { bold: true };
          
          value.forEach(item => {
            sheet.addRow(headers.map(h => item[h]));
          });
        }
      }
    });
  }

  /**
   * Get CSV details for different report types
   */
  getCSVDetails(reportData, reportType) {
    let csvData = '';

    switch (reportType) {
      case 'financial-report':
        csvData += this.getFinancialCSVDetails(reportData);
        break;
      case 'occupancy-report':
        csvData += this.getOccupancyCSVDetails(reportData);
        break;
      case 'agent-performance-report':
        csvData += this.getAgentPerformanceCSVDetails(reportData);
        break;
      case 'maintenance-report':
        csvData += this.getMaintenanceCSVDetails(reportData);
        break;
      default:
        csvData += this.getGenericCSVDetails(reportData);
    }

    return csvData;
  }

  /**
   * Get financial CSV details
   */
  getFinancialCSVDetails(reportData) {
    let csvData = '';

    if (reportData.rentCollection?.byMethod) {
      csvData += 'Rent Collection by Method\n';
      csvData += 'Payment Method,Amount\n';
      Object.entries(reportData.rentCollection.byMethod).forEach(([method, amount]) => {
        csvData += `${method},${amount}\n`;
      });
      csvData += '\n';
    }

    if (reportData.expenses?.byCategory) {
      csvData += 'Expenses by Category\n';
      csvData += 'Category,Amount\n';
      Object.entries(reportData.expenses.byCategory).forEach(([category, amount]) => {
        csvData += `${category},${amount}\n`;
      });
    }

    return csvData;
  }

  /**
   * Get occupancy CSV details
   */
  getOccupancyCSVDetails(reportData) {
    let csvData = '';

    if (reportData.propertyMetrics) {
      csvData += 'Property Performance\n';
      csvData += 'Property,Total Units,Occupied,Vacant,Occupancy Rate,Rent Collected,Collection Rate\n';
      reportData.propertyMetrics.forEach(property => {
        csvData += `${property.propertyTitle},${property.totalUnits},${property.occupiedUnits},${property.vacantUnits},${property.occupancyRate.toFixed(2)},${property.rentCollected},${property.collectionRate.toFixed(2)}\n`;
      });
    }

    return csvData;
  }

  /**
   * Get agent performance CSV details
   */
  getAgentPerformanceCSVDetails(reportData) {
    let csvData = '';

    if (reportData.agentPerformance) {
      csvData += 'Agent Performance\n';
      csvData += 'Agent Name,Properties,Tenants,Rent Collected,Commissions Earned,Commission Rate\n';
      reportData.agentPerformance.forEach(agent => {
        csvData += `${agent.agentName},${agent.propertiesManaged},${agent.tenantsManaged},${agent.rentCollected},${agent.commissionsEarned},${agent.commissionRate}\n`;
      });
    }

    return csvData;
  }

  /**
   * Get maintenance CSV details
   */
  getMaintenanceCSVDetails(reportData) {
    let csvData = '';

    if (reportData.requests) {
      csvData += 'Maintenance Requests\n';
      csvData += 'Title,Category,Priority,Status,Property,Tenant,Created,Completed,Cost\n';
      reportData.requests.forEach(request => {
        csvData += `"${request.title}",${request.category},${request.priority},${request.status},"${request.propertyTitle}","${request.tenantName}",${request.createdAt},${request.completedDate || ''},${request.actualCost || request.estimatedCost || ''}\n`;
      });
    }

    return csvData;
  }

  /**
   * Get generic CSV details
   */
  getGenericCSVDetails(reportData) {
    let csvData = '';

    Object.entries(reportData).forEach(([key, value]) => {
      if (key !== 'summary' && key !== 'period' && key !== 'generatedAt' && Array.isArray(value)) {
        csvData += `${this.formatLabel(key)}\n`;
        
        if (value.length > 0 && typeof value[0] === 'object') {
          const headers = Object.keys(value[0]);
          csvData += headers.map(h => this.formatLabel(h)).join(',') + '\n';
          
          value.forEach(item => {
            csvData += headers.map(h => {
              const val = item[h];
              return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            }).join(',') + '\n';
          });
        }
        csvData += '\n';
      }
    });

    return csvData;
  }

  /**
   * Format report title
   */
  formatReportTitle(reportType) {
    return reportType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Format label for display
   */
  formatLabel(key) {
    return key.split(/(?=[A-Z])|_/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
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