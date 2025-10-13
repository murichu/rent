import { prisma } from '../db.js';
import logger from '../utils/logger.js';
import cron from 'node-cron';

/**
 * System Usage Fees Service
 * Automatically charge monthly/yearly fees to properties as expenses
 */

/**
 * Get system fee configuration for property
 */
export async function getSystemFeeConfig(propertyId) {
  const config = await prisma.systemFeeConfig.findUnique({
    where: { propertyId },
  });

  // Default config if not set
  return config || {
    enabled: false,
    feeType: 'MONTHLY', // or 'YEARLY'
    monthlyFee: 500,
    yearlyFee: 5000,
  };
}

/**
 * Update system fee configuration
 */
export async function updateSystemFeeConfig(propertyId, config) {
  const updated = await prisma.systemFeeConfig.upsert({
    where: { propertyId },
    update: {
      enabled: config.enabled,
      feeType: config.feeType,
      monthlyFee: config.monthlyFee,
      yearlyFee: config.yearlyFee,
    },
    create: {
      propertyId,
      enabled: config.enabled,
      feeType: config.feeType || 'MONTHLY',
      monthlyFee: config.monthlyFee || 500,
      yearlyFee: config.yearlyFee || 5000,
    },
  });

  logger.info('System fee config updated:', {
    propertyId,
    enabled: updated.enabled,
  });

  return updated;
}

/**
 * Generate monthly system fee expenses
 * Run on 1st of each month
 */
export async function generateMonthlySystemFees() {
  try {
    logger.info('Generating monthly system fees...');

    // Get all properties with monthly fees enabled
    const configs = await prisma.systemFeeConfig.findMany({
      where: {
        enabled: true,
        feeType: 'MONTHLY',
      },
      include: {
        property: {
          include: {
            agency: true,
          },
        },
      },
    });

    let generated = 0;

    for (const config of configs) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Check if already generated this month
      const existing = await prisma.expense.findFirst({
        where: {
          propertyId: config.propertyId,
          category: 'SYSTEM_FEE',
          description: `Monthly Haven system fee - ${month}/${year}`,
        },
      });

      if (!existing) {
        // Create system fee expense
        await prisma.expense.create({
          data: {
            propertyId: config.propertyId,
            agencyId: config.property.agencyId,
            category: 'SYSTEM_FEE',
            amount: config.monthlyFee,
            description: `Monthly Haven system fee - ${month}/${year}`,
            expenseDate: now,
            payee: 'Haven Property Management',
            paymentMethod: 'AUTO',
            status: 'APPROVED', // Auto-approved
            approvalRequired: false,
          },
        });

        generated++;
        logger.info('Monthly system fee generated:', {
          propertyId: config.propertyId,
          amount: config.monthlyFee,
        });
      }
    }

    logger.info(`Generated ${generated} monthly system fees`);
    return { generated };
  } catch (error) {
    logger.error('Failed to generate monthly system fees:', error);
    throw error;
  }
}

/**
 * Generate yearly system fee expenses
 * Run on January 1st
 */
export async function generateYearlySystemFees() {
  try {
    logger.info('Generating yearly system fees...');

    // Get all properties with yearly fees enabled
    const configs = await prisma.systemFeeConfig.findMany({
      where: {
        enabled: true,
        feeType: 'YEARLY',
      },
      include: {
        property: {
          include: {
            agency: true,
          },
        },
      },
    });

    let generated = 0;

    for (const config of configs) {
      const now = new Date();
      const year = now.getFullYear();

      // Check if already generated this year
      const existing = await prisma.expense.findFirst({
        where: {
          propertyId: config.propertyId,
          category: 'SYSTEM_FEE',
          description: `Annual Haven system fee - ${year}`,
        },
      });

      if (!existing) {
        // Create system fee expense
        await prisma.expense.create({
          data: {
            propertyId: config.propertyId,
            agencyId: config.property.agencyId,
            category: 'SYSTEM_FEE',
            amount: config.yearlyFee,
            description: `Annual Haven system fee - ${year}`,
            expenseDate: now,
            payee: 'Haven Property Management',
            paymentMethod: 'AUTO',
            status: 'APPROVED', // Auto-approved
            approvalRequired: false,
          },
        });

        generated++;
        logger.info('Yearly system fee generated:', {
          propertyId: config.propertyId,
          amount: config.yearlyFee,
        });
      }
    }

    logger.info(`Generated ${generated} yearly system fees`);
    return { generated };
  } catch (error) {
    logger.error('Failed to generate yearly system fees:', error);
    throw error;
  }
}

/**
 * Schedule system fee generation
 */
export function scheduleSystemFees() {
  // Monthly fees - 1st of every month at 2 AM
  cron.schedule('0 2 1 * *', async () => {
    logger.info('Running monthly system fee generation...');
    await generateMonthlySystemFees();
  });

  // Yearly fees - January 1st at 3 AM
  cron.schedule('0 3 1 1 *', async () => {
    logger.info('Running yearly system fee generation...');
    await generateYearlySystemFees();
  });

  logger.info('✅ System fee generation jobs scheduled');
}

/**
 * Get system fee summary for property
 */
export async function getSystemFeeSummary(propertyId, startDate, endDate) {
  const fees = await prisma.expense.findMany({
    where: {
      propertyId,
      category: 'SYSTEM_FEE',
      expenseDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  const total = fees.reduce((sum, f) => sum + f.amount, 0);

  return {
    total,
    count: fees.length,
    fees,
  };
}
