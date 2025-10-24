import axios from 'axios';
import logger, { businessLog } from '../utils/logger.js';

/**
 * WhatsApp Business API Service
 * Handles WhatsApp notifications for rent reminders and other communications
 */
class WhatsAppService {
  constructor() {
    this.isConfigured = false;
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.stats = {
      sent: 0,
      failed: 0,
      lastSent: null,
    };
    this.initialize();
  }

  initialize() {
    try {
      if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
        logger.warn('WhatsApp service not configured - missing credentials');
        return;
      }

      this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      this.isConfigured = true;
      
      logger.info('WhatsApp service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp service:', error);
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage({ to, message, type = 'text' }) {
    if (!this.isConfigured) {
      throw new Error('WhatsApp service not configured');
    }

    try {
      const phoneNumber = this.normalizePhoneNumber(to);
      
      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: type,
        text: {
          body: message
        }
      };

      const response = await axios.post(
        `${this.baseURL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.messages && response.data.messages.length > 0) {
        const messageId = response.data.messages[0].id;
        
        this.stats.sent++;
        this.stats.lastSent = new Date().toISOString();
        
        logger.info('WhatsApp message sent successfully', {
          to: phoneNumber,
          messageId
        });
        
        businessLog('whatsapp_sent', {
          to: phoneNumber,
          messageLength: message.length,
          messageId
        });
        
        return {
          success: true,
          messageId,
          status: 'sent'
        };
      } else {
        this.stats.failed++;
        throw new Error('No message ID in WhatsApp response');
      }
    } catch (error) {
      this.stats.failed++;
      logger.error('Failed to send WhatsApp message:', {
        to,
        error: error.response?.data || error.message,
        message: message.substring(0, 50) + '...'
      });
      throw error;
    }
  }

  /**
   * Send WhatsApp template message
   */
  async sendTemplateMessage({ to, template, data = {} }) {
    if (!this.isConfigured) {
      throw new Error('WhatsApp service not configured');
    }

    try {
      const phoneNumber = this.normalizePhoneNumber(to);
      
      // Get template content and replace variables
      const templateContent = this.getTemplate(template, data);
      
      return this.sendMessage({
        to: phoneNumber,
        message: templateContent
      });
    } catch (error) {
      logger.error('Failed to send WhatsApp template message:', {
        to,
        template,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send rent reminder WhatsApp message
   */
  async sendRentReminderWhatsApp({ to, tenantName, amount, dueDate, propertyName, reminderType, agencyName }) {
    const templates = {
      upcoming: `🏠 *Rent Reminder*\n\nHi ${tenantName},\n\nThis is a friendly reminder that your rent payment for *${propertyName}* is due soon.\n\n💰 *Amount:* KES ${amount}\n📅 *Due Date:* ${dueDate}\n\nPlease ensure your payment is made on time to avoid any late fees.\n\nThank you for being a valued tenant!\n\n_${agencyName}_`,
      
      due: `🏠 *Rent Payment Due Today*\n\nHi ${tenantName},\n\nYour rent payment for *${propertyName}* is due today.\n\n💰 *Amount:* KES ${amount}\n📅 *Due Date:* ${dueDate}\n\nPlease make your payment today to avoid late fees.\n\n_${agencyName}_`,
      
      overdue: `⚠️ *URGENT: Overdue Rent Payment*\n\nHi ${tenantName},\n\nYour rent payment for *${propertyName}* is now overdue.\n\n💰 *Amount:* KES ${amount}\n📅 *Original Due Date:* ${dueDate}\n\n🚨 *Immediate action is required.* Please make your payment as soon as possible to avoid additional penalties.\n\nIf you're experiencing difficulties, please contact us immediately.\n\n_${agencyName}_`,
      
      final_notice: `🚨 *FINAL NOTICE*\n\nHi ${tenantName},\n\nThis is your *FINAL NOTICE* regarding the overdue rent payment for *${propertyName}*.\n\n💰 *Amount:* KES ${amount}\n📅 *Original Due Date:* ${dueDate}\n\n⏰ *You have 24 hours* to make this payment or we will be forced to begin eviction proceedings.\n\nPlease contact us immediately if you need to discuss this matter.\n\n_${agencyName}_`
    };

    const message = templates[reminderType] || templates.due;
    
    return this.sendMessage({ to, message });
  }

  /**
   * Send payment confirmation WhatsApp message
   */
  async sendPaymentConfirmationWhatsApp({ to, tenantName, amount, propertyName, referenceNumber, paymentDate }) {
    const message = `✅ *Payment Confirmed*\n\nHi ${tenantName},\n\nWe have successfully received your payment!\n\n💰 *Amount:* KES ${amount}\n🏠 *Property:* ${propertyName}\n📋 *Reference:* ${referenceNumber}\n📅 *Date:* ${paymentDate}\n\nThank you for your prompt payment!\n\n_Haven Property Management_`;
    
    return this.sendMessage({ to, message });
  }

  /**
   * Send maintenance update WhatsApp message
   */
  async sendMaintenanceUpdateWhatsApp({ to, tenantName, requestId, status, scheduledDate, description }) {
    let message;
    
    switch (status.toLowerCase()) {
      case 'received':
        message = `🔧 *Maintenance Request Received*\n\nHi ${tenantName},\n\nWe have received your maintenance request.\n\n📋 *Request ID:* #${requestId}\n📝 *Description:* ${description}\n\nOur team will review and schedule the work soon.\n\n_Haven Property Management_`;
        break;
        
      case 'scheduled':
        message = `📅 *Maintenance Scheduled*\n\nHi ${tenantName},\n\nYour maintenance request has been scheduled!\n\n📋 *Request ID:* #${requestId}\n📅 *Scheduled Date:* ${scheduledDate}\n📝 *Work:* ${description}\n\nOur technician will arrive during the scheduled time.\n\n_Haven Property Management_`;
        break;
        
      case 'in_progress':
        message = `🔨 *Maintenance In Progress*\n\nHi ${tenantName},\n\nMaintenance work is currently in progress.\n\n📋 *Request ID:* #${requestId}\n📝 *Work:* ${description}\n\nWe'll notify you once the work is completed.\n\n_Haven Property Management_`;
        break;
        
      case 'completed':
        message = `✅ *Maintenance Completed*\n\nHi ${tenantName},\n\nGreat news! Your maintenance request has been completed.\n\n📋 *Request ID:* #${requestId}\n📝 *Work Completed:* ${description}\n\nIf you have any concerns, please let us know.\n\nThank you!\n\n_Haven Property Management_`;
        break;
        
      default:
        message = `🔧 *Maintenance Update*\n\nHi ${tenantName},\n\nUpdate on your maintenance request:\n\n📋 *Request ID:* #${requestId}\n📊 *Status:* ${status}\n📝 *Description:* ${description}\n\n_Haven Property Management_`;
    }
    
    return this.sendMessage({ to, message });
  }

  /**
   * Send welcome WhatsApp message
   */
  async sendWelcomeWhatsApp({ to, tenantName, propertyName, moveInDate, agencyName }) {
    const message = `🎉 *Welcome to Your New Home!*\n\nHi ${tenantName},\n\nWelcome to *${propertyName}*!\n\n📅 *Move-in Date:* ${moveInDate}\n\nWe're excited to have you as our tenant and are here to make your stay as comfortable as possible.\n\nIf you have any questions or need assistance, feel free to reach out to us anytime.\n\nWelcome home! 🏠\n\n_${agencyName}_`;
    
    return this.sendMessage({ to, message });
  }

  /**
   * Send lease expiration reminder
   */
  async sendLeaseExpirationWhatsApp({ to, tenantName, propertyName, expirationDate, daysLeft, agencyName }) {
    const message = `📋 *Lease Expiration Notice*\n\nHi ${tenantName},\n\nYour lease for *${propertyName}* is expiring soon.\n\n📅 *Expiration Date:* ${expirationDate}\n⏰ *Days Remaining:* ${daysLeft} days\n\nPlease contact us to discuss renewal options or move-out procedures.\n\nWe'd love to have you stay with us!\n\n_${agencyName}_`;
    
    return this.sendMessage({ to, message });
  }

  /**
   * Get template content
   */
  getTemplate(templateName, data) {
    const templates = {
      'rent-upcoming-whatsapp': (data) => 
        `🏠 *Rent Reminder*\n\nHi ${data.tenantName},\n\nYour rent for *${data.propertyName}* is due in ${data.daysDiff} days.\n\n💰 Amount: KES ${data.amountDue}\n📅 Due: ${data.dueDate}\n\n_${data.agencyName}_`,
      
      'rent-due-whatsapp': (data) => 
        `🏠 *Rent Due Today*\n\nHi ${data.tenantName},\n\nYour rent for *${data.propertyName}* is due today.\n\n💰 Amount: KES ${data.amountDue}\n\n_${data.agencyName}_`,
      
      'rent-overdue-whatsapp': (data) => 
        `⚠️ *Overdue Rent*\n\nHi ${data.tenantName},\n\nYour rent for *${data.propertyName}* is ${data.daysDiff} days overdue.\n\n💰 Amount: KES ${data.amountDue}\n\nPlease pay immediately.\n\n_${data.agencyName}_`,
      
      'rent-final-notice-whatsapp': (data) => 
        `🚨 *FINAL NOTICE*\n\nHi ${data.tenantName},\n\nFinal notice for *${data.propertyName}*.\n\n💰 Amount: KES ${data.amountDue}\n\nPay within 24 hours to avoid eviction.\n\n_${data.agencyName}_`
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`WhatsApp template '${templateName}' not found`);
    }

    return template(data);
  }

  /**
   * Normalize phone number for WhatsApp (international format without +)
   */
  normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return `254${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      return `254${cleaned}`;
    } else {
      return `254${cleaned}`;
    }
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    // Kenya mobile numbers: 254 7XX XXX XXX or 254 1XX XXX XXX
    return /^254[17]\d{8}$/.test(normalized);
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId) {
    if (!this.isConfigured) {
      throw new Error('WhatsApp service not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        messageId,
        status: response.data.status || 'unknown',
        timestamp: response.data.timestamp
      };
    } catch (error) {
      logger.error('Failed to get WhatsApp message status:', {
        messageId,
        error: error.response?.data || error.message
      });
      throw error;
    }
  }

  /**
   * Test WhatsApp service
   */
  async testService(testPhoneNumber) {
    if (!this.isConfigured) {
      throw new Error('WhatsApp service not configured');
    }

    try {
      const testMessage = `🧪 *Test Message*\n\nThis is a test message from Haven Property Management.\n\n📅 Time: ${new Date().toLocaleString()}\n\nIf you received this, WhatsApp integration is working correctly! ✅`;
      
      const result = await this.sendMessage({
        to: testPhoneNumber,
        message: testMessage
      });
      
      return {
        success: true,
        message: 'Test WhatsApp message sent successfully',
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
    logger.info('WhatsApp statistics reset');
  }
}

// Create singleton instance
export const whatsappService = new WhatsAppService();
export default whatsappService;