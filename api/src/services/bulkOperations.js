import { prisma } from "../db.js";
import logger from "../utils/logger.js";

/**
 * Bulk operations service for efficient batch processing
 */

const BATCH_SIZE = 100;

/**
 * Bulk property import/export utilities
 */
export class BulkPropertyOperations {
  /**
   * Import properties in batches
   */
  static async importProperties(agencyId, properties) {
    const results = {
      total: properties.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    const startTime = Date.now();
    
    try {
      // Process in batches of 100
      for (let i = 0; i < properties.length; i += BATCH_SIZE) {
        const batch = properties.slice(i, i + BATCH_SIZE);
        
        try {
          // Validate and prepare batch data
          const validatedBatch = batch.map((property, index) => {
            const globalIndex = i + index;
            
            // Basic validation
            if (!property.title || !property.address) {
              results.errors.push({
                index: globalIndex,
                error: "Missing required fields: title and address"
              });
              return null;
            }
            
            return {
              ...property,
              agencyId,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }).filter(Boolean);
          
          if (validatedBatch.length > 0) {
            // Use createMany for efficient batch insert
            const created = await prisma.property.createMany({
              data: validatedBatch,
              skipDuplicates: true
            });
            
            results.successful += created.count;
            
            logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1} processed`, {
              batchSize: validatedBatch.length,
              created: created.count,
              agencyId
            });
          }
          
        } catch (batchError) {
          logger.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed`, {
            error: batchError.message,
            batchSize: batch.length,
            agencyId
          });
          
          results.failed += batch.length;
          results.errors.push({
            batch: Math.floor(i / BATCH_SIZE) + 1,
            error: batchError.message
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info('Bulk property import completed', {
        ...results,
        duration: `${duration}ms`,
        agencyId
      });
      
      return results;
      
    } catch (error) {
      logger.error('Bulk property import failed', {
        error: error.message,
        agencyId
      });
      throw error;
    }
  }
  
  /**
   * Export properties with streaming support
   */
  static async exportProperties(agencyId, options = {}) {
    const { status, includeUnits = false } = options;
    
    const where = { agencyId };
    if (status) where.status = status;
    
    const include = {};
    if (includeUnits) {
      include.units = {
        select: {
          unitNumber: true,
          status: true,
          rentAmount: true,
          type: true
        }
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Get total count for progress tracking
      const total = await prisma.property.count({ where });
      
      const properties = [];
      let processed = 0;
      
      // Process in batches to avoid memory issues
      for (let skip = 0; skip < total; skip += BATCH_SIZE) {
        const batch = await prisma.property.findMany({
          where,
          include,
          skip,
          take: BATCH_SIZE,
          orderBy: { createdAt: 'desc' }
        });
        
        properties.push(...batch);
        processed += batch.length;
        
        logger.debug(`Export batch processed`, {
          processed,
          total,
          percentage: ((processed / total) * 100).toFixed(2),
          agencyId
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info('Bulk property export completed', {
        total: properties.length,
        duration: `${duration}ms`,
        agencyId
      });
      
      return properties;
      
    } catch (error) {
      logger.error('Bulk property export failed', {
        error: error.message,
        agencyId
      });
      throw error;
    }
  }
}

/**
 * Bulk payment processing utilities
 */
export class BulkPaymentOperations {
  /**
   * Process multiple payments in a transaction
   */
  static async processPaymentBatch(agencyId, payments) {
    const results = {
      total: payments.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    const startTime = Date.now();
    
    try {
      // Process in batches with transactions
      for (let i = 0; i < payments.length; i += BATCH_SIZE) {
        const batch = payments.slice(i, i + BATCH_SIZE);
        
        try {
          await prisma.$transaction(async (tx) => {
            for (const [index, payment] of batch.entries()) {
              const globalIndex = i + index;
              
              try {
                // Validate payment data
                if (!payment.leaseId || !payment.amount || !payment.paidAt) {
                  results.errors.push({
                    index: globalIndex,
                    error: "Missing required fields: leaseId, amount, paidAt"
                  });
                  results.failed++;
                  continue;
                }
                
                // Create payment
                const created = await tx.payment.create({
                  data: {
                    ...payment,
                    agencyId,
                    paidAt: new Date(payment.paidAt)
                  }
                });
                
                // Update invoice if provided
                if (payment.invoiceId) {
                  const paymentsSum = await tx.payment.aggregate({
                    _sum: { amount: true },
                    where: { invoiceId: payment.invoiceId }
                  });
                  
                  const invoice = await tx.invoice.findUnique({
                    where: { id: payment.invoiceId },
                    select: { amount: true }
                  });
                  
                  const totalPaid = paymentsSum._sum.amount || 0;
                  let status = "PENDING";
                  if (totalPaid > 0 && totalPaid < (invoice?.amount || 0)) status = "PARTIAL";
                  if (totalPaid >= (invoice?.amount || 0)) status = "PAID";
                  
                  await tx.invoice.update({
                    where: { id: payment.invoiceId },
                    data: { totalPaid, status }
                  });
                }
                
                results.successful++;
                
              } catch (paymentError) {
                results.errors.push({
                  index: globalIndex,
                  error: paymentError.message
                });
                results.failed++;
              }
            }
          });
          
          logger.info(`Payment batch ${Math.floor(i / BATCH_SIZE) + 1} processed`, {
            batchSize: batch.length,
            agencyId
          });
          
        } catch (batchError) {
          logger.error(`Payment batch ${Math.floor(i / BATCH_SIZE) + 1} failed`, {
            error: batchError.message,
            batchSize: batch.length,
            agencyId
          });
          
          results.failed += batch.length;
          results.errors.push({
            batch: Math.floor(i / BATCH_SIZE) + 1,
            error: batchError.message
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info('Bulk payment processing completed', {
        ...results,
        duration: `${duration}ms`,
        agencyId
      });
      
      return results;
      
    } catch (error) {
      logger.error('Bulk payment processing failed', {
        error: error.message,
        agencyId
      });
      throw error;
    }
  }
  
  /**
   * Export payments with related data
   */
  static async exportPayments(agencyId, options = {}) {
    const { startDate, endDate, leaseId } = options;
    
    const where = { agencyId };
    if (leaseId) where.leaseId = leaseId;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }
    
    const startTime = Date.now();
    
    try {
      const total = await prisma.payment.count({ where });
      const payments = [];
      let processed = 0;
      
      for (let skip = 0; skip < total; skip += BATCH_SIZE) {
        const batch = await prisma.payment.findMany({
          where,
          include: {
            lease: {
              select: {
                tenant: {
                  select: {
                    name: true,
                    email: true,
                    phone: true
                  }
                },
                property: {
                  select: {
                    title: true,
                    address: true
                  }
                },
                unit: {
                  select: {
                    unitNumber: true
                  }
                }
              }
            },
            invoice: {
              select: {
                amount: true,
                dueAt: true,
                status: true
              }
            }
          },
          skip,
          take: BATCH_SIZE,
          orderBy: { paidAt: 'desc' }
        });
        
        payments.push(...batch);
        processed += batch.length;
        
        logger.debug(`Payment export batch processed`, {
          processed,
          total,
          percentage: ((processed / total) * 100).toFixed(2),
          agencyId
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info('Bulk payment export completed', {
        total: payments.length,
        duration: `${duration}ms`,
        agencyId
      });
      
      return payments;
      
    } catch (error) {
      logger.error('Bulk payment export failed', {
        error: error.message,
        agencyId
      });
      throw error;
    }
  }
}

/**
 * Bulk tenant operations
 */
export class BulkTenantOperations {
  /**
   * Import tenants in batches
   */
  static async importTenants(agencyId, tenants) {
    const results = {
      total: tenants.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < tenants.length; i += BATCH_SIZE) {
        const batch = tenants.slice(i, i + BATCH_SIZE);
        
        try {
          const validatedBatch = batch.map((tenant, index) => {
            const globalIndex = i + index;
            
            if (!tenant.name) {
              results.errors.push({
                index: globalIndex,
                error: "Missing required field: name"
              });
              return null;
            }
            
            return {
              ...tenant,
              agencyId,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          }).filter(Boolean);
          
          if (validatedBatch.length > 0) {
            const created = await prisma.tenant.createMany({
              data: validatedBatch,
              skipDuplicates: true
            });
            
            results.successful += created.count;
            
            logger.info(`Tenant batch ${Math.floor(i / BATCH_SIZE) + 1} processed`, {
              batchSize: validatedBatch.length,
              created: created.count,
              agencyId
            });
          }
          
        } catch (batchError) {
          logger.error(`Tenant batch ${Math.floor(i / BATCH_SIZE) + 1} failed`, {
            error: batchError.message,
            batchSize: batch.length,
            agencyId
          });
          
          results.failed += batch.length;
          results.errors.push({
            batch: Math.floor(i / BATCH_SIZE) + 1,
            error: batchError.message
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info('Bulk tenant import completed', {
        ...results,
        duration: `${duration}ms`,
        agencyId
      });
      
      return results;
      
    } catch (error) {
      logger.error('Bulk tenant import failed', {
        error: error.message,
        agencyId
      });
      throw error;
    }
  }
  
  /**
   * Update multiple tenant ratings efficiently
   */
  static async updateTenantRatings(tenantUpdates) {
    const results = {
      total: tenantUpdates.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < tenantUpdates.length; i += BATCH_SIZE) {
        const batch = tenantUpdates.slice(i, i + BATCH_SIZE);
        
        try {
          await prisma.$transaction(async (tx) => {
            for (const [index, update] of batch.entries()) {
              const globalIndex = i + index;
              
              try {
                await tx.tenant.update({
                  where: { id: update.tenantId },
                  data: {
                    averageRating: update.rating,
                    isHighRisk: update.isHighRisk || false,
                    updatedAt: new Date()
                  }
                });
                
                results.successful++;
                
              } catch (updateError) {
                results.errors.push({
                  index: globalIndex,
                  tenantId: update.tenantId,
                  error: updateError.message
                });
                results.failed++;
              }
            }
          });
          
          logger.info(`Tenant rating batch ${Math.floor(i / BATCH_SIZE) + 1} processed`, {
            batchSize: batch.length
          });
          
        } catch (batchError) {
          logger.error(`Tenant rating batch ${Math.floor(i / BATCH_SIZE) + 1} failed`, {
            error: batchError.message,
            batchSize: batch.length
          });
          
          results.failed += batch.length;
          results.errors.push({
            batch: Math.floor(i / BATCH_SIZE) + 1,
            error: batchError.message
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info('Bulk tenant rating update completed', {
        ...results,
        duration: `${duration}ms`
      });
      
      return results;
      
    } catch (error) {
      logger.error('Bulk tenant rating update failed', {
        error: error.message
      });
      throw error;
    }
  }
}

/**
 * General bulk operation utilities
 */
export const BulkOperationUtils = {
  /**
   * Validate CSV data structure
   */
  validateCsvData(data, requiredFields) {
    const errors = [];
    
    if (!Array.isArray(data)) {
      errors.push("Data must be an array");
      return { valid: false, errors };
    }
    
    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        }
      });
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Convert data to CSV format
   */
  convertToCSV(data, headers) {
    if (!data || data.length === 0) return '';
    
    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        // Escape commas and quotes
        return `"${String(value || '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [csvHeaders.join(','), ...csvRows].join('\n');
  }
};