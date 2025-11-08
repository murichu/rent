import { Transform, Readable } from 'stream';
import { prisma } from '../db.js';
import logger from '../utils/logger.js';

/**
 * Streaming Service for Large Dataset Processing
 * Provides memory-efficient streaming for large query results and file operations
 */

class StreamingService {
  constructor() {
    this.defaultBatchSize = 100;
    this.maxBatchSize = 1000;
  }

  /**
   * Create a readable stream for large database queries
   */
  createDatabaseStream(model, query, options = {}) {
    const { batchSize = this.defaultBatchSize, select, include } = options;
    let offset = 0;
    let hasMore = true;

    return new Readable({
      objectMode: true,
      async read() {
        if (!hasMore) {
          this.push(null); // End stream
          return;
        }

        try {
          const queryOptions = {
            ...query,
            skip: offset,
            take: batchSize
          };

          if (select) queryOptions.select = select;
          if (include) queryOptions.include = include;

          const results = await prisma[model].findMany(queryOptions);
          
          if (results.length === 0) {
            hasMore = false;
            this.push(null);
            return;
          }

          // Push each result individually
          for (const result of results) {
            this.push(result);
          }

          offset += results.length;
          
          // If we got fewer results than batch size, we're done
          if (results.length < batchSize) {
            hasMore = false;
          }

          logger.debug('Database stream batch processed', {
            model,
            offset,
            batchSize: results.length,
            hasMore
          });

        } catch (error) {
          logger.error('Database stream error', { error: error.message, model, offset });
          this.emit('error', error);
        }
      }
    });
  }

  /**
   * Create a transform stream for processing data
   */
  createProcessingStream(processFn, options = {}) {
    const { objectMode = true } = options;

    return new Transform({
      objectMode,
      transform(chunk, encoding, callback) {
        try {
          const processed = processFn(chunk);
          callback(null, processed);
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Create a CSV transform stream
   */
  createCSVTransform(headers, options = {}) {
    const { delimiter = ',', includeHeaders = true } = options;
    let headersSent = false;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          let output = '';

          // Send headers first
          if (includeHeaders && !headersSent) {
            output += headers.join(delimiter) + '\n';
            headersSent = true;
          }

          // Convert object to CSV row
          const values = headers.map(header => {
            const value = this.getNestedValue(chunk, header);
            // Escape values containing delimiter or quotes
            if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          });

          output += values.join(delimiter) + '\n';
          callback(null, output);
        } catch (error) {
          callback(error);
        }
      },

      // Helper method to get nested object values
      getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
          return current && current[key] !== undefined ? current[key] : '';
        }, obj);
      }
    });
  }

  /**
   * Stream properties with related data
   */
  async streamProperties(agencyId, options = {}) {
    const { includeUnits = false, includeLeases = false, status } = options;
    
    const where = { agencyId };
    if (status) where.status = status;

    const include = {};
    if (includeUnits) {
      include.units = {
        select: {
          id: true,
          unitNumber: true,
          status: true,
          rentAmount: true,
          type: true
        }
      };
    }
    if (includeLeases) {
      include.leases = {
        where: { endDate: null },
        select: {
          id: true,
          startDate: true,
          rentAmount: true,
          tenant: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      };
    }

    return this.createDatabaseStream('property', { where }, { include, batchSize: 50 });
  }

  /**
   * Stream payments with related data
   */
  async streamPayments(agencyId, options = {}) {
    const { startDate, endDate, leaseId } = options;
    
    const where = { agencyId };
    if (leaseId) where.leaseId = leaseId;
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    const include = {
      lease: {
        select: {
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
          },
          tenant: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      },
      invoice: {
        select: {
          amount: true,
          dueAt: true
        }
      }
    };

    return this.createDatabaseStream('payment', { where, orderBy: { paidAt: 'desc' } }, { include, batchSize: 100 });
  }

  /**
   * Stream tenants with lease information
   */
  async streamTenants(agencyId, options = {}) {
    const { includeLeases = false, search } = options;
    
    const where = { agencyId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const include = {};
    if (includeLeases) {
      include.leases = {
        where: { endDate: null },
        select: {
          id: true,
          startDate: true,
          rentAmount: true,
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
      };
    }

    return this.createDatabaseStream('tenant', { where }, { include, batchSize: 100 });
  }

  /**
   * Stream invoices with payment information
   */
  async streamInvoices(agencyId, options = {}) {
    const { status, overdue = false, startDate, endDate } = options;
    
    const where = { agencyId };
    if (status) where.status = status;
    if (overdue) {
      where.status = { in: ['PENDING', 'PARTIAL', 'OVERDUE'] };
      where.dueAt = { lt: new Date() };
    }
    if (startDate || endDate) {
      where.dueAt = {};
      if (startDate) where.dueAt.gte = new Date(startDate);
      if (endDate) where.dueAt.lte = new Date(endDate);
    }

    const include = {
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
      payments: {
        select: {
          amount: true,
          paidAt: true,
          method: true
        }
      }
    };

    return this.createDatabaseStream('invoice', { where, orderBy: { dueAt: 'desc' } }, { include, batchSize: 100 });
  }

  /**
   * Create a memory-efficient aggregation stream
   */
  createAggregationStream(aggregateFn, initialValue = {}) {
    let accumulator = { ...initialValue };

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          accumulator = aggregateFn(accumulator, chunk);
          // Don't pass through individual chunks, just accumulate
          callback();
        } catch (error) {
          callback(error);
        }
      },
      flush(callback) {
        // Send final aggregated result
        this.push(accumulator);
        callback();
      }
    });
  }

  /**
   * Create a batching stream that groups items
   */
  createBatchingStream(batchSize = 100) {
    let batch = [];

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        batch.push(chunk);
        
        if (batch.length >= batchSize) {
          this.push([...batch]);
          batch = [];
        }
        
        callback();
      },
      flush(callback) {
        if (batch.length > 0) {
          this.push(batch);
        }
        callback();
      }
    });
  }

  /**
   * Create a filtering stream
   */
  createFilterStream(filterFn) {
    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          if (filterFn(chunk)) {
            callback(null, chunk);
          } else {
            callback(); // Skip this chunk
          }
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Create a rate-limited stream to prevent overwhelming downstream systems
   */
  createRateLimitedStream(itemsPerSecond = 100) {
    const interval = 1000 / itemsPerSecond;
    let lastEmit = 0;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        const now = Date.now();
        const timeSinceLastEmit = now - lastEmit;
        
        if (timeSinceLastEmit >= interval) {
          lastEmit = now;
          callback(null, chunk);
        } else {
          const delay = interval - timeSinceLastEmit;
          setTimeout(() => {
            lastEmit = Date.now();
            callback(null, chunk);
          }, delay);
        }
      }
    });
  }

  /**
   * Monitor stream performance
   */
  createMonitoringStream(streamName) {
    let itemCount = 0;
    let startTime = Date.now();
    let lastLogTime = startTime;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        itemCount++;
        
        const now = Date.now();
        if (now - lastLogTime > 10000) { // Log every 10 seconds
          const duration = now - startTime;
          const rate = itemCount / (duration / 1000);
          
          logger.info('Stream processing stats', {
            streamName,
            itemsProcessed: itemCount,
            duration: `${Math.round(duration / 1000)}s`,
            rate: `${Math.round(rate)} items/sec`
          });
          
          lastLogTime = now;
        }
        
        callback(null, chunk);
      },
      flush(callback) {
        const duration = Date.now() - startTime;
        const rate = itemCount / (duration / 1000);
        
        logger.info('Stream processing completed', {
          streamName,
          totalItems: itemCount,
          totalDuration: `${Math.round(duration / 1000)}s`,
          averageRate: `${Math.round(rate)} items/sec`
        });
        
        callback();
      }
    });
  }
}

// Create singleton instance
const streamingService = new StreamingService();

export default streamingService;