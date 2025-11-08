import AfricasTalking from 'africastalking';
import logger, { businessLog } from '../utils/logger.js';

/**
 * SMS Service using Africa's Talking
 * Handles SMS notifications for rent reminders and other communications
 */
class SMSService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.stats = {
      sent: 0,
      failed: 0,
      lastSent: null,
    };
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.AFRICASTALKING_API_KEY || !process.env.AFRICASTALKING_USERNAME) {
        logger.warn('SMS service not configured - missing Africa\'s Talking credentials');
        return;
      }

      this.client = AfricasTalking({
        apiKey: process.env.AFRICASTALKING_API_KEY,
        username: process.env.AFRICASTALKING_USERNAME,
      });

      this.sms = this.client.SMS;
      this.isConfigured = true;
      
      logger.info('SMS service initialized successfully', {
        username: process.env.AFRICASTALKING_USERNAME
      });
    } catch (error) {
      logger.error('Failed to initialize SMS service:', error);
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS({ to, message, from = null }) {
    if (!this.isConfigured) {
      throw new Error('SMS service not configured');
    }

    try {
      // Normalize phone number to international format
      const phoneNumber = this.normalizePhoneNumber(to);
      
      const options = {
        to: [phoneNumber],
        message,
        from: from || process.env.AFRICASTALKING_SENDER_ID || 'Haven'
      };

      const result = await this.sms.send(options);
      
      if (result.SMSMessageData.Recipients.length > 0) {
        const recipient = result.SMSMessageData.Recipients[0];
        
        if (recipient.status === 'Success') {
          this.stats.sent++;
          this.stats.lastSent = new Date().toISOString();
          
          logger.info('SMS sent successfully', {
            to: phoneNumber,
            messageId: recipient.messageId,
            cost: recipient.cost
          });
          
          businessLog('sms_sent', {
            to: phoneNumber,
            messageLength: message.length,
            cost: recipient.cost,
            messageId: recipient.messageId
          });
          
          return {
            success: true,
            messageId: recipient.messageId,
            cost: recipient.cost,
            status: recipient.status
          };
        } else {
          this.stats.failed++;
          throw new Error(`SMS failed: ${recipient.status}`);
        }
      } else {
        this.stats.failed++;
        throw new Error('No recipients in SMS response');
      }
    } catch (error) {
      this.stats.failed++;
      logger.error('Failed to send SMS:', {
        to,
        error: error.message,
        message: message.substring(0, 50) + '...'
      });
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages) {
    if (!this.isConfigured) {
      throw new Error('SMS service not configured');
    }

    const results = [];
    
    for (const { to, message, from } of messages) {
      try {
        const result = await this.sendSMS({ to, message, from });
        results.push({ to, success: true, result });
      } catch (error) {
        results.push({ to, success: false, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info('Bulk SMS completed', {
      total: messages.length,
      successful,
      failed
    });
    
    return {
      total: messages.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Send rent reminder SMS
   */
  async sendRentReminderSMS({ to, tenantName, amount, dueDate, propertyName, reminderType }) {
    const templates = {
      upcoming: `Hi ${tenantName}, your rent of KES ${amount} for ${propertyName} is due on ${dueDate}. Please pay on time to avoid penalties. - Haven`,
      due: `Hi ${tenantName}, your rent of KES ${amount} for ${propertyName} is due today. Please pay to avoid late fees. - Haven`,
      overdue: `URGENT: ${tenantName}, your rent of KES ${amount} for ${propertyName} is overdue. Please pay immediately to avoid penalties. - Haven`,
      final_notice: `FINAL NOTICE: ${tenantName}, pay your overdue rent of KES ${amount} for ${propertyName} within 24 hours or face eviction proceedings. - Haven`
    };

    const message = templates[reminderType] || templates.due;
    
    return this.sendSMS({ to, message });
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmationSMS({ to, tenantName, amount, propertyName, referenceNumber }) {
    const message = `Payment confirmed! Hi ${tenantName}, we received your payment of KES ${amount} for ${propertyName}. Ref: ${referenceNumber}. Thank you! - Haven`;
    
    return this.sendSMS({ to, message });
  }

  /**
   * Send maintenance update SMS
   */
  async sendMaintenanceUpdateSMS({ to, tenantName, requestId, status, scheduledDate }) {
    let message;
    
    switch (status.toLowerCase()) {
      case 'scheduled':
        message = `Hi ${tenantName}, your maintenance request #${requestId} has been scheduled for ${scheduledDate}. - Haven`;
        break;
      case 'in_progress':
        message = `Hi ${tenantName}, maintenance work for request #${requestId} is now in progress. - Haven`;
        break;
      case 'completed':
        message = `Hi ${tenantName}, your maintenance request #${requestId} has been completed. Thank you! - Haven`;
        break;
      default:
        message = `Hi ${tenantName}, your maintenance request #${requestId} status: ${status}. - Haven`;
    }
    
    return this.sendSMS({ to, message });
  }

  /**
   * Send welcome SMS to new tenant
   */
  async sendWelcomeSMS({ to, tenantName, propertyName, moveInDate }) {
    const message = `Welcome ${tenantName}! Your tenancy at ${propertyName} starts on ${moveInDate}. We're here to help make your stay comfortable. - Haven`;
    
    return this.sendSMS({ to, message });
  }

  /**
   * Send lease expiration reminder
   */
  async sendLeaseExpirationSMS({ to, tenantName, propertyName, expirationDate, daysLeft }) {
    const message = `Hi ${tenantName}, your lease for ${propertyName} expires on ${expirationDate} (${daysLeft} days). Please contact us to discuss renewal. - Haven`;
    
    return this.sendSMS({ to, message });
  }

  /**
   * Send OTP SMS
   */
  async sendOTPSMS({ to, otp, purpose = 'verification' }) {
    const message = `Your Haven ${purpose} code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;
    
    return this.sendSMS({ to, message });
  }

  /**
   * Normalize phone number to Kenya international format
   */
  normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+254${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      return `+254${cleaned}`;
    } else {
      return `+254${cleaned}`;
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    // Kenya mobile numbers: +254 7XX XXX XXX or +254 1XX XXX XXX
    return /^\+254[17]\d{8}$/.test(normalized);
  }

  /**
   * Get SMS delivery report
   */
  async getDeliveryReport(messageId) {
    if (!this.isConfigured) {
      throw new Error('SMS service not configured');
    }

    try {
      // Note: Africa's Talking doesn't have a direct delivery report API
      // This would need to be implemented using webhooks
      logger.info('Delivery report requested', { messageId });
      
      return {
        messageId,
        status: 'pending',
        message: 'Delivery reports require webhook configuration'
      };
    } catch (error) {
      logger.error('Failed to get delivery report:', { messageId, error: error.message });
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    if (!this.isConfigured) {
      throw new Error('SMS service not configured');
    }

    try {
      const application = this.client.APPLICATION;
      const result = await application.fetchApplicationData();
      
      return {
        balance: result.UserData.balance,
        currency: 'USD' // Africa's Talking uses USD
      };
    } catch (error) {
      logger.error('Failed to get SMS balance:', error);
      throw error;
    }
  }

  /**
   * Test SMS service
   */
  async testService(testPhoneNumber) {
    if (!this.isConfigured) {
      throw new Error('SMS service not configured');
    }

    try {
      const testMessage = `Test message from Haven Property Management. Time: ${new Date().toLocaleString()}`;
      
      const result = await this.sendSMS({
        to: testPhoneNumber,
        message: testMessage
      });
      
      return {
        success: true,
        message: 'Test SMS sent successfully',
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      isConfigured: this.isConfigured,
      successRate: this.stats.sent + this.stats.failed > 0 
        ? Math.round((this.stats.sent / (this.stats.sent + this.stats.failed)) * 100)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      sent: 0,
      failed: 0,
      lastSent: null,
    };
    logger.info('SMS statistics reset');
  }
}

// Create singleton instance
export const smsService = new SMSService();
export default smsService;