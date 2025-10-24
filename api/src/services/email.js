import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { emailCircuitBreaker } from './circuitBreaker.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.templates = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        logger.warn('Email service not configured - missing credentials');
        return;
      }

      // Configure transporter based on provider
      const emailProvider = process.env.EMAIL_PROVIDER || 'gmail';
      
      if (emailProvider === 'gmail') {
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
      } else if (emailProvider === 'smtp') {
        this.transporter = nodemailer.createTransporter({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
      }

      // Load email templates
      await this.loadTemplates();

      this.isConfigured = true;
      logger.info('Email service initialized successfully', { provider: emailProvider });
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/email');
      
      // Create templates directory if it doesn't exist
      try {
        await fs.access(templatesDir);
      } catch {
        await fs.mkdir(templatesDir, { recursive: true });
        await this.createDefaultTemplates(templatesDir);
      }

      const templateFiles = await fs.readdir(templatesDir);
      
      for (const file of templateFiles) {
        if (file.endsWith('.html')) {
          const templateName = file.replace('.html', '');
          const templateContent = await fs.readFile(path.join(templatesDir, file), 'utf-8');
          this.templates.set(templateName, templateContent);
        }
      }
      
      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  async createDefaultTemplates(templatesDir) {
    const templates = {
      'rent-upcoming': `
<h2>Rent Payment Reminder</h2>
<p>Dear {{tenantName}},</p>
<p>This is a friendly reminder that your rent payment for <strong>{{propertyName}}</strong> is due in {{daysDiff}} days.</p>
<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; margin: 15px 0; border-radius: 5px;">
    <strong>Payment Details:</strong><br>
    Amount Due: <strong>{{amountDue}}</strong><br>
    Due Date: <strong>{{dueDate}}</strong><br>
    Property: <strong>{{propertyName}}</strong>
</div>
<p>Please ensure your payment is made on time to avoid any late fees.</p>
<p>Thank you for being a valued tenant.</p>
<p>Best regards,<br>{{agencyName}}</p>`,

      'rent-due': `
<h2>Rent Payment Due Today</h2>
<p>Dear {{tenantName}},</p>
<p>Your rent payment for <strong>{{propertyName}}</strong> is due today.</p>
<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; margin: 15px 0; border-radius: 5px;">
    <strong>Payment Details:</strong><br>
    Amount Due: <strong>{{amountDue}}</strong><br>
    Due Date: <strong>{{dueDate}}</strong><br>
    Property: <strong>{{propertyName}}</strong>
</div>
<p>Please make your payment today to avoid late fees.</p>
<p>Best regards,<br>{{agencyName}}</p>`,

      'rent-overdue': `
<h2>Overdue Rent Payment - Action Required</h2>
<p>Dear {{tenantName}},</p>
<p>Your rent payment for <strong>{{propertyName}}</strong> is now <strong>{{daysDiff}} days overdue</strong>.</p>
<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; margin: 15px 0; border-radius: 5px;">
    <strong>Overdue Payment:</strong><br>
    Amount Due: <strong>{{amountDue}}</strong><br>
    Days Overdue: <strong>{{daysDiff}} days</strong><br>
    Property: <strong>{{propertyName}}</strong>
</div>
<p><strong>Immediate action is required.</strong> Please make your payment as soon as possible.</p>
<p>Best regards,<br>{{agencyName}}</p>`
    };

    for (const [name, content] of Object.entries(templates)) {
      await fs.writeFile(path.join(templatesDir, `${name}.html`), content);
    }
  }

  async sendTemplateEmail({ to, subject, template, data = {} }) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    if (!this.templates.has(template)) {
      throw new Error(`Email template '${template}' not found`);
    }

    let templateContent = this.templates.get(template);

    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      templateContent = templateContent.replace(regex, value);
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Haven Property Management'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: templateContent
    };

    try {
      const result = await emailCircuitBreaker.execute(async () => {
        return await this.transporter.sendMail(mailOptions);
      });
      
      logger.info('Template email sent successfully', { to, subject, template, messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error('Failed to send template email:', { to, subject, template, error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
export const emailService = new EmailService();

// Create transporter (legacy function for backward compatibility)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
    },
  });
};

/**
 * Send email verification
 */
export async function sendVerificationEmail(email, token) {
  const transporter = createTransporter();
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Property Manager" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Property Manager!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await emailCircuitBreaker.execute(async () => {
      await transporter.sendMail(mailOptions);
    });
    logger.info(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send verification email: ${error.message}`);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, token) {
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Property Manager" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send password reset email: ${error.message}`);
    throw error;
  }
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminder(email, tenant, invoice) {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Property Manager" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Payment Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Reminder</h2>
        <p>Dear ${tenant.name},</p>
        <p>This is a friendly reminder that your rent payment is due.</p>
        <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount Due:</strong> $${invoice.amount}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueAt).toLocaleDateString()}</p>
          <p><strong>Invoice ID:</strong> ${invoice.id}</p>
        </div>
        <p>Please make your payment at your earliest convenience.</p>
        <p>Thank you for your prompt attention to this matter.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Payment reminder sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send payment reminder: ${error.message}`);
    throw error;
  }
}

/**
 * Send lease expiration alert
 */
export async function sendLeaseExpirationAlert(email, tenant, lease) {
  const transporter = createTransporter();
  const daysUntilExpiration = Math.ceil(
    (new Date(lease.endDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const mailOptions = {
    from: `"Property Manager" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Lease Expiration Notice',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Lease Expiration Notice</h2>
        <p>Dear ${tenant.name},</p>
        <p>Your lease is expiring soon.</p>
        <div style="background-color: #FEF3C7; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Days Until Expiration:</strong> ${daysUntilExpiration} days</p>
          <p><strong>Expiration Date:</strong> ${new Date(lease.endDate).toLocaleDateString()}</p>
        </div>
        <p>Please contact us to discuss lease renewal options.</p>
        <p>Thank you.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Lease expiration alert sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send lease expiration alert: ${error.message}`);
    throw error;
  }
}
