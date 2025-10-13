import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createStripePaymentIntent,
  confirmStripePayment,
  handleStripeWebhook,
  getStripePaymentStatus,
} from '../services/stripe.js';
import {
  initializePaystackPayment,
  verifyPaystackPayment,
  handlePaystackWebhook,
  getPaystackTransactionStatus,
} from '../services/paystack.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { auditLog } from '../utils/logger.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';

export const cardRouter = Router();

// Schema for card payment
const cardPaymentSchema = z.object({
  amount: z.number().positive(),
  email: z.string().email(),
  provider: z.enum(['stripe', 'paystack']),
  leaseId: z.string().optional(),
  description: z.string().optional(),
});

// ==================== STRIPE ROUTES ====================

/**
 * POST /cards/stripe/create-intent
 * Create Stripe payment intent
 */
cardRouter.post(
  '/stripe/create-intent',
  requireAuth,
  validateBody(cardPaymentSchema),
  asyncHandler(async (req, res) => {
    const { amount, email, leaseId, description } = req.body;
    const agencyId = req.user.agencyId;

    try {
      const result = await createStripePaymentIntent(amount, 'KES', {
        agencyId,
        leaseId,
        email,
        description: description || 'Rent payment',
      });

      auditLog('STRIPE_PAYMENT_INITIATED', req.user.userId, {
        amount,
        paymentIntentId: result.paymentIntentId,
      });

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * GET /cards/stripe/status/:paymentIntentId
 * Get Stripe payment status
 */
cardRouter.get(
  '/stripe/status/:paymentIntentId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { paymentIntentId } = req.params;

    try {
      const status = await getStripePaymentStatus(paymentIntentId);
      return successResponse(res, status);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * POST /cards/stripe/webhook
 * Stripe webhook endpoint
 */
cardRouter.post(
  '/stripe/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    try {
      await handleStripeWebhook(req.rawBody, signature);
      return res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      return res.status(400).json({ error: error.message });
    }
  })
);

// ==================== PAYSTACK ROUTES ====================

/**
 * POST /cards/paystack/initialize
 * Initialize Paystack payment
 */
cardRouter.post(
  '/paystack/initialize',
  requireAuth,
  validateBody(cardPaymentSchema),
  asyncHandler(async (req, res) => {
    const { amount, email, leaseId, description } = req.body;
    const agencyId = req.user.agencyId;

    try {
      const result = await initializePaystackPayment(email, amount, {
        agencyId,
        leaseId,
        description: description || 'Rent payment',
      });

      auditLog('PAYSTACK_PAYMENT_INITIATED', req.user.userId, {
        amount,
        reference: result.reference,
      });

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * GET /cards/paystack/verify/:reference
 * Verify Paystack payment
 */
cardRouter.get(
  '/paystack/verify/:reference',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { reference } = req.params;

    try {
      const result = await verifyPaystackPayment(reference);
      
      if (result.success) {
        auditLog('PAYSTACK_PAYMENT_VERIFIED', req.user.userId, {
          reference,
          amount: result.amount,
        });
      }

      return successResponse(res, result);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * POST /cards/paystack/webhook
 * Paystack webhook endpoint
 */
cardRouter.post(
  '/paystack/webhook',
  asyncHandler(async (req, res) => {
    try {
      await handlePaystackWebhook(req.body);
      return res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Paystack webhook error:', error);
      return res.status(400).json({ error: error.message });
    }
  })
);

// ==================== GENERAL ROUTES ====================

/**
 * GET /cards/transactions
 * Get all card transactions
 */
cardRouter.get(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    const { provider, status, leaseId } = req.query;

    const where = { agencyId };
    if (provider) where.provider = provider.toUpperCase();
    if (status) where.status = status.toUpperCase();
    if (leaseId) where.leaseId = leaseId;

    const transactions = await prisma.cardTransaction.findMany({
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
 * GET /cards/transactions/:id
 * Get specific transaction
 */
cardRouter.get(
  '/transactions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const agencyId = req.user.agencyId;

    const transaction = await prisma.cardTransaction.findFirst({
      where: { id, agencyId },
      include: {
        lease: {
          include: {
            tenant: true,
            property: true,
          },
        },
      },
    });

    if (!transaction) {
      return errorResponse(res, 'Transaction not found', 404);
    }

    return successResponse(res, transaction);
  })
);
