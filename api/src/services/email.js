import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { emailCircuitBreaker } from './circuitBreaker.js';

// Create transporter
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
