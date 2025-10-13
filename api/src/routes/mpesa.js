import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  initiateStkPush,
  queryStkPushStatus,
  processMpesaCallback,
  getMpesaTransaction,
  getMpesaTransactionsByLease,
  linkTransactionToLease,
} from '../services/mpesa.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { auditLog } from '../utils/logger.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';

export const mpesaRouter = Router();

// STK Push schema
const stkPushSchema = z.object({
  phoneNumber: z.string().min(10, 'Valid phone number required'),
  amount: z.number().positive('Amount must be greater than 0'),
  accountReference: z.string().optional(),
  transactionDesc: z.string().optional(),
  leaseId: z.string().optional(),
});

/**
 * POST /mpesa/stk-push
 * Initiate STK Push payment
 */
mpesaRouter.post(
  '/stk-push',
  requireAuth,
  validateBody(stkPushSchema),
  asyncHandler(async (req, res) => {
    const { phoneNumber, amount, accountReference, transactionDesc, leaseId } = req.body;
    const agencyId = req.user.agencyId;

    try {
      const result = await initiateStkPush(
        phoneNumber,
        amount,
        accountReference || `Haven-${Date.now()}`,
        transactionDesc || 'Rent Payment'
      );

      // Link to lease if provided
      if (leaseId && result.data.checkoutRequestId) {
        await linkTransactionToLease(result.data.checkoutRequestId, leaseId, agencyId);
      }

      auditLog('MPESA_STK_PUSH_INITIATED', req.user.userId, {
        phoneNumber,
        amount,
        checkoutRequestId: result.data.checkoutRequestId,
      });

      return successResponse(res, result.data, 200, {
        message: 'STK Push sent to customer phone. Please complete payment on mobile.',
      });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * GET /mpesa/status/:checkoutRequestId
 * Query transaction status
 */
mpesaRouter.get(
  '/status/:checkoutRequestId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { checkoutRequestId } = req.params;

    try {
      // First check our database
      const transaction = await getMpesaTransaction(checkoutRequestId);

      if (!transaction) {
        return errorResponse(res, 'Transaction not found', 404);
      }

      // If still pending, query M-Pesa
      if (transaction.status === 'PENDING') {
        try {
          const status = await queryStkPushStatus(checkoutRequestId);
          return successResponse(res, {
            ...transaction,
            liveStatus: status,
          });
        } catch (error) {
          // If query fails, return database status
          logger.warn('Live status query failed, returning DB status');
        }
      }

      return successResponse(res, transaction);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * POST /mpesa/callback
 * M-Pesa callback endpoint (called by Safaricom)
 * This endpoint should NOT require auth as it's called by M-Pesa servers
 */
mpesaRouter.post(
  '/callback',
  asyncHandler(async (req, res) => {
    try {
      logger.info('M-Pesa callback received:', JSON.stringify(req.body));

      await processMpesaCallback(req.body);

      // M-Pesa expects a 200 response
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Success',
      });
    } catch (error) {
      logger.error('Error processing M-Pesa callback:', error);
      
      // Still return 200 to M-Pesa to prevent retries
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Failed to process callback',
      });
    }
  })
);

/**
 * GET /mpesa/transactions
 * Get all M-Pesa transactions for agency
 */
mpesaRouter.get(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    const { leaseId, status } = req.query;

    const where = { agencyId };
    if (leaseId) where.leaseId = leaseId;
    if (status) where.status = status;

    const transactions = await prisma.mpesaTransaction.findMany({
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
 * GET /mpesa/transactions/:id
 * Get specific transaction
 */
mpesaRouter.get(
  '/transactions/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const agencyId = req.user.agencyId;

    const transaction = await prisma.mpesaTransaction.findFirst({
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

/**
 * POST /mpesa/test-callback
 * Test callback endpoint (development only)
 */
if (process.env.NODE_ENV !== 'production') {
  mpesaRouter.post('/test-callback', asyncHandler(async (req, res) => {
    // Simulate M-Pesa callback for testing
    const testCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: req.body.merchantRequestId,
          CheckoutRequestID: req.body.checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: req.body.amount || 100 },
              { Name: 'MpesaReceiptNumber', Value: 'TEST' + Date.now() },
              { Name: 'TransactionDate', Value: Date.now() },
              { Name: 'PhoneNumber', Value: req.body.phoneNumber || '254712345678' },
            ],
          },
        },
      },
    };

    await processMpesaCallback(testCallback);
    return successResponse(res, { message: 'Test callback processed' });
  }));
}
