import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  initiateKcbStkPush,
  processKcbMpesaCallback,
  getAccountStatement,
  sendToBank,
  bankToBank,
  sendViaPesaLink,
  processKcbTransferCallback,
  getKcbTransactionStatus,
  getKcbTransactionsByType,
  linkKcbTransactionToLease,
  getKcbAccountBalance,
  KENYA_BANK_CODES,
} from '../services/kcbBuni.js';
import { 
  processOptimizedKcbCallback 
} from '../services/paymentCallbackOptimizer.js';
import { successResponse, errorResponse } from '../utils/responses.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { auditLog } from '../utils/logger.js';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';

export const kcbRouter = Router();

// ==================== M-PESA STK PUSH ====================

const kcbStkSchema = z.object({
  phoneNumber: z.string().min(10),
  amount: z.number().positive(),
  accountReference: z.string().optional(),
  narrative: z.string().optional(),
  leaseId: z.string().optional(),
});

/**
 * POST /kcb/stk-push
 * Initiate M-Pesa STK Push via KCB Buni
 */
kcbRouter.post(
  '/stk-push',
  requireAuth,
  validateBody(kcbStkSchema),
  asyncHandler(async (req, res) => {
    const { phoneNumber, amount, accountReference, narrative, leaseId } = req.body;
    const agencyId = req.user.agencyId;

    try {
      const result = await initiateKcbStkPush(phoneNumber, amount, accountReference, narrative);

      // Link to lease if provided
      if (leaseId && result.data.transactionRef) {
        await linkKcbTransactionToLease(result.data.transactionRef, leaseId, agencyId);
      }

      auditLog('KCB_STK_PUSH_INITIATED', req.user.userId, {
        phoneNumber,
        amount,
        gateway: 'KCB_BUNI',
      });

      return successResponse(res, result.data, 200, {
        message: result.message,
      });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * POST /kcb/mpesa-callback
 * KCB M-Pesa STK Push callback
 * Uses optimized callback processor with idempotent handling
 */
kcbRouter.post('/mpesa-callback', asyncHandler(async (req, res) => {
  try {
    logger.info('KCB M-Pesa callback received');
    const result = await processOptimizedKcbCallback(req.body);
    return res.status(200).json({ 
      status: 'success',
      duplicate: result.duplicate || false
    });
  } catch (error) {
    logger.error('Error processing KCB callback:', error);
    return res.status(200).json({ status: 'error', message: error.message });
  }
}));

/**
 * GET /kcb/status/:transactionRef
 * Get transaction status
 */
kcbRouter.get(
  '/status/:transactionRef',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { transactionRef } = req.params;

    const status = await getKcbTransactionStatus(transactionRef);

    if (!status) {
      return errorResponse(res, 'Transaction not found', 404);
    }

    return successResponse(res, status);
  })
);

// ==================== ACCOUNT STATEMENT ====================

/**
 * POST /kcb/statement
 * Get account statement
 */
kcbRouter.post(
  '/statement',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return errorResponse(res, 'Start date and end date required', 400);
    }

    try {
      const result = await getAccountStatement(new Date(startDate), new Date(endDate));

      auditLog('KCB_STATEMENT_REQUESTED', req.user.userId, {
        startDate,
        endDate,
      });

      return successResponse(res, result.data);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

/**
 * GET /kcb/balance
 * Get latest account balance
 */
kcbRouter.get(
  '/balance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const balance = await getKcbAccountBalance();

    if (!balance) {
      return errorResponse(res, 'No balance data available. Request statement first.', 404);
    }

    return successResponse(res, balance);
  })
);

// ==================== SEND TO BANK ====================

/**
 * POST /kcb/send-to-bank
 * Send money to another bank
 */
kcbRouter.post(
  '/send-to-bank',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { destinationBank, accountNumber, accountName, amount, narrative } = req.body;

    if (!destinationBank || !accountNumber || !accountName || !amount) {
      return errorResponse(res, 'All fields required', 400);
    }

    try {
      const result = await sendToBank(destinationBank, accountNumber, accountName, amount, narrative);

      auditLog('KCB_SEND_TO_BANK', req.user.userId, {
        destinationBank,
        amount,
      });

      return successResponse(res, result.data, 200, {
        message: result.message,
      });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

// ==================== BANK TO BANK ====================

/**
 * POST /kcb/bank-to-bank
 * Transfer between KCB accounts
 */
kcbRouter.post(
  '/bank-to-bank',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { destinationAccount, accountName, amount, narrative } = req.body;

    if (!destinationAccount || !accountName || !amount) {
      return errorResponse(res, 'All fields required', 400);
    }

    try {
      const result = await bankToBank(destinationAccount, accountName, amount, narrative);

      auditLog('KCB_BANK_TO_BANK', req.user.userId, {
        destinationAccount,
        amount,
      });

      return successResponse(res, result.data, 200, {
        message: result.message,
      });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

// ==================== PESALINK ====================

/**
 * POST /kcb/pesalink
 * Send via PesaLink
 */
kcbRouter.post(
  '/pesalink',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { mobileNumber, destinationBank, amount, narrative } = req.body;

    if (!mobileNumber || !destinationBank || !amount) {
      return errorResponse(res, 'Mobile number, bank, and amount required', 400);
    }

    try {
      const result = await sendViaPesaLink(mobileNumber, destinationBank, amount, narrative);

      auditLog('KCB_PESALINK', req.user.userId, {
        mobileNumber,
        amount,
      });

      return successResponse(res, result.data, 200, {
        message: result.message,
      });
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  })
);

// ==================== CALLBACKS ====================

/**
 * POST /kcb/transfer-callback
 * Send to Bank callback
 */
kcbRouter.post('/transfer-callback', asyncHandler(async (req, res) => {
  logger.info('KCB send to bank callback received');
  await processKcbTransferCallback(req.body);
  return res.status(200).json({ status: 'success' });
}));

/**
 * POST /kcb/internal-transfer-callback
 * Bank to Bank callback
 */
kcbRouter.post('/internal-transfer-callback', asyncHandler(async (req, res) => {
  logger.info('KCB bank to bank callback received');
  await processKcbTransferCallback(req.body);
  return res.status(200).json({ status: 'success' });
}));

/**
 * POST /kcb/pesalink-callback
 * PesaLink callback
 */
kcbRouter.post('/pesalink-callback', asyncHandler(async (req, res) => {
  logger.info('KCB PesaLink callback received');
  await processKcbTransferCallback(req.body);
  return res.status(200).json({ status: 'success' });
}));

// ==================== TRANSACTIONS ====================

/**
 * GET /kcb/transactions
 * Get all KCB transactions
 */
kcbRouter.get(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const agencyId = req.user.agencyId;
    const { type, status } = req.query;

    const where = { agencyId };
    if (type) where.type = type;
    if (status) where.status = status;

    const transactions = await prisma.kcbTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lease: {
          include: {
            tenant: true,
          },
        },
      },
    });

    return successResponse(res, transactions);
  })
);

/**
 * GET /kcb/bank-codes
 * Get Kenya bank codes
 */
kcbRouter.get('/bank-codes', requireAuth, asyncHandler(async (req, res) => {
  return successResponse(res, KENYA_BANK_CODES);
}));
