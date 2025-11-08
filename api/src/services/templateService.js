import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { smsTemplates, formatSMS, formatPhoneNumber } from '../templates/sms/templates.js';

/**
 * Template Service
 * Manages email and SMS templates for the application
 */

class TemplateService {
  constructor() {
    this.emailTemplatesDir = path.join(process.cwd(), 'src', 'templates', 'email');
    this.smsTemplates = smsTemplates;
  }

  /**
   * Load and render email template
   * @param {string} templateName - Name of the template file (without .html)
   * @param {object} data - Data to replace in template
   * @returns {Promise<string>} Rendered HTML
   */
  async renderEmailTemplate(templateName, data) {
    try {
      const templatePath = path.join(this.emailTemplatesDir, `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf-8');

      // Simple template variable replacement
      // Replace {{variable}} with data.variable
      template = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
      });

      // Handle conditional blocks {{#if variable}}...{{/if}}
      template = template.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
        return data[key] ? content : '';
      });

      return template;
    } catch (error) {
      logger.error('Error rendering email template:', {
        templateName,
        error: error.message
      });
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }

  /**
   * Get SMS template
   * @param {string} templateName - Name of the SMS template
   * @param {object} data - Data for the template
   * @returns {object} SMS message with metadata
   */
  getSMSTemplate(templateName, data) {
    try {
      const template = this.smsTemplates[templateName];
      
      if (!template) {
        throw new Error(`SMS template not found: ${templateName}`);
      }

      return formatSMS(template, data);
    } catch (error) {
      logger.error('Error getting SMS template:', {
        templateName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send welcome email to new tenant
   */
  async sendWelcomeEmail(emailService, tenantData) {
    try {
      const html = await this.renderEmailTemplate('welcome-tenant', {
        tenantName: tenantData.name,
        propertyName: tenantData.property.title,
        unitNumber: tenantData.unit.unitNumber,
        moveInDate: new Date(tenantData.lease.startDate).toLocaleDateString(),
        monthlyRent: tenantData.lease.monthlyRent.toLocaleString(),
        leaseDuration: tenantData.lease.duration,
        firstPaymentDate: new Date(tenantData.lease.firstPaymentDate).toLocaleDateString(),
        mpesaNumber: process.env.MPESA_PAYBILL || '123456',
        bankAccount: process.env.BANK_ACCOUNT || 'XXXX-XXXX-XXXX',
        portalUrl: process.env.FRONTEND_URL || 'https://portal.haven.com',
        managerName: tenantData.manager?.name || 'Property Manager',
        managerPhone: tenantData.manager?.phone || process.env.SUPPORT_PHONE,
        managerEmail: tenantData.manager?.email || process.env.SUPPORT_EMAIL
      });

      await emailService.sendEmail({
        to: tenantData.email,
        subject: `Welcome to ${tenantData.property.title}!`,
        html
      });

      logger.info('Welcome email sent', { tenantId: tenantData.id });
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Send rent reminder email
   */
  async sendRentReminderEmail(emailService, invoiceData) {
    try {
      const html = await this.renderEmailTemplate('rent-reminder', {
        tenantName: invoiceData.tenant.name,
        propertyName: invoiceData.property.title,
        unitNumber: invoiceData.unit.unitNumber,
        dueDate: new Date(invoiceData.dueAt).toLocaleDateString(),
        amount: invoiceData.amount.toLocaleString(),
        mpesaNumber: process.env.MPESA_PAYBILL || '123456',
        referenceNumber: invoiceData.id,
        bankAccount: process.env.BANK_ACCOUNT || 'XXXX-XXXX-XXXX',
        bankName: process.env.BANK_NAME || 'Bank Name',
        paymentUrl: `${process.env.FRONTEND_URL}/payments/${invoiceData.id}`,
        supportEmail: process.env.SUPPORT_EMAIL,
        supportPhone: process.env.SUPPORT_PHONE
      });

      await emailService.sendEmail({
        to: invoiceData.tenant.email,
        subject: `Rent Payment Reminder - Due ${new Date(invoiceData.dueAt).toLocaleDateString()}`,
        html
      });

      logger.info('Rent reminder email sent', { invoiceId: invoiceData.id });
    } catch (error) {
      logger.error('Failed to send rent reminder email:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(emailService, paymentData) {
    try {
      const html = await this.renderEmailTemplate('payment-confirmation', {
        tenantName: paymentData.tenant.name,
        receiptNumber: paymentData.receiptNumber || paymentData.id,
        paymentDate: new Date(paymentData.paidAt).toLocaleDateString(),
        propertyName: paymentData.property.title,
        unitNumber: paymentData.unit.unitNumber,
        paymentMethod: paymentData.method,
        referenceNumber: paymentData.referenceNumber || 'N/A',
        amount: paymentData.amount.toLocaleString(),
        nextPaymentDate: paymentData.nextPaymentDate ? new Date(paymentData.nextPaymentDate).toLocaleDateString() : 'TBD',
        nextPaymentAmount: paymentData.nextPaymentAmount ? paymentData.nextPaymentAmount.toLocaleString() : 'TBD',
        receiptUrl: `${process.env.FRONTEND_URL}/receipts/${paymentData.id}`,
        supportEmail: process.env.SUPPORT_EMAIL,
        supportPhone: process.env.SUPPORT_PHONE
      });

      await emailService.sendEmail({
        to: paymentData.tenant.email,
        subject: `Payment Confirmation - Receipt #${paymentData.receiptNumber || paymentData.id}`,
        html
      });

      logger.info('Payment confirmation email sent', { paymentId: paymentData.id });
    } catch (error) {
      logger.error('Failed to send payment confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send rent reminder SMS
   */
  async sendRentReminderSMS(smsService, invoiceData) {
    try {
      const sms = this.getSMSTemplate('rentReminder', {
        amount: invoiceData.amount.toLocaleString(),
        dueDate: new Date(invoiceData.dueAt).toLocaleDateString('en-GB'),
        propertyName: invoiceData.property.title,
        unitNumber: invoiceData.unit.unitNumber,
        mpesaNumber: process.env.MPESA_PAYBILL || '123456',
        reference: invoiceData.id.substring(0, 8)
      });

      const phone = formatPhoneNumber(invoiceData.tenant.phone);

      await smsService.sendSMS({
        to: phone,
        message: sms.message
      });

      logger.info('Rent reminder SMS sent', {
        invoiceId: invoiceData.id,
        smsCount: sms.smsCount
      });
    } catch (error) {
      logger.error('Failed to send rent reminder SMS:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmationSMS(smsService, paymentData) {
    try {
      const sms = this.getSMSTemplate('paymentReceived', {
        amount: paymentData.amount.toLocaleString(),
        propertyName: paymentData.property.title,
        unitNumber: paymentData.unit.unitNumber,
        receiptNumber: (paymentData.receiptNumber || paymentData.id).substring(0, 10)
      });

      const phone = formatPhoneNumber(paymentData.tenant.phone);

      await smsService.sendSMS({
        to: phone,
        message: sms.message
      });

      logger.info('Payment confirmation SMS sent', {
        paymentId: paymentData.id,
        smsCount: sms.smsCount
      });
    } catch (error) {
      logger.error('Failed to send payment confirmation SMS:', error);
      throw error;
    }
  }

  /**
   * List all available email templates
   */
  async listEmailTemplates() {
    try {
      const files = await fs.readdir(this.emailTemplatesDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      logger.error('Error listing email templates:', error);
      return [];
    }
  }

  /**
   * List all available SMS templates
   */
  listSMSTemplates() {
    return Object.keys(this.smsTemplates);
  }

  /**
   * Get template preview
   */
  async getTemplatePreview(type, templateName, sampleData) {
    try {
      if (type === 'email') {
        return await this.renderEmailTemplate(templateName, sampleData);
      } else if (type === 'sms') {
        return this.getSMSTemplate(templateName, sampleData);
      } else {
        throw new Error(`Invalid template type: ${type}`);
      }
    } catch (error) {
      logger.error('Error getting template preview:', error);
      throw error;
    }
  }
}

// Export singleton instance
const templateService = new TemplateService();
export default templateService;
