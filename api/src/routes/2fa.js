import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  generateOTPSecret, 
  enable2FA, 
  disable2FA, 
  verify2FAToken,
  sendOTPEmail,
  verifyEmailOTP,
  has2FAEnabled,
  getBackupCodesCount,
  regenerateBackupCodes
} from '../services/otp.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { auditLog } from '../utils/logger.js';

export const twoFactorRouter = Router();

// All routes require authentication
twoFactorRouter.use(requireAuth);

/**
 * GET /2fa/status
 * Check if 2FA is enabled for current user
 */
twoFactorRouter.get('/status', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  
  const enabled = await has2FAEnabled(userId);
  const backupCodesCount = await getBackupCodesCount(userId);

  return successResponse(res, {
    enabled,
    backupCodesCount,
  });
}));

/**
 * POST /2fa/setup
 * Generate OTP secret for 2FA setup
 */
twoFactorRouter.post('/setup', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;

  const { secret, otpauthUrl } = await generateOTPSecret(userId, email);

  auditLog('2FA_SETUP_INITIATED', userId);

  return successResponse(res, {
    secret,
    otpauthUrl,
    message: 'Scan the QR code with your authenticator app',
  });
}));

/**
 * POST /2fa/enable
 * Enable 2FA by verifying OTP token
 */
twoFactorRouter.post('/enable', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { token } = req.body;

  if (!token) {
    return errorResponse(res, 'OTP token is required', 400);
  }

  try {
    const backupCodes = await enable2FA(userId, token);

    auditLog('2FA_ENABLED', userId);

    return successResponse(res, {
      message: '2FA enabled successfully',
      backupCodes,
      warning: 'Save these backup codes in a safe place. They will not be shown again.',
    });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}));

/**
 * POST /2fa/disable
 * Disable 2FA
 */
twoFactorRouter.post('/disable', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { token } = req.body;

  if (!token) {
    return errorResponse(res, 'OTP token is required to disable 2FA', 400);
  }

  // Verify token before disabling
  const isValid = await verify2FAToken(userId, token);
  if (!isValid) {
    return errorResponse(res, 'Invalid OTP token', 400);
  }

  await disable2FA(userId);

  auditLog('2FA_DISABLED', userId);

  return successResponse(res, {
    message: '2FA disabled successfully',
  });
}));

/**
 * POST /2fa/verify
 * Verify OTP token (used during login)
 */
twoFactorRouter.post('/verify', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { token } = req.body;

  if (!token) {
    return errorResponse(res, 'OTP token is required', 400);
  }

  const isValid = await verify2FAToken(userId, token);

  if (!isValid) {
    auditLog('2FA_VERIFICATION_FAILED', userId);
    return errorResponse(res, 'Invalid OTP token', 400);
  }

  auditLog('2FA_VERIFICATION_SUCCESS', userId);

  return successResponse(res, {
    message: '2FA verification successful',
    verified: true,
  });
}));

/**
 * POST /2fa/send-email-otp
 * Send OTP via email (alternative 2FA method)
 */
twoFactorRouter.post('/send-email-otp', asyncHandler(async (req, res) => {
  const email = req.user.email;
  const userName = req.user.name;

  await sendOTPEmail(email, userName);

  return successResponse(res, {
    message: 'OTP sent to your email',
  });
}));

/**
 * POST /2fa/verify-email-otp
 * Verify email OTP
 */
twoFactorRouter.post('/verify-email-otp', asyncHandler(async (req, res) => {
  const email = req.user.email;
  const { otp } = req.body;

  if (!otp) {
    return errorResponse(res, 'OTP is required', 400);
  }

  const isValid = verifyEmailOTP(email, otp);

  if (!isValid) {
    return errorResponse(res, 'Invalid or expired OTP', 400);
  }

  return successResponse(res, {
    message: 'Email OTP verified successfully',
    verified: true,
  });
}));

/**
 * POST /2fa/regenerate-backup-codes
 * Regenerate backup codes
 */
twoFactorRouter.post('/regenerate-backup-codes', asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { token } = req.body;

  if (!token) {
    return errorResponse(res, 'OTP token is required', 400);
  }

  // Verify token before regenerating
  const isValid = await verify2FAToken(userId, token);
  if (!isValid) {
    return errorResponse(res, 'Invalid OTP token', 400);
  }

  const backupCodes = await regenerateBackupCodes(userId);

  auditLog('BACKUP_CODES_REGENERATED', userId);

  return successResponse(res, {
    message: 'Backup codes regenerated successfully',
    backupCodes,
    warning: 'Save these backup codes in a safe place. Old codes are now invalid.',
  });
}));
