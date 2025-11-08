import { prisma } from '../db.js';
import logger from '../utils/logger.js';
import { jobQueue } from './jobQueue.js';

/**
 * Report Service for generating financial and operational reports
 * Uses database-level aggregation for performance
 */
class ReportService {
  constructor() {
    this.cachePrefix = 'report:';
    this.defaultCacheTTL = 3600; // 1 hour
    
    // Register report job processors
    this.registerProcessors();
  }

  /**
   * Register job processors for report generation
   */
  registerProcessors() {
    // Check if job queue is initialized before registering processors
    if (!jobQueue.isInitialized) {
      logger.warn('Job queue not initialized yet, skipping report processor registration');
      return;
    }

    try {
      jobQueue.registerProcessor('reports', 'financial-summary', async (job) => {
        return await this.processFinancialSummaryReport(job);
      });

      jobQueue.registerProcessor('reports', 'property-performance', async (job) => {
        return await this.processPropertyPerformanceReport(job);
      });

      jobQueue.registerProcessor('reports', 'tenant-analysis', async (job) => {
        return await this.processTenantAnalysisReport(job);
      });

      logger.info('Report job processors registered');
    } catch (error) {
      logger.error('Failed to register report job processors:', error);
    }
  }

  /**
   * Generate financial summary report
   */
  async generateFinancialSummary(agencyId, dateRange, userId) {
    const cacheKey = `${this.cachePrefix}financial:${agencyId}:${dateRange.startDate}:${dateRange.endDate}`;
    


    try {
      // Use database aggregation for performance
      const [
        totalIncome,
        totalExpenses,
        paymentStats,
        occupancyStats,
        propertyStats
      ] = await Promise.all([
        this.calculateTotalIncome(agencyId, dateRange),
        this.calculateTotalExpenses(agencyId, dateRange),
        this.getPaymentStatistics(agencyId, dateRange),
        this.getOccupancyStatistics(agencyId, dateRange),
        this.getPropertyStatistics(agencyId, dateRange)
      ]);

      const report = {
        agencyId,
        dateRange,
        generatedAt: new Date().toISOString(),
        summary: {
          totalIncome: totalIncome._sum.amount || 0,
          totalExpenses: totalExpenses || 0,
          netIncome: (totalIncome._sum.amount || 0) - (totalExpenses || 0),
          totalPayments: paymentStats.totalPayments,
          completedPayments: paymentStats.completedPayments,
          pendingPayments: paymentStats.pendingPayments,
          averageRent: propertyStats.averageRent,
          totalProperties: propertyStats.totalProperties,
          occupancyRate: occupancyStats.occupancyRate
        },
        breakdown: {
          incomeByMonth: await this.getIncomeByMonth(agencyId, dateRange),
          paymentsByStatus: await this.getPaymentsByStatus(agencyId, dateRange),
          topPerformingProperties: await this.getTopPerformingProperties(agencyId, dateRange, 10)
        }
      };


      
      logger.info('Financial summary report generated', {
        agencyId,
        dateRange,
        totalIncome: report.summary.totalIncome,
        netIncome: report.summary.netIncome
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate financial summary:', error);
      throw error;
    }
  }

  /**
   * Generate property performance report
   */
  async generatePropertyPerformance(agencyId, dateRange, userId) {
    const cacheKey = `${this.cachePrefix}property:${agencyId}:${dateRange.startDate}:${dateRange.endDate}`;
    


    try {
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
                },
                include: {
                  payments: {
                    where: {
                      paidAt: {
                        gte: new Date(dateRange.startDate),
                        lte: new Date(dateRange.endDate)
                      },
                      status: 'COMPLETED'
                    }
                  }
                }
              }
            }
          }
        }
      });

      const propertyPerformance = properties.map(property => {
        const totalUnits = property.units.length;
        const occupiedUnits = property.units.filter(unit => 
          unit.leases.some(lease => lease.status === 'ACTIVE')
        ).length;
        
        const totalIncome = property.units.reduce((sum, unit) => {
          return sum + unit.leases.reduce((leaseSum, lease) => {
            return leaseSum + lease.payments.reduce((paymentSum, payment) => {
              return paymentSum + payment.amount;
            }, 0);
          }, 0);
        }, 0);

        const averageRent = property.units.reduce((sum, unit) => {
          const activeLeases = unit.leases.filter(lease => lease.status === 'ACTIVE');
          return sum + (activeLeases.length > 0 ? activeLeases[0].monthlyRent : 0);
        }, 0) / Math.max(totalUnits, 1);

        return {
          propertyId: property.id,
          propertyName: property.name,
          address: property.address,
          totalUnits,
          occupiedUnits,
          vacantUnits: totalUnits - occupiedUnits,
          occupancyRate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(2) : 0,
          totalIncome,
          averageRent: Math.round(averageRent),
          incomePerUnit: totalUnits > 0 ? Math.round(totalIncome / totalUnits) : 0
        };
      });

      const report = {
        agencyId,
        dateRange,
        generatedAt: new Date().toISOString(),
        properties: propertyPerformance.sort((a, b) => b.totalIncome - a.totalIncome),
        summary: {
          totalProperties: properties.length,
          totalUnits: propertyPerformance.reduce((sum, p) => sum + p.totalUnits, 0),
          totalOccupiedUnits: propertyPerformance.reduce((sum, p) => sum + p.occupiedUnits, 0),
          averageOccupancyRate: propertyPerformance.length > 0 
            ? (propertyPerformance.reduce((sum, p) => sum + parseFloat(p.occupancyRate), 0) / propertyPerformance.length).toFixed(2)
            : 0,
          totalIncome: propertyPerformance.reduce((sum, p) => sum + p.totalIncome, 0)
        }
      };


      
      logger.info('Property performance report generated', {
        agencyId,
        dateRange,
        propertiesCount: report.properties.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate property performance report:', error);
      throw error;
    }
  }  /**
  
 * Calculate total income using database aggregation
   */
  async calculateTotalIncome(agencyId, dateRange) {
    return await prisma.payment.aggregate({
      where: {
        lease: { agencyId },
        status: 'COMPLETED',
        paidAt: {
          gte: new Date(dateRange.startDate),
          lte: new Date(dateRange.endDate)
        }
      },
      _sum: {
        amount: true
      }
    });
  }

  /**
   * Calculate total expenses
   */
  async calculateTotalExpenses(agencyId, dateRange) {
    try {
      const result = await prisma.expense.aggregate({
        where: {
          agencyId,
          expenseDate: {
            gte: dateRange.startDate,
            lte: dateRange.endDate,
          },
          status: { in: ["APPROVED", "PAID"] }, // Only count approved/paid expenses
        },
        _sum: {
          amount: true,
        },
      });

      return result._sum.amount || 0;
    } catch (error) {
      logger.error("Error calculating expenses:", error);
      return 0;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(agencyId, dateRange) {
    const [total, completed, pending] = await Promise.all([
      prisma.payment.count({
        where: {
          lease: { agencyId },
          createdAt: {
            gte: new Date(dateRange.startDate),
            lte: new Date(dateRange.endDate)
          }
        }
      }),
      prisma.payment.count({
        where: {
          lease: { agencyId },
          status: 'COMPLETED',
          paidAt: {
            gte: new Date(dateRange.startDate),
            lte: new Date(dateRange.endDate)
          }
        }
      }),
      prisma.payment.count({
        where: {
          lease: { agencyId },
          status: 'PENDING',
          createdAt: {
            gte: new Date(dateRange.startDate),
            lte: new Date(dateRange.endDate)
          }
        }
      })
    ]);

    return {
      totalPayments: total,
      completedPayments: completed,
      pendingPayments: pending
    };
  }

  /**
   * Get occupancy statistics
   */
  async getOccupancyStatistics(agencyId, dateRange) {
    const properties = await prisma.property.findMany({
      where: { agencyId },
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: 'ACTIVE',
                startDate: { lte: new Date(dateRange.endDate) },
                endDate: { gte: new Date(dateRange.startDate) }
              }
            }
          }
        }
      }
    });

    const totalUnits = properties.reduce((sum, property) => sum + property.units.length, 0);
    const occupiedUnits = properties.reduce((sum, property) => {
      return sum + property.units.filter(unit => unit.leases.length > 0).length;
    }, 0);

    return {
      totalUnits,
      occupiedUnits,
      vacantUnits: totalUnits - occupiedUnits,
      occupancyRate: totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(2) : 0
    };
  }

  /**
   * Get property statistics
   */
  async getPropertyStatistics(agencyId, dateRange) {
    const [totalProperties, avgRent] = await Promise.all([
      prisma.property.count({
        where: { agencyId }
      }),
      prisma.lease.aggregate({
        where: {
          agencyId,
          status: 'ACTIVE'
        },
        _avg: {
          monthlyRent: true
        }
      })
    ]);

    return {
      totalProperties,
      averageRent: Math.round(avgRent._avg.monthlyRent || 0)
    };
  }

  /**
   * Get income breakdown by month
   */
  async getIncomeByMonth(agencyId, dateRange) {
    const payments = await prisma.payment.findMany({
      where: {
        lease: { agencyId },
        status: 'COMPLETED',
        paidAt: {
          gte: new Date(dateRange.startDate),
          lte: new Date(dateRange.endDate)
        }
      },
      select: {
        amount: true,
        paidAt: true
      }
    });

    // Group by month
    const monthlyIncome = {};
    payments.forEach(payment => {
      const monthKey = payment.paidAt.toISOString().substring(0, 7); // YYYY-MM
      monthlyIncome[monthKey] = (monthlyIncome[monthKey] || 0) + payment.amount;
    });

    return Object.entries(monthlyIncome).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get payments breakdown by status
   */
  async getPaymentsByStatus(agencyId, dateRange) {
    const statusCounts = await prisma.payment.groupBy({
      by: ['status'],
      where: {
        lease: { agencyId },
        createdAt: {
          gte: new Date(dateRange.startDate),
          lte: new Date(dateRange.endDate)
        }
      },
      _count: {
        status: true
      },
      _sum: {
        amount: true
      }
    });

    return statusCounts.map(item => ({
      status: item.status,
      count: item._count.status,
      totalAmount: item._sum.amount || 0
    }));
  }

  /**
   * Get top performing properties
   */
  async getTopPerformingProperties(agencyId, dateRange, limit = 10) {
    const properties = await prisma.property.findMany({
      where: { agencyId },
      include: {
        units: {
          include: {
            leases: {
              include: {
                payments: {
                  where: {
                    status: 'COMPLETED',
                    paidAt: {
                      gte: new Date(dateRange.startDate),
                      lte: new Date(dateRange.endDate)
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const propertyIncome = properties.map(property => {
      const totalIncome = property.units.reduce((sum, unit) => {
        return sum + unit.leases.reduce((leaseSum, lease) => {
          return leaseSum + lease.payments.reduce((paymentSum, payment) => {
            return paymentSum + payment.amount;
          }, 0);
        }, 0);
      }, 0);

      return {
        propertyId: property.id,
        propertyName: property.name,
        totalIncome,
        unitsCount: property.units.length
      };
    });

    return propertyIncome
      .sort((a, b) => b.totalIncome - a.totalIncome)
      .slice(0, limit);
  }

  /**
   * Queue financial summary report job
   */
  async queueFinancialSummaryReport(agencyId, dateRange, userId, format = 'pdf') {
    const jobData = {
      type: 'financial-summary',
      agencyId,
      dateRange,
      userId,
      format,
      requestedAt: new Date().toISOString()
    };

    const job = await jobQueue.addJob('reports', 'financial-summary', jobData, {
      priority: 3,
      attempts: 2
    });

    logger.info('Financial summary report job queued', {
      jobId: job.id,
      agencyId,
      userId,
      dateRange
    });

    return job;
  }

  /**
   * Process financial summary report job
   */
  async processFinancialSummaryReport(job) {
    const { agencyId, dateRange, userId, format } = job.data;
    
    try {
      await job.progress(20);
      await job.progress(100);
      
      return {
        filename,
        reportData: report,
        downloadUrl: `/api/exports/download/${filename}`
      };
      
    } catch (error) {
      logger.error('Financial summary report job failed:', error);
      throw error;
    }
  }

  /**
   * Get cached report or generate new one
   */
  async getCachedReport(reportType, agencyId, params) {
    const cacheKey = `${this.cachePrefix}${reportType}:${agencyId}:${JSON.stringify(params)}`;
    

    
    return null;
  }

  /**
   * Cache report data
   */
  async cacheReport(reportType, agencyId, params, data, ttl = null) {
    // Cache functionality removed
    logger.info(`${reportType} report generated (caching disabled)`, { agencyId, params });
  }

  /**
   * Invalidate report cache
   */
  async invalidateReportCache(agencyId, reportType = null) {
    const pattern = reportType 
      ? `${this.cachePrefix}${reportType}:${agencyId}:*`
      : `${this.cachePrefix}*:${agencyId}:*`;
      
    // Cache invalidation functionality removed
    logger.info('Report cache invalidation skipped (caching disabled)', { agencyId, reportType });
  }

  /**
   * Schedule report generation
   */
  async scheduleReport(reportType, agencyId, params, schedule, userId) {
    try {
      const cron = (await import('node-cron')).default;
      
      // Validate cron schedule
      if (!cron.validate(schedule)) {
        throw new Error('Invalid cron schedule format');
      }

      // Create scheduled task
      const task = cron.schedule(schedule, async () => {
        try {
          logger.info('Executing scheduled report', {
            reportType,
            agencyId,
            schedule
          });

          let report;
          const dateRange = {
            startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            endDate: new Date()
          };

          switch (reportType) {
            case 'financial-summary':
              report = await this.generateFinancialSummary(agencyId, dateRange, userId);
              break;
            case 'revenue':
              report = await this.generateRevenueReport(agencyId, dateRange);
              break;
            case 'occupancy':
              report = await this.generateOccupancyReport(agencyId, dateRange);
              break;
            default:
              throw new Error(`Unknown report type: ${reportType}`);
          }

          // Generate PDF
          const pdfGenerator = (await import('./pdfGenerator.js')).default;
          const pdfResult = await pdfGenerator.generateFinancialReportPDF(report);

          // TODO: Send email with report attachment
          logger.info('Scheduled report generated successfully', {
            reportType,
            agencyId,
            filename: pdfResult.filename
          });

        } catch (error) {
          logger.error('Scheduled report generation failed', {
            error: error.message,
            reportType,
            agencyId
          });
        }
      });

      logger.info('Report scheduled successfully', {
        reportType,
        agencyId,
        schedule,
        userId
      });

      return {
        success: true,
        message: 'Report scheduled successfully',
        schedule,
        reportType
      };

    } catch (error) {
      logger.error('Failed to schedule report', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
export const reportService = new ReportService();
export default reportService;