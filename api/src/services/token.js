import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Generate access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(userId, token, expiresAt) {
  // First, invalidate any existing tokens for this user
  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } }
  });

  return await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token) {
  return await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

/**
 * Generate verification token
 */
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store verification token
 */
export async function storeVerificationToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

  return await prisma.verificationToken.upsert({
    where: { userId },
    update: { token, expiresAt },
    create: { userId, token, expiresAt },
  });
}

/**
 * Store password reset token
 */
export async function storePasswordResetToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

  return await prisma.passwordResetToken.upsert({
    where: { userId },
    update: { token, expiresAt, used: false },
    create: { userId, token, expiresAt, used: false },
  });
}

/**
 * Verify and consume password reset token
 */
export async function verifyPasswordResetToken(token) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return null;
  }

  // Mark as used
  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  return resetToken.user;
}

/**
 * Verify and consume email verification token
 */
export async function verifyEmailToken(token) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return null;
  }

  // Mark user as verified and delete token
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: true },
  });

  await prisma.verificationToken.delete({
    where: { token },
  });

  return verificationToken.user;
}
