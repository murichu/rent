import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  initiatePesapalPayment,
  getPesapalTransactionStatus,
  handlePesapalIPN,
  getDetailedPesapalStatus,
  calculatePesapalFees,
  registerPesapalIPN,
} from '../services/pesapal.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { auditLog } from '../utils/logger.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';

export const pesapalRouter = Router();

// Payment schema
const pesapalPaymentSchema = z.object({
  amount: z.number().positive(),
  email: z.string().email(),
  phone: z.string().min(10),
  name: z.string(),
  description: z.string().optional(),
  leaseId: z.string().optional(),
});

/**
 * POST /pesapal/calculate-fees
 * Calculate total amount including Pesapal fees
 */
pesapalRouter.post(
  '/calculate-fees',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return errorResponse(res, 'Valid amount required', 400);
    }

    const pricing = calculatePesapalFees(amount);

    return successResponse(res, {
      baseAmount: pricing.baseAmount,
      fees: pricing.fees,
      totalAmount: pricing.totalAmount,
      breakdown: pricing.breakdown,
      message: `Total payable: KES ${pricing.totalAmount.toLocaleString()} (Rent: ${pricing.baseAmount.toLocaleString()} + Fees: ${pricing.fees.toLocaleString()})`,
    });
  })
);

/**
 * POST /pesapal/initiate
 * Initiate Pesapal card payment
 */
pesapalRouter.post(
  '/initiate',
  requireAuth,
  validateBody(pesapalPaymentSchema),
  asyncHandler(async (req, res) => {
    const { amount, email, phone, name, description, leaseId } = req.body;
    const agencyId = req.user.agencyId;

    try {
      const result = await initiatePesapalPayment({
        amount,
        currency: 'KES',
        description: description || 'Rent Payment',
        callbackUrl: `${process.env.FRONTEND_URL}/payments/pesapal/callback`,
        leaseId,
        agencyId,
        customerEmail: email,
        customerPhone: phone,
        customerName: name,
      });

      auditLog('PESAPAL_PAYMENT_INITIATED', req.user.userId, {
        merchantReference: result.merchantReference,
        baseAmount: amount,
        totalAmount: result.pricing.totalAmount,
        fees: result.pricing.fees,
      });

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * GET /pesapal/status/:orderTrackingId
 * Get payment status
 */
pesapalRouter.get(
  '/status/:orderTrackingId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { orderTrackingId } = req.params;

    try {
      const status = await getPesapalTransactionStatus(orderTrackingId);
      return successResponse(res, status);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * GET /pesapal/status-detailed/:merchantReference
 * Get detailed status with user-friendly messages
 */
pesapalRouter.get(
  '/status-detailed/:merchantReference',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { merchantReference } = req.params;

    const status = await getDetailedPesapalStatus(merchantReference);

    if (!status) {
      return errorResponse(res, 'Transaction not found', 404);
    }

    return successResponse(res, status);
  })
);

/**
 * GET /pesapal/ipn
 * IPN (Instant Payment Notification) endpoint
 */
pesapalRouter.get('/ipn', asyncHandler(async (req, res) => {
  const { OrderTrackingId, OrderMerchantReference } = req.query;

  logger.info('Pesapal IPN received:', {
    orderTrackingId: OrderTrackingId,
    merchantReference: OrderMerchantReference,
  });

  try {
    await handlePesapalIPN(OrderTrackingId, OrderMerchantReference);
    return res.status(200).send('IPN received');
  } catch (error) {
    logger.error('IPN processing failed:', error);
    return res.status(200).send('IPN received'); // Still return 200 to Pesapal
  }
}));

/**
 * GET /pesapal/transactions
 * Get all Pesapal transactions
 */
pesapalRouter.get(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    const { status, leaseId } = req.query;

    const where = { agencyId };
    if (status) where.status = status;
    if (leaseId) where.leaseId = leaseId;

    const transactions = await prisma.pesapalTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lease: {
          include: {
            tenant: true,
            property: true,
          },
        },
      },
    });

    return successResponse(res, transactions);
  })
);

/**
 * POST /pesapal/register-ipn
 * Register IPN URL (admin only, one-time setup)
 */
pesapalRouter.post(
  '/register-ipn',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const result = await registerPesapalIPN();
      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);
