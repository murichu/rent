import { prisma } from '../db.js';
import logger, { businessLog } from '../utils/logger.js';
import { emailService } from './email.js';
import { smsService } from './sms.js';
import { whatsappService } from './whatsapp.js';

/**
 * Automated Rent Reminders Service
 * Handles email, SMS, and WhatsApp notifications for rent collection
 */
class RentRemindersService {
  constructor() {
    this.reminderTypes = {
      UPCOMING: 'upcoming',
      DUE: 'due',
      OVERDUE: 'overdue',
      FINAL_NOTICE: 'final_notice'
    };
    
    this.channels = {
      EMAIL: 'email',
      SMS: 'sms',
      WHATSAPP: 'whatsapp'
    };
    
    this.templates = {
      [this.reminderTypes.UPCOMING]: {
        email: {
          subject: 'Rent Payment Reminder - Due in {days} days',
          template: 'rent-upcoming'
        },
        sms: 'Hi {tenantName}, your rent of KES {amount} is due on {dueDate}. Please pay on time to avoid penalties.',
        whatsapp: 'rent-upcoming-whatsapp'
      },
      [this.reminderTypes.DUE]: {
        email: {
          subject: 'Rent Payment Due Today',
          template: 'rent-due'
        },
        sms: 'Hi {tenantName}, your rent of KES {amount} is due today. Please pay to avoid late fees.',
        whatsapp: 'rent-due-whatsapp'
      },
      [this.reminderTypes.OVERDUE]: {
        email: {
          subject: 'Overdue Rent Payment - Action Required',
          template: 'rent-overdue'
        },
        sms: 'URGENT: {tenantName}, your rent of KES {amount} is {days} days overdue. Please pay immediately to avoid penalties.',
        whatsapp: 'rent-overdue-whatsapp'
      },
      [this.reminderTypes.FINAL_NOTICE]: {
        email: {
          subject: 'Final Notice - Rent Payment Required',
          template: 'rent-final-notice'
        },
        sms: 'FINAL NOTICE: {tenantName}, pay your overdue rent of KES {amount} within 24 hours or face eviction proceedings.',
        whatsapp: 'rent-final-notice-whatsapp'
      }
    };
    
    this.stats = {
      sent: 0,
      failed: 0,
      lastRun: null,
      byType: {},
      byChannel: {}
    };
  }

  /**
   * Process all rent reminders
   */
  async processRentReminders() {
    const startTime = Date.now();
    logger.info('Starting rent reminders processing');
    
    try {
      const results = await Promise.all([
        this.processUpcomingReminders(),
        this.processDueReminders(),
        this.processOverdueReminders(),
        this.processFinalNotices()
      ]);
      
      const totalSent = results.reduce((sum, result) => sum + result.sent, 0);
      const totalFailed = results.reduce((sum, result) => sum + result.failed, 0);
      
      this.stats.sent += totalSent;
      this.stats.failed += totalFailed;
      this.stats.lastRun = new Date().toISOString();
      
      const duration = Date.now() - startTime;
      
      businessLog('rent_reminders_processed', {
        totalSent,
        totalFailed,
        duration: `${duration}ms`,
        breakdown: results
      });
      
      logger.info('Rent reminders processing completed', {
        totalSent,
        totalFailed,
        duration: `${duration}ms`
      });
      
      return {
        success: true,
        totalSent,
        totalFailed,
        duration,
        breakdown: results
      };
    } catch (error) {
      logger.error('Rent reminders processing failed', {
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process upcoming rent reminders (3-7 days before due)
   */
  async processUpcomingReminders() {
    const today = new Date();
    const reminderStart = new Date(today);
    reminderStart.setDate(today.getDate() + 3);
    const reminderEnd = new Date(today);
    reminderEnd.setDate(today.getDate() + 7);
    
    const leases = await this.getLeasesDueInRange(reminderStart, reminderEnd);
    
    return this.sendReminders(leases, this.reminderTypes.UPCOMING);
  }

  /**
   * Process due date reminders (due today)
   */
  async processDueReminders() {
    const today = new Date();
    const leases = await this.getLeasesDueOnDate(today);
    
    return this.sendReminders(leases, this.reminderTypes.DUE);
  }

  /**
   * Process overdue reminders (1-14 days overdue)
   */
  async processOverdueReminders() {
    const today = new Date();
    const overdueStart = new Date(today);
    overdueStart.setDate(today.getDate() - 14);
    const overdueEnd = new Date(today);
    overdueEnd.setDate(today.getDate() - 1);
    
    const leases = await this.getOverdueLeases(overdueStart, overdueEnd);
    
    return this.sendReminders(leases, this.reminderTypes.OVERDUE);
  }

  /**
   * Process final notices (15+ days overdue)
   */
  async processFinalNotices() {
    const today = new Date();
    const finalNoticeDate = new Date(today);
    finalNoticeDate.setDate(today.getDate() - 15);
    
    const leases = await this.getOverdueLeases(null, finalNoticeDate);
    
    return this.sendReminders(leases, this.reminderTypes.FINAL_NOTICE);
  }

  /**
   * Get leases due in date range
   */
  async getLeasesDueInRange(startDate, endDate) {
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    return prisma.lease.findMany({
      where: {
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ],
        paymentDayOfMonth: {
          gte: startDay,
          lte: endDay
        }
      },
      include: {
        tenant: true,
        property: {
          select: { title: true, address: true }
        },
        unit: {
          select: { unitNumber: true }
        },
        agency: {
          select: { 
            id: true, 
            name: true,
            invoiceDayOfMonth: true,
            dueDayOfMonth: true
          }
        },
        payments: {
          where: {
            paidAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            }
          },
          select: { amount: true, paidAt: true }
        }
      }
    });
  }

  /**
   * Get leases due on specific date
   */
  async getLeasesDueOnDate(date) {
    const day = date.getDate();
    
    return prisma.lease.findMany({
      where: {
        OR: [
          { endDate: null },
          { endDate: { gt: new Date() } }
        ],
        paymentDayOfMonth: day
      },
      include: {
        tenant: true,
        property: {
          select: { title: true, address: true }
        },
        unit: {
          select: { unitNumber: true }
        },
        agency: {
          select: { 
            id: true, 
            name: true,
            invoiceDayOfMonth: true,
            dueDayOfMonth: true
          }
        },
        payments: {
          where: {
            paidAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            }
          },
          select: { amount: true, paidAt: true }
        }
      }
    });
  }

  /**
   * Get overdue leases
   */
  async getOverdueLeases(startDate, endDate) {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const whereClause = {
      OR: [
        { endDate: null },
        { endDate: { gt: today } }
      ],
      paymentDayOfMonth: {
        lt: today.getDate()
      }
    };
    
    if (startDate && endDate) {
      whereClause.paymentDayOfMonth = {
        gte: endDate.getDate(),
        lt: startDate.getDate()
      };
    } else if (endDate) {
      whereClause.paymentDayOfMonth = {
        lte: endDate.getDate()
      };
    }
    
    const leases = await prisma.lease.findMany({
      where: whereClause,
      include: {
        tenant: true,
        property: {
          select: { title: true, address: true }
        },
        unit: {
          select: { unitNumber: true }
        },
        agency: {
          select: { 
            id: true, 
            name: true,
            invoiceDayOfMonth: true,
            dueDayOfMonth: true
          }
        },
        payments: {
          where: {
            paidAt: {
              gte: currentMonth,
              lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
            }
          },
          select: { amount: true, paidAt: true }
        }
      }
    });
    
    // Filter out leases that have been paid this month
    return leases.filter(lease => {
      const totalPaid = lease.payments.reduce((sum, payment) => sum + payment.amount, 0);
      return totalPaid < lease.rentAmount;
    });
  }

  /**
   * Send reminders for leases
   */
  async sendReminders(leases, reminderType) {
    let sent = 0;
    let failed = 0;
    
    for (const lease of leases) {
      try {
        // Check if reminder was already sent recently
        const recentReminder = await this.checkRecentReminder(lease.id, reminderType);
        if (recentReminder) {
          continue;
        }
        
        // Prepare reminder data
        const reminderData = this.prepareReminderData(lease, reminderType);
        
        // Send via multiple channels
        const results = await Promise.allSettled([
          this.sendEmailReminder(reminderData),
          this.sendSMSReminder(reminderData),
          this.sendWhatsAppReminder(reminderData)
        ]);
        
        // Log reminder
        await this.logReminder(lease.id, reminderType, results);
        
        sent++;
        
        // Update stats
        this.updateStats(reminderType, results);
        
      } catch (error) {
        logger.error('Failed to send reminder', {
          leaseId: lease.id,
          tenantId: lease.tenant.id,
          reminderType,
          error: error.message
        });
        failed++;
      }
    }
    
    return { sent, failed, reminderType };
  }

  /**
   * Prepare reminder data
   */
  prepareReminderData(lease, reminderType) {
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), lease.paymentDayOfMonth);
    const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    const totalPaid = lease.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const amountDue = lease.rentAmount - totalPaid;
    
    return {
      lease,
      tenant: lease.tenant,
      property: lease.property,
      unit: lease.unit,
      agency: lease.agency,
      reminderType,
      dueDate: dueDate.toLocaleDateString('en-KE'),
      daysDiff: Math.abs(daysDiff),
      amountDue,
      formattedAmount: new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
      }).format(amountDue),
      propertyName: lease.unit 
        ? `${lease.property.title} - Unit ${lease.unit.unitNumber}`
        : lease.property.title
    };
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder(data) {
    if (!data.tenant.email) {
      throw new Error('No email address available');
    }
    
    const template = this.templates[data.reminderType].email;
    
    return emailService.sendTemplateEmail({
      to: data.tenant.email,
      subject: this.interpolateTemplate(template.subject, data),
      template: template.template,
      data: {
        tenantName: data.tenant.name,
        propertyName: data.propertyName,
        amountDue: data.formattedAmount,
        dueDate: data.dueDate,
        daysDiff: data.daysDiff,
        agencyName: data.agency.name,
        reminderType: data.reminderType
      }
    });
  }

  /**
   * Send SMS reminder
   */
  async sendSMSReminder(data) {
    if (!data.tenant.phone) {
      throw new Error('No phone number available');
    }
    
    const message = this.interpolateTemplate(
      this.templates[data.reminderType].sms,
      {
        tenantName: data.tenant.name,
        amount: data.formattedAmount,
        dueDate: data.dueDate,
        days: data.daysDiff
      }
    );
    
    return smsService.sendSMS({
      to: data.tenant.phone,
      message
    });
  }

  /**
   * Send WhatsApp reminder
   */
  async sendWhatsAppReminder(data) {
    if (!data.tenant.phone) {
      throw new Error('No phone number available');
    }
    
    const template = this.templates[data.reminderType].whatsapp;
    
    return whatsappService.sendTemplateMessage({
      to: data.tenant.phone,
      template,
      data: {
        tenantName: data.tenant.name,
        propertyName: data.propertyName,
        amountDue: data.formattedAmount,
        dueDate: data.dueDate,
        daysDiff: data.daysDiff,
        agencyName: data.agency.name
      }
    });
  }

  /**
   * Check if reminder was sent recently
   */
  async checkRecentReminder(leaseId, reminderType) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    return prisma.rentReminder.findFirst({
      where: {
        leaseId,
        reminderType,
        sentAt: {
          gte: oneDayAgo
        }
      }
    });
  }

  /**
   * Log reminder
   */
  async logReminder(leaseId, reminderType, results) {
    const channels = ['email', 'sms', 'whatsapp'];
    const channelResults = {};
    
    results.forEach((result, index) => {
      channelResults[channels[index]] = {
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason.message : null
      };
    });
    
    return prisma.rentReminder.create({
      data: {
        leaseId,
        reminderType,
        channels: channelResults,
        sentAt: new Date()
      }
    });
  }

  /**
   * Update statistics
   */
  updateStats(reminderType, results) {
    if (!this.stats.byType[reminderType]) {
      this.stats.byType[reminderType] = { sent: 0, failed: 0 };
    }
    
    const channels = ['email', 'sms', 'whatsapp'];
    results.forEach((result, index) => {
      const channel = channels[index];
      if (!this.stats.byChannel[channel]) {
        this.stats.byChannel[channel] = { sent: 0, failed: 0 };
      }
      
      if (result.status === 'fulfilled') {
        this.stats.byChannel[channel].sent++;
      } else {
        this.stats.byChannel[channel].failed++;
      }
    });
    
    this.stats.byType[reminderType].sent++;
  }

  /**
   * Interpolate template with data
   */
  interpolateTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Get reminder statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.sent + this.stats.failed > 0 
        ? Math.round((this.stats.sent / (this.stats.sent + this.stats.failed)) * 100)
        : 0
    };
  }

  /**
   * Manual reminder for specific lease
   */
  async sendManualReminder(leaseId, reminderType, channels = ['email', 'sms']) {
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: true,
        property: {
          select: { title: true, address: true }
        },
        unit: {
          select: { unitNumber: true }
        },
        agency: {
          select: { 
            id: true, 
            name: true,
            invoiceDayOfMonth: true,
            dueDayOfMonth: true
          }
        },
        payments: {
          where: {
            paidAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            }
          },
          select: { amount: true, paidAt: true }
        }
      }
    });
    
    if (!lease) {
      throw new Error('Lease not found');
    }
    
    const reminderData = this.prepareReminderData(lease, reminderType);
    const results = [];
    
    if (channels.includes('email')) {
      results.push(await this.sendEmailReminder(reminderData).catch(e => ({ error: e.message })));
    }
    
    if (channels.includes('sms')) {
      results.push(await this.sendSMSReminder(reminderData).catch(e => ({ error: e.message })));
    }
    
    if (channels.includes('whatsapp')) {
      results.push(await this.sendWhatsAppReminder(reminderData).catch(e => ({ error: e.message })));
    }
    
    // Log manual reminder
    await this.logReminder(leaseId, reminderType, results.map(r => 
      r.error ? { status: 'rejected', reason: { message: r.error } } : { status: 'fulfilled' }
    ));
    
    businessLog('manual_rent_reminder_sent', {
      leaseId,
      tenantId: lease.tenant.id,
      reminderType,
      channels,
      results
    });
    
    return {
      success: true,
      results,
      reminderData: {
        tenant: reminderData.tenant.name,
        property: reminderData.propertyName,
        amount: reminderData.formattedAmount
      }
    };
  }
}

// Create singleton instance
const rentRemindersService = new RentRemindersService();

export default rentRemindersService;