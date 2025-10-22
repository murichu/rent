import { prisma } from "../db.js";
import { logger } from "../utils/logger.js";
import { computeTenantRating } from "./rating.js";
import { processConcurrentMpesaCallback } from "./paymentConcurrencyHandler.js";

/**
 * Payment Callback Optimizer Service
 * Implements idempotent callback handling, retry logic, and performance metrics
 */

// Callback processing metrics
const callbackMetrics = {
  totalProcessed: 0,
  successCount: 0,
  failureCount: 0,
  duplicateCount: 0,
  averageProcessingTime: 0,
  processingTimes: []
};

/**
 * Process M-Pesa callback with optimizations
 * Implements idempotent handling and retry logic
 */
export async function processOptimizedMpesaCallback(callbackData) {
  const startTime = Date.now();
  const callbackId = generateCallbackId(callbackData);
  
  try {
    logger.info('Processing optimized M-Pesa callback:', { 
      callbackId,
      timestamp: new Date().toISOString()
    });

    // Extract callback data
    const { Body } = callbackData;
    const { stkCallback } = Body;
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    // Idempotent check - prevent duplicate processing
    const existingCallback = await checkCallbackProcessed(CheckoutRequestID, callbackId);
    if (existingCallback) {
      logger.info('Callback already processed (idempotent):', { 
        checkoutRequestId: CheckoutRequestID,
        callbackId 
      });
      callbackMetrics.duplicateCount++;
      return { success: true, message: 'Already processed', duplicate: true };
    }

    // Find transaction with optimistic locking
    const transaction = await findTransactionWithLock(CheckoutRequestID);
    if (!transaction) {
      throw new Error(`Transaction not found for CheckoutRequestID: ${CheckoutRequestID}`);
    }

    // Use concurrency handler for callback processing
    const concurrentResult = await processConcurrentMpesaCallback(CheckoutRequestID, callbackData);
    
    // Log callback processing for idempotency
    await prisma.callbackLog.create({
      data: {
        callbackId,
        checkoutRequestId: CheckoutRequestID,
        type: concurrentResult.success ? 'MPESA_SUCCESS' : 'MPESA_FAILED',
        processed: true,
        metadata: JSON.stringify(stkCallback)
      }
    });

    const result = concurrentResult;

    // Record processing metrics
    const processingTime = Date.now() - startTime;
    recordCallbackMetrics(processingTime, true);

    logger.info('M-Pesa callback processed successfully:', {
      checkoutRequestId: CheckoutRequestID,
      processingTime: `${processingTime}ms`,
      result: result.success ? 'success' : 'failed'
    });

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    recordCallbackMetrics(processingTime, false);
    
    logger.error('Error processing M-Pesa callback:', {
      error: error.message,
      callbackId,
      processingTime: `${processingTime}ms`,
      stack: error.stack
    });

    // Implement retry logic for transient failures
    if (isRetryableError(error)) {
      await scheduleCallbackRetry(callbackData, callbackId);
    }

    throw error;
  }
}

/**
 * Process KCB M-Pesa callback with optimizations
 */
export async function processOptimizedKcbCallback(callbackData) {
  const startTime = Date.now();
  const callbackId = generateCallbackId(callbackData);
  
  try {
    logger.info('Processing optimized KCB callback:', { 
      callbackId,
      timestamp: new Date().toISOString()
    });

    const { transactionRef, resultCode, resultDesc, mpesaReceiptNumber } = callbackData;

    // Idempotent check
    const existingCallback = await checkKcbCallbackProcessed(transactionRef, callbackId);
    if (existingCallback) {
      logger.info('KCB callback already processed (idempotent):', { 
        transactionRef,
        callbackId 
      });
      callbackMetrics.duplicateCount++;
      return { success: true, message: 'Already processed', duplicate: true };
    }

    // Find KCB transaction with optimistic locking
    const transaction = await findKcbTransactionWithLock(transactionRef);
    if (!transaction) {
      throw new Error(`KCB transaction not found for ref: ${transactionRef}`);
    }

    // Process callback
    let result;
    if (resultCode === '0' || resultCode === 0) {
      result = await processSuccessfulKcbCallback(transaction, callbackData, callbackId);
    } else {
      result = await processFailedKcbCallback(transaction, callbackData, callbackId);
    }

    // Record metrics
    const processingTime = Date.now() - startTime;
    recordCallbackMetrics(processingTime, true);

    logger.info('KCB callback processed successfully:', {
      transactionRef,
      processingTime: `${processingTime}ms`,
      result: result.success ? 'success' : 'failed'
    });

    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    recordCallbackMetrics(processingTime, false);
    
    logger.error('Error processing KCB callback:', {
      error: error.message,
      callbackId,
      processingTime: `${processingTime}ms`,
      stack: error.stack
    });

    if (isRetryableError(error)) {
      await scheduleKcbCallbackRetry(callbackData, callbackId);
    }

    throw error;
  }
}

/**
 * Generate unique callback ID for idempotent processing
 */
function generateCallbackId(callbackData) {
  const dataString = JSON.stringify(callbackData);
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(dataString).digest('hex').substring(0, 16);
}

/**
 * Check if M-Pesa callback has already been processed
 */
async function checkCallbackProcessed(checkoutRequestId, callbackId) {
  return await prisma.callbackLog.findFirst({
    where: {
      checkoutRequestId,
      callbackId,
      processed: true
    }
  });
}

/**
 * Check if KCB callback has already been processed
 */
async function checkKcbCallbackProcessed(transactionRef, callbackId) {
  return await prisma.callbackLog.findFirst({
    where: {
      transactionRef,
      callbackId,
      processed: true
    }
  });
}

/**
 * Find M-Pesa transaction with optimistic locking
 */
async function findTransactionWithLock(checkoutRequestId) {
  return await prisma.mpesaTransaction.findFirst({
    where: { 
      checkoutRequestId,
      status: { in: ['PENDING', 'PROCESSING'] } // Only process pending transactions
    },
    include: {
      lease: {
        include: {
          tenant: { select: { id: true, name: true } },
          property: { select: { title: true } }
        }
      }
    }
  });
}

/**
 * Find KCB transaction with optimistic locking
 */
async function findKcbTransactionWithLock(transactionRef) {
  return await prisma.kcbTransaction.findFirst({
    where: { 
      transactionRef,
      status: { in: ['PENDING', 'PROCESSING'] }
    },
    include: {
      lease: {
        include: {
          tenant: { select: { id: true, name: true } },
          property: { select: { title: true } }
        }
      }
    }
  });
}

/**
 * Process successful M-Pesa callback
 */
async function processSuccessfulCallback(transaction, stkCallback, callbackId) {
  const { CallbackMetadata, CheckoutRequestID } = stkCallback;
  const metadata = CallbackMetadata?.Item || [];
  
  const mpesaReceiptNumber = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
  const transactionDate = metadata.find((item) => item.Name === 'TransactionDate')?.Value;
  const phoneNumber = metadata.find((item) => item.Name === 'PhoneNumber')?.Value;
  const amount = metadata.find((item) => item.Name === 'Amount')?.Value;

  return await prisma.$transaction(async (tx) => {
    // Update M-Pesa transaction
    await tx.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        resultCode: '0',
        resultDescription: 'Success',
        mpesaReceiptNumber,
        transactionDate: transactionDate ? new Date(transactionDate.toString()) : null,
        completedAt: new Date(),
      }
    });

    // Create payment record if lease is linked
    let paymentId = null;
    if (transaction.leaseId) {
      const payment = await tx.payment.create({
        data: {
          leaseId: transaction.leaseId,
          agencyId: transaction.agencyId,
          amount: transaction.amount,
          paidAt: new Date(),
          method: 'MPESA_C2B',
          referenceNumber: mpesaReceiptNumber,
          notes: `M-Pesa payment from ${phoneNumber}`,
        }
      });
      paymentId = payment.id;

      // Update tenant rating asynchronously (non-blocking)
      if (transaction.lease?.tenant?.id) {
        setImmediate(() => {
          computeTenantRating(transaction.lease.tenant.id).catch(error => {
            logger.error('Failed to update tenant rating:', error);
          });
        });
      }
    }

    // Log callback processing
    await tx.callbackLog.create({
      data: {
        callbackId,
        checkoutRequestId: CheckoutRequestID,
        type: 'MPESA_SUCCESS',
        processed: true,
        paymentId,
        processingTime: Date.now() - Date.now(), // Will be updated by caller
        metadata: JSON.stringify({ mpesaReceiptNumber, amount, phoneNumber })
      }
    });

    return {
      success: true,
      message: 'Payment processed successfully',
      receiptNumber: mpesaReceiptNumber,
      paymentId
    };
  });
}

/**
 * Process failed M-Pesa callback
 */
async function processFailedCallback(transaction, stkCallback, callbackId) {
  const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

  return await prisma.$transaction(async (tx) => {
    // Update M-Pesa transaction
    await tx.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        resultCode: ResultCode.toString(),
        resultDescription: ResultDesc,
        completedAt: new Date(),
      }
    });

    // Log callback processing
    await tx.callbackLog.create({
      data: {
        callbackId,
        checkoutRequestId: CheckoutRequestID,
        type: 'MPESA_FAILED',
        processed: true,
        metadata: JSON.stringify({ resultCode: ResultCode, resultDesc: ResultDesc })
      }
    });

    return {
      success: false,
      message: 'Payment failed',
      error: ResultDesc
    };
  });
}

/**
 * Process successful KCB callback
 */
async function processSuccessfulKcbCallback(transaction, callbackData, callbackId) {
  const { transactionRef, mpesaReceiptNumber, transactionDate, phoneNumber } = callbackData;

  return await prisma.$transaction(async (tx) => {
    // Update KCB transaction
    await tx.kcbTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        resultCode: '0',
        resultDescription: 'Success',
        mpesaReceiptNumber,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        completedAt: new Date(),
      }
    });

    // Create payment record if lease is linked
    let paymentId = null;
    if (transaction.leaseId) {
      const payment = await tx.payment.create({
        data: {
          leaseId: transaction.leaseId,
          agencyId: transaction.agencyId,
          amount: transaction.amount,
          paidAt: new Date(),
          method: 'MPESA_C2B',
          referenceNumber: mpesaReceiptNumber,
          notes: `KCB M-Pesa payment from ${phoneNumber}`,
        }
      });
      paymentId = payment.id;

      // Update tenant rating asynchronously
      if (transaction.lease?.tenant?.id) {
        setImmediate(() => {
          computeTenantRating(transaction.lease.tenant.id).catch(error => {
            logger.error('Failed to update tenant rating:', error);
          });
        });
      }
    }

    // Log callback processing
    await tx.callbackLog.create({
      data: {
        callbackId,
        transactionRef,
        type: 'KCB_SUCCESS',
        processed: true,
        paymentId,
        metadata: JSON.stringify({ mpesaReceiptNumber, phoneNumber })
      }
    });

    return {
      success: true,
      message: 'KCB payment processed successfully',
      receiptNumber: mpesaReceiptNumber,
      paymentId
    };
  });
}

/**
 * Process failed KCB callback
 */
async function processFailedKcbCallback(transaction, callbackData, callbackId) {
  const { transactionRef, resultCode, resultDesc } = callbackData;

  return await prisma.$transaction(async (tx) => {
    // Update KCB transaction
    await tx.kcbTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'FAILED',
        resultCode: resultCode?.toString(),
        resultDescription: resultDesc,
        completedAt: new Date(),
      }
    });

    // Log callback processing
    await tx.callbackLog.create({
      data: {
        callbackId,
        transactionRef,
        type: 'KCB_FAILED',
        processed: true,
        metadata: JSON.stringify({ resultCode, resultDesc })
      }
    });

    return {
      success: false,
      message: 'KCB payment failed',
      error: resultDesc
    };
  });
}

/**
 * Record callback processing metrics
 */
function recordCallbackMetrics(processingTime, success) {
  callbackMetrics.totalProcessed++;
  
  if (success) {
    callbackMetrics.successCount++;
  } else {
    callbackMetrics.failureCount++;
  }

  // Track processing times for average calculation
  callbackMetrics.processingTimes.push(processingTime);
  
  // Keep only last 100 processing times to prevent memory issues
  if (callbackMetrics.processingTimes.length > 100) {
    callbackMetrics.processingTimes.shift();
  }

  // Calculate average processing time
  const sum = callbackMetrics.processingTimes.reduce((a, b) => a + b, 0);
  callbackMetrics.averageProcessingTime = Math.round(sum / callbackMetrics.processingTimes.length);

  // Log metrics every 10 callbacks
  if (callbackMetrics.totalProcessed % 10 === 0) {
    logger.info('Callback processing metrics:', {
      total: callbackMetrics.totalProcessed,
      success: callbackMetrics.successCount,
      failures: callbackMetrics.failureCount,
      duplicates: callbackMetrics.duplicateCount,
      averageTime: `${callbackMetrics.averageProcessingTime}ms`,
      successRate: `${((callbackMetrics.successCount / callbackMetrics.totalProcessed) * 100).toFixed(1)}%`
    });
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  const retryableErrors = [
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'Database connection',
    'Transaction timeout'
  ];

  return retryableErrors.some(retryableError => 
    error.message.includes(retryableError) || error.code === retryableError
  );
}

/**
 * Schedule callback retry with exponential backoff
 */
async function scheduleCallbackRetry(callbackData, callbackId, attempt = 1) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  if (attempt > maxRetries) {
    logger.error('Max callback retries exceeded:', { callbackId, attempt });
    return;
  }

  const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
  
  logger.info('Scheduling callback retry:', { 
    callbackId, 
    attempt, 
    delay: `${delay}ms` 
  });

  setTimeout(async () => {
    try {
      await processOptimizedMpesaCallback(callbackData);
      logger.info('Callback retry successful:', { callbackId, attempt });
    } catch (error) {
      logger.error('Callback retry failed:', { callbackId, attempt, error: error.message });
      await scheduleCallbackRetry(callbackData, callbackId, attempt + 1);
    }
  }, delay);
}

/**
 * Schedule KCB callback retry
 */
async function scheduleKcbCallbackRetry(callbackData, callbackId, attempt = 1) {
  const maxRetries = 3;
  const baseDelay = 1000;
  
  if (attempt > maxRetries) {
    logger.error('Max KCB callback retries exceeded:', { callbackId, attempt });
    return;
  }

  const delay = baseDelay * Math.pow(2, attempt - 1);
  
  logger.info('Scheduling KCB callback retry:', { 
    callbackId, 
    attempt, 
    delay: `${delay}ms` 
  });

  setTimeout(async () => {
    try {
      await processOptimizedKcbCallback(callbackData);
      logger.info('KCB callback retry successful:', { callbackId, attempt });
    } catch (error) {
      logger.error('KCB callback retry failed:', { callbackId, attempt, error: error.message });
      await scheduleKcbCallbackRetry(callbackData, callbackId, attempt + 1);
    }
  }, delay);
}

/**
 * Get callback processing metrics
 */
export function getCallbackMetrics() {
  return {
    ...callbackMetrics,
    successRate: callbackMetrics.totalProcessed > 0 
      ? ((callbackMetrics.successCount / callbackMetrics.totalProcessed) * 100).toFixed(1) + '%'
      : '0%'
  };
}

/**
 * Reset callback metrics (for testing)
 */
export function resetCallbackMetrics() {
  callbackMetrics.totalProcessed = 0;
  callbackMetrics.successCount = 0;
  callbackMetrics.failureCount = 0;
  callbackMetrics.duplicateCount = 0;
  callbackMetrics.averageProcessingTime = 0;
  callbackMetrics.processingTimes = [];
}