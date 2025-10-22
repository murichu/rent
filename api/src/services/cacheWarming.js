import cacheService from './cache.js';
import dashboardCacheService from './dashboardCache.js';
import { getDashboardDataOptimized } from './queryOptimizer.js';
import { prisma } from '../db.js';
import logger from '../utils/logger.js';

class CacheWarmingService {
  constructor() {
    this.isWarming = false;
    this.warmingProgress = {};
  }

  async warmAllCaches() {
    if (this.isWarming) {
      logger.info('Cache warming already in progress');
      return false;
    }

    try {
      this.isWarming = true;
      logger.info('Starting cache warming process');

      // Get all agencies
      const agencies = await prisma.agency.findMany({
        select: { id: true, name: true }
      });

      logger.info(`Found ${agencies.length} agencies to warm cache for`);

      // Warm cache for each agency
      const warmingPromises = agencies.map(agency => 
        this.warmAgencyCache(agency.id).catch(error => {
          logger.error(`Failed to warm cache for agency ${agency.id}:`, error);
          return false;
        })
      );

      const results = await Promise.all(warmingPromises);
      const successCount = results.filter(Boolean).length;

      logger.info(`Cache warming completed: ${successCount}/${agencies.length} agencies successful`);
      
      return true;
    } catch (error) {
      logger.error('Cache warming process failed:', error);
      return false;
    } finally {
      this.isWarming = false;
      this.warmingProgress = {};
    }
  }

  async warmAgencyCache(agencyId) {
    try {
      this.warmingProgress[agencyId] = { status: 'starting', progress: 0 };
      
      // 1. Warm dashboard data
      this.warmingProgress[agencyId] = { status: 'dashboard', progress: 20 };
      const dashboardData = await getDashboardDataOptimized(agencyId);
      await dashboardCacheService.setDashboardStats(agencyId, dashboardData);

      // 2. Warm property lists (first few pages)
      this.warmingProgress[agencyId] = { status: 'properties', progress: 40 };
      await this.warmPropertyLists(agencyId);

      // 3. Warm tenant lists
      this.warmingProgress[agencyId] = { status: 'tenants', progress: 60 };
      await this.warmTenantLists(agencyId);

      // 4. Warm recent payments
      this.warmingProgress[agencyId] = { status: 'payments', progress: 80 };
      await this.warmRecentPayments(agencyId);

      // 5. Warm financial summaries
      this.warmingProgress[agencyId] = { status: 'financial', progress: 90 };
      await this.warmFinancialData(agencyId);

      this.warmingProgress[agencyId] = { status: 'completed', progress: 100 };
      logger.info(`Cache warming completed for agency ${agencyId}`);
      
      return true;
    } catch (error) {
      this.warmingProgress[agencyId] = { status: 'failed', progress: 0, error: error.message };
      logger.error(`Failed to warm cache for agency ${agencyId}:`, error);
      return false;
    }
  }

  async warmPropertyLists(agencyId) {
    try {
      // Warm first 3 pages of properties
      const pages = [1, 2, 3];
      const limit = 50;

      for (const page of pages) {
        const properties = await prisma.property.findMany({
          where: { agencyId },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            units: {
              select: {
                id: true,
                unitNumber: true,
                status: true,
                rentAmount: true
              }
            },
            _count: {
              select: {
                units: true,
                leases: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        const total = await prisma.property.count({
          where: { agencyId }
        });

        const result = {
          properties,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        };

        await dashboardCacheService.setPropertyList(agencyId, result, page, limit);
      }

      logger.info(`Property lists warmed for agency ${agencyId}`);
    } catch (error) {
      logger.error(`Failed to warm property lists for agency ${agencyId}:`, error);
    }
  }

  async warmTenantLists(agencyId) {
    try {
      const tenants = await prisma.tenant.findMany({
        where: { agencyId },
        include: {
          leases: {
            select: {
              id: true,
              status: true,
              property: {
                select: {
                  title: true,
                  address: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      await dashboardCacheService.setTenantList(agencyId, tenants);
      logger.info(`Tenant lists warmed for agency ${agencyId}`);
    } catch (error) {
      logger.error(`Failed to warm tenant lists for agency ${agencyId}:`, error);
    }
  }

  async warmRecentPayments(agencyId) {
    try {
      const recentPayments = await prisma.payment.findMany({
        where: { 
          lease: { 
            property: { agencyId } 
          } 
        },
        include: {
          lease: {
            select: {
              tenant: {
                select: {
                  name: true,
                  email: true
                }
              },
              property: {
                select: {
                  title: true,
                  address: true
                }
              }
            }
          }
        },
        orderBy: { paidAt: 'desc' },
        take: 20
      });

      await dashboardCacheService.setRecentPayments(agencyId, recentPayments);
      logger.info(`Recent payments warmed for agency ${agencyId}`);
    } catch (error) {
      logger.error(`Failed to warm recent payments for agency ${agencyId}:`, error);
    }
  }

  async warmFinancialData(agencyId) {
    try {
      // Warm monthly financial summary
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyRevenue = await prisma.payment.aggregate({
        where: {
          lease: { property: { agencyId } },
          paidAt: { gte: startOfMonth },
          status: 'PAID'
        },
        _sum: { amount: true }
      });

      const pendingPayments = await prisma.payment.aggregate({
        where: {
          lease: { property: { agencyId } },
          status: { in: ['PENDING', 'PARTIAL'] }
        },
        _sum: { amount: true }
      });

      const financialSummary = {
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        pendingPayments: pendingPayments._sum.amount || 0,
        period: 'month',
        generatedAt: new Date()
      };

      await dashboardCacheService.setFinancialSummary(agencyId, financialSummary, 'month');
      logger.info(`Financial data warmed for agency ${agencyId}`);
    } catch (error) {
      logger.error(`Failed to warm financial data for agency ${agencyId}:`, error);
    }
  }

  async warmSpecificCache(agencyId, cacheType) {
    try {
      switch (cacheType) {
        case 'dashboard':
          const dashboardData = await getDashboardDataOptimized(agencyId);
          await dashboardCacheService.setDashboardStats(agencyId, dashboardData);
          break;
        case 'properties':
          await this.warmPropertyLists(agencyId);
          break;
        case 'tenants':
          await this.warmTenantLists(agencyId);
          break;
        case 'payments':
          await this.warmRecentPayments(agencyId);
          break;
        case 'financial':
          await this.warmFinancialData(agencyId);
          break;
        default:
          throw new Error(`Unknown cache type: ${cacheType}`);
      }

      logger.info(`${cacheType} cache warmed for agency ${agencyId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to warm ${cacheType} cache for agency ${agencyId}:`, error);
      return false;
    }
  }

  getWarmingProgress() {
    return {
      isWarming: this.isWarming,
      progress: this.warmingProgress
    };
  }

  async scheduleWarmup() {
    // Schedule cache warming during low-traffic hours (e.g., 2 AM)
    const now = new Date();
    const warmupTime = new Date();
    warmupTime.setHours(2, 0, 0, 0);
    
    // If it's already past 2 AM today, schedule for tomorrow
    if (now > warmupTime) {
      warmupTime.setDate(warmupTime.getDate() + 1);
    }

    const timeUntilWarmup = warmupTime.getTime() - now.getTime();
    
    setTimeout(() => {
      this.warmAllCaches().then(() => {
        // Schedule next warmup in 24 hours
        this.scheduleWarmup();
      });
    }, timeUntilWarmup);

    logger.info(`Next cache warmup scheduled for ${warmupTime.toISOString()}`);
  }
}

// Create singleton instance
const cacheWarmingService = new CacheWarmingService();

export default cacheWarmingService;