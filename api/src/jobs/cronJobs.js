import cron from 'node-cron';
import { prisma } from '../db.js';
import logger from '../utils/logger.js';
import { sendPaymentReminder, sendLeaseExpirationAlert } from '../services/email.js';

/**
 * Generate recurring invoices
 * Runs daily at 12:00 AM
 */
export function scheduleInvoiceGeneration() {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running invoice generation job...');
    
    try {
      const agencies = await prisma.agency.findMany();

      for (const agency of agencies) {
        const now = new Date();
        const dayOfMonth = now.getDate();

        // Check if today is the agency's invoice day
        if (dayOfMonth === agency.invoiceDayOfMonth) {
          const leases = await prisma.lease.findMany({
            where: {
              agencyId: agency.id,
              endDate: { gte: now }, // Active leases
            },
          });

          for (const lease of leases) {
            // Check if invoice already exists for this month
            const existingInvoice = await prisma.invoice.findFirst({
              where: {
                leaseId: lease.id,
                periodYear: now.getFullYear(),
                periodMonth: now.getMonth() + 1,
              },
            });

            if (!existingInvoice) {
              const dueDate = new Date(now);
              dueDate.setDate(agency.dueDayOfMonth);
              if (dueDate < now) {
                dueDate.setMonth(dueDate.getMonth() + 1);
              }

              const invoice = await prisma.invoice.create({
                data: {
                  leaseId: lease.id,
                  agencyId: agency.id,
                  amount: lease.rentAmount,
                  periodYear: now.getFullYear(),
                  periodMonth: now.getMonth() + 1,
                  issuedAt: now,
                  dueAt: dueDate,
                  status: 'PENDING',
                  totalPaid: 0,
                },
              });

              logger.info(`Generated invoice ${invoice.id} for lease ${lease.id}`);
            }
          }
        }
      }

      logger.info('Invoice generation job completed successfully');
    } catch (error) {
      logger.error(`Invoice generation job failed: ${error.message}`);
    }
  });

  logger.info('✅ Invoice generation job scheduled (daily at 12:00 AM)');
}

/**
 * Send payment reminders
 * Runs daily at 9:00 AM
 */
export function schedulePaymentReminders() {
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running payment reminder job...');

    try {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Find invoices due in 3 days or overdue
      const invoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          dueAt: { lte: threeDaysFromNow },
        },
        include: {
          lease: {
            include: {
              tenant: true,
            },
          },
        },
      });

      for (const invoice of invoices) {
        if (invoice.lease.tenant.email) {
          try {
            await sendPaymentReminder(
              invoice.lease.tenant.email,
              invoice.lease.tenant,
              invoice
            );
            logger.info(`Payment reminder sent for invoice ${invoice.id}`);
          } catch (error) {
            logger.error(`Failed to send payment reminder for invoice ${invoice.id}: ${error.message}`);
          }
        }
      }

      logger.info('Payment reminder job completed successfully');
    } catch (error) {
      logger.error(`Payment reminder job failed: ${error.message}`);
    }
  });

  logger.info('✅ Payment reminder job scheduled (daily at 9:00 AM)');
}

/**
 * Check and alert for lease expirations
 * Runs daily at 10:00 AM
 */
export function scheduleLeaseExpirationAlerts() {
  cron.schedule('0 10 * * *', async () => {
    logger.info('Running lease expiration alert job...');

    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Find leases expiring in next 30 days
      const leases = await prisma.lease.findMany({
        where: {
          endDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
        include: {
          tenant: true,
        },
      });

      for (const lease of leases) {
        if (lease.tenant.email) {
          try {
            await sendLeaseExpirationAlert(
              lease.tenant.email,
              lease.tenant,
              lease
            );
            logger.info(`Lease expiration alert sent for lease ${lease.id}`);
          } catch (error) {
            logger.error(`Failed to send lease expiration alert for lease ${lease.id}: ${error.message}`);
          }
        }
      }

      logger.info('Lease expiration alert job completed successfully');
    } catch (error) {
      logger.error(`Lease expiration alert job failed: ${error.message}`);
    }
  });

  logger.info('✅ Lease expiration alert job scheduled (daily at 10:00 AM)');
}

/**
 * Calculate automated late fees
 * Runs daily at 1:00 AM
 */
export function scheduleLateFeeCalculation() {
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running late fee calculation job...');

    try {
      const now = new Date();

      // Find overdue invoices
      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          dueAt: { lt: now },
        },
        include: {
          lease: {
            include: {
              agency: true,
            },
          },
          penalties: true,
        },
      });

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (now - new Date(invoice.dueAt)) / (1000 * 60 * 60 * 24)
        );

        // Check if penalty already exists for today
        const existingPenalty = invoice.penalties.find(
          p => p.days === daysOverdue && p.type === 'LATE_PAYMENT'
        );

        if (!existingPenalty && daysOverdue > 0) {
          // Calculate late fee (e.g., 5% of rent amount per day, max 20%)
          const lateFeePercentage = Math.min(daysOverdue * 0.05, 0.20);
          const lateFeeAmount = Math.floor(invoice.amount * lateFeePercentage);

          await prisma.penalty.create({
            data: {
              agencyId: invoice.agencyId,
              leaseId: invoice.leaseId,
              invoiceId: invoice.id,
              type: 'LATE_PAYMENT',
              amount: lateFeeAmount,
              days: daysOverdue,
            },
          });

          // Update invoice status to OVERDUE
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' },
          });

          logger.info(`Late fee of $${lateFeeAmount} applied to invoice ${invoice.id} (${daysOverdue} days overdue)`);
        }
      }

      logger.info('Late fee calculation job completed successfully');
    } catch (error) {
      logger.error(`Late fee calculation job failed: ${error.message}`);
    }
  });

  logger.info('✅ Late fee calculation job scheduled (daily at 1:00 AM)');
}

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  logger.info('🕐 Initializing cron jobs...');
  
  scheduleInvoiceGeneration();
  schedulePaymentReminders();
  scheduleLeaseExpirationAlerts();
  scheduleLateFeeCalculation();
  
  logger.info('✅ All cron jobs initialized successfully');
}
