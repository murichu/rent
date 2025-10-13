import speakeasy from 'speakeasy';
import { prisma } from '../db.js';
import logger from '../utils/logger.js';
import { sendEmail } from './email.js';

/**
 * Generate OTP secret for a user
 */
export async function generateOTPSecret(userId, email) {
  const secret = speakeasy.generateSecret({
    name: `Property Manager (${email})`,
    length: 32,
  });

  // Store secret in database
  await prisma.twoFactorSecret.upsert({
    where: { userId },
    update: {
      secret: secret.base32,
      enabled: false,
    },
    create: {
      userId,
      secret: secret.base32,
      enabled: false,
    },
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
}

/**
 * Verify OTP token
 */
export function verifyOTPToken(secret, token) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after for clock drift
  });
}

/**
 * Enable 2FA for user
 */
export async function enable2FA(userId, token) {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
  });

  if (!twoFactorSecret) {
    throw new Error('2FA not set up');
  }

  // Verify the token first
  const isValid = verifyOTPToken(twoFactorSecret.secret, token);
  if (!isValid) {
    throw new Error('Invalid OTP token');
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes(8);
  
  // Hash backup codes before storing
  const hashedCodes = backupCodes.map(code => 
    require('crypto').createHash('sha256').update(code).digest('hex')
  );

  // Enable 2FA and store backup codes
  await prisma.twoFactorSecret.update({
    where: { userId },
    data: {
      enabled: true,
      backupCodes: hashedCodes,
    },
  });

  logger.info(`2FA enabled for user ${userId}`);

  return backupCodes; // Return unhashed codes to show user once
}

/**
 * Disable 2FA for user
 */
export async function disable2FA(userId) {
  await prisma.twoFactorSecret.update({
    where: { userId },
    data: {
      enabled: false,
      secret: null,
      backupCodes: [],
    },
  });

  logger.info(`2FA disabled for user ${userId}`);
}

/**
 * Verify 2FA token during login
 */
export async function verify2FAToken(userId, token) {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
  });

  if (!twoFactorSecret || !twoFactorSecret.enabled) {
    return false;
  }

  // Try to verify as OTP token
  const isValidOTP = verifyOTPToken(twoFactorSecret.secret, token);
  if (isValidOTP) {
    return true;
  }

  // Try to verify as backup code
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const backupCodeIndex = twoFactorSecret.backupCodes.indexOf(hashedToken);
  if (backupCodeIndex !== -1) {
    // Remove used backup code
    const updatedCodes = [...twoFactorSecret.backupCodes];
    updatedCodes.splice(backupCodeIndex, 1);
    
    await prisma.twoFactorSecret.update({
      where: { userId },
      data: { backupCodes: updatedCodes },
    });

    logger.info(`Backup code used for user ${userId}`);
    return true;
  }

  return false;
}

/**
 * Generate backup codes
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Send OTP via email
 */
export async function sendOTPEmail(email, userName) {
  // Generate a temporary 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP in cache/database with 5-minute expiry
  // For now, we'll use a simple in-memory store
  // In production, use Redis or database with TTL
  global.emailOTPs = global.emailOTPs || {};
  global.emailOTPs[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };

  const mailOptions = {
    from: `"Property Manager" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Login Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Hello ${userName}!</h2>
        <p>Your login verification code is:</p>
        <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">Property Manager - Secure Login</p>
      </div>
    `,
  };

  try {
    const transporter = require('nodemailer').createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send OTP email: ${error.message}`);
    throw error;
  }
}

/**
 * Verify email OTP
 */
export function verifyEmailOTP(email, otp) {
  const stored = global.emailOTPs?.[email];
  
  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    delete global.emailOTPs[email];
    return false;
  }

  if (stored.otp === otp) {
    delete global.emailOTPs[email];
    return true;
  }

  return false;
}

/**
 * Check if user has 2FA enabled
 */
export async function has2FAEnabled(userId) {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
  });

  return twoFactorSecret?.enabled || false;
}

/**
 * Get remaining backup codes count
 */
export async function getBackupCodesCount(userId) {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
  });

  return twoFactorSecret?.backupCodes?.length || 0;
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId) {
  const backupCodes = generateBackupCodes(8);
  
  const hashedCodes = backupCodes.map(code => 
    require('crypto').createHash('sha256').update(code).digest('hex')
  );

  await prisma.twoFactorSecret.update({
    where: { userId },
    data: { backupCodes: hashedCodes },
  });

  logger.info(`Backup codes regenerated for user ${userId}`);

  return backupCodes;
}
