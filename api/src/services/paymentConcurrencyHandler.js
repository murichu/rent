import { prisma } from "../db.js";
import { logger } from "../utils/logger.js";

/**
 * Payment Concurrency Handler Service
 * Implements database locks, transaction isolation, and race condition handling
 */

// In-memory lock registry for payment processing
const paymentLocks = new Map();
const lockTimeouts = new Map();

/**
 * Process payment with concurrency control
 * Implements optimistic locking and race condition prevention
 */
export async function processPaymentWithLock(paymentData, options = {}) {
  const { leaseId, invoiceId, amount, method, referenceNumber } = paymentData;
  const lockKey = invoiceId || `lease_${leaseId}`;
  const lockTimeout = options.lockTimeout || 30000; // 30 seconds default
  
  // Acquire lock for this payment/invoice
  const lockAcquired = await acquirePaymentLock(lockKey, lockTimeout);
  if (!lockAcquired) {
    throw new Error(`Payment processing already in progress for ${lockKey}`);
  }

  try {
    logger.info('Processing payment with concurrency control:', {
      lockKey,
      amount,
      method,
      referenceNumber
    });

    // Use serializable transaction isolation for payment processing
    const result = await prisma.$transaction(async (tx) => {
      // Check for duplicate payments with same reference number
      if (referenceNumber) {
        const existingPayment = await tx.payment.findFirst({
          where: {
            referenceNumber,
            agencyId: paymentData.agencyId
          }
        });

        if (existingPayment) {
          throw new Error(`Duplicate payment with reference ${referenceNumber}`);
        }
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: paymentData,
        include: {
          lease: {
            include: {
              tenant: { select: { id: true, name: true } },
              property: { select: { title: true } }
            }
          },
          invoice: {
            select: {
              id: true,
              amount: true,
              status: true,
              totalPaid: true
            }
          }
        }
      });

      // Update invoice status if invoice is linked
      if (invoiceId) {
        const updatedInvoice = await updateInvoiceWithLock(tx, invoiceId, amount);
        payment.invoice = updatedInvoice;
      }

      return payment;
    }, {
      isolationLevel: 'Serializable', // Highest isolation level
      timeout: 20000 // 20 second timeout
    });

    logger.info('Payment processed successfully with concurrency control:', {
      paymentId: result.id,
      lockKey,
      amount: result.amount
    });

    return result;

  } finally {
    // Always release the lock
    releasePaymentLock(lockKey);
  }
}

/**
 * Update invoice with optimistic locking
 */
async function updateInvoiceWithLock(tx, invoiceId, paymentAmount) {
  // Get current invoice with version for optimistic locking
  const currentInvoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      amount: true,
      totalPaid: true,
      status: true,
      updatedAt: true
    }
  });

  if (!currentInvoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  // Calculate new total paid and status
  const newTotalPaid = (currentInvoice.totalPaid || 0) + paymentAmount;
  let newStatus = "PENDING";
  
  if (newTotalPaid > 0 && newTotalPaid < currentInvoice.amount) {
    newStatus = "PARTIAL";
  } else if (newTotalPaid >= currentInvoice.amount) {
    newStatus = "PAID";
  }

  // Update invoice with optimistic locking check
  try {
    const updatedInvoice = await tx.invoice.update({
      where: {
        id: invoiceId,
        updatedAt: currentInvoice.updatedAt // Optimistic locking
      },
      data: {
        totalPaid: newTotalPaid,
        status: newStatus,
        updatedAt: new Date()
      },
      select: {
        id: true,
        amount: true,
        totalPaid: true,
        status: true
      }
    });

    logger.info('Invoice updated with optimistic locking:', {
      invoiceId,
      oldStatus: currentInvoice.status,
      newStatus,
      oldTotalPaid: currentInvoice.totalPaid,
      newTotalPaid
    });

    return updatedInvoice;

  } catch (error) {
    if (error.code === 'P2025') { // Record not found (optimistic lock failed)
      throw new Error('Invoice was modified by another process. Please retry.');
    }
    throw error;
  }
}

/**
 * Process multiple payments concurrently with proper isolation
 */
export async function processBatchPayments(paymentsData, options = {}) {
  const batchSize = options.batchSize || 10;
  const results = [];
  const errors = [];

  // Process payments in batches to avoid overwhelming the database
  for (let i = 0; i < paymentsData.length; i += batchSize) {
    const batch = paymentsData.slice(i, i + batchSize);
    
    logger.info(`Processing payment batch ${Math.floor(i / batchSize) + 1}:`, {
      batchSize: batch.length,
      totalBatches: Math.ceil(paymentsData.length / batchSize)
    });

    // Process batch concurrently
    const batchPromises = batch.map(async (paymentData, index) => {
      try {
        const result = await processPaymentWithLock(paymentData, options);
        return { success: true, index: i + index, result };
      } catch (error) {
        logger.error(`Error processing payment in batch:`, {
          index: i + index,
          error: error.message,
          paymentData: { 
            leaseId: paymentData.leaseId, 
            amount: paymentData.amount,
            referenceNumber: paymentData.referenceNumber
          }
        });
        return { success: false, index: i + index, error: error.message };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    // Collect results and errors
    batchResults.forEach((result, batchIndex) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.push(result.value);
        } else {
          errors.push(result.value);
        }
      } else {
        errors.push({
          success: false,
          index: i + batchIndex,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Add delay between batches to prevent overwhelming the system
    if (i + batchSize < paymentsData.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info('Batch payment processing completed:', {
    totalPayments: paymentsData.length,
    successful: results.length,
    failed: errors.length
  });

  return {
    successful: results,
    failed: errors,
    summary: {
      total: paymentsData.length,
      successful: results.length,
      failed: errors.length,
      successRate: ((results.length / paymentsData.length) * 100).toFixed(1) + '%'
    }
  };
}

/**
 * Handle concurrent M-Pesa callback processing
 */
export async function processConcurrentMpesaCallback(checkoutRequestId, callbackData) {
  const lockKey = `mpesa_${checkoutRequestId}`;
  
  // Acquire lock for this specific transaction
  const lockAcquired = await acquirePaymentLock(lockKey, 15000); // 15 second timeout
  if (!lockAcquired) {
    logger.warn('M-Pesa callback already being processed:', { checkoutRequestId });
    return { success: true, message: 'Already processing', duplicate: true };
  }

  try {
    // Use serializable transaction for callback processing
    return await prisma.$transaction(async (tx) => {
      // Check if transaction is already processed
      const transaction = await tx.mpesaTransaction.findFirst({
        where: { 
          checkoutRequestId,
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      });

      if (!transaction) {
        // Transaction already processed or not found
        const existingTransaction = await tx.mpesaTransaction.findFirst({
          where: { checkoutRequestId }
        });
        
        if (existingTransaction) {
          logger.info('M-Pesa transaction already processed:', { 
            checkoutRequestId,
            status: existingTransaction.status 
          });
          return { success: true, message: 'Already processed', duplicate: true };
        }
        
        throw new Error(`Transaction not found: ${checkoutRequestId}`);
      }

      // Mark transaction as processing to prevent other callbacks
      await tx.mpesaTransaction.update({
        where: { id: transaction.id },
        data: { status: 'PROCESSING' }
      });

      // Process the callback data
      const { Body } = callbackData;
      const { stkCallback } = Body;
      const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

      if (ResultCode === 0) {
        // Success - extract payment details
        const metadata = CallbackMetadata?.Item || [];
        const mpesaReceiptNumber = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
        const transactionDate = metadata.find((item) => item.Name === 'TransactionDate')?.Value;
        const phoneNumber = metadata.find((item) => item.Name === 'PhoneNumber')?.Value;

        // Update transaction status
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

        // Create payment if lease is linked
        if (transaction.leaseId) {
          await tx.payment.create({
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
        }

        return {
          success: true,
          message: 'Payment processed successfully',
          receiptNumber: mpesaReceiptNumber
        };

      } else {
        // Failed transaction
        await tx.mpesaTransaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            resultCode: ResultCode.toString(),
            resultDescription: ResultDesc,
            completedAt: new Date(),
          }
        });

        return {
          success: false,
          message: 'Payment failed',
          error: ResultDesc
        };
      }

    }, {
      isolationLevel: 'Serializable',
      timeout: 15000
    });

  } finally {
    releasePaymentLock(lockKey);
  }
}

/**
 * Acquire payment processing lock
 */
async function acquirePaymentLock(lockKey, timeout = 30000) {
  const now = Date.now();
  
  // Check if lock already exists and is still valid
  if (paymentLocks.has(lockKey)) {
    const lockTime = paymentLocks.get(lockKey);
    if (now - lockTime < timeout) {
      return false; // Lock still active
    }
    // Lock expired, remove it
    paymentLocks.delete(lockKey);
    if (lockTimeouts.has(lockKey)) {
      clearTimeout(lockTimeouts.get(lockKey));
      lockTimeouts.delete(lockKey);
    }
  }

  // Acquire new lock
  paymentLocks.set(lockKey, now);
  
  // Set timeout to auto-release lock
  const timeoutId = setTimeout(() => {
    paymentLocks.delete(lockKey);
    lockTimeouts.delete(lockKey);
    logger.warn('Payment lock auto-released due to timeout:', { lockKey });
  }, timeout);
  
  lockTimeouts.set(lockKey, timeoutId);
  
  logger.debug('Payment lock acquired:', { lockKey, timeout });
  return true;
}

/**
 * Release payment processing lock
 */
function releasePaymentLock(lockKey) {
  if (paymentLocks.has(lockKey)) {
    paymentLocks.delete(lockKey);
    
    if (lockTimeouts.has(lockKey)) {
      clearTimeout(lockTimeouts.get(lockKey));
      lockTimeouts.delete(lockKey);
    }
    
    logger.debug('Payment lock released:', { lockKey });
  }
}

/**
 * Get current lock status for monitoring
 */
export function getPaymentLockStatus() {
  const now = Date.now();
  const activeLocks = [];
  
  for (const [lockKey, lockTime] of paymentLocks.entries()) {
    activeLocks.push({
      lockKey,
      acquiredAt: new Date(lockTime).toISOString(),
      ageMs: now - lockTime
    });
  }
  
  return {
    totalActiveLocks: activeLocks.length,
    locks: activeLocks
  };
}

/**
 * Test concurrent payment scenarios
 */
export async function testConcurrentPayments(testData) {
  logger.info('Starting concurrent payment test:', {
    testPayments: testData.length
  });

  const startTime = Date.now();
  
  // Create multiple concurrent payment promises
  const paymentPromises = testData.map((paymentData, index) => 
    processPaymentWithLock({
      ...paymentData,
      notes: `Concurrent test payment ${index + 1}`
    }).catch(error => ({
      error: error.message,
      index
    }))
  );

  // Execute all payments concurrently
  const results = await Promise.allSettled(paymentPromises);
  
  const endTime = Date.now();
  const duration = endTime - startTime;

  // Analyze results
  const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
  const failed = results.length - successful;
  const errors = results
    .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
    .map(r => r.status === 'rejected' ? r.reason.message : r.value.error);

  const testResults = {
    totalTests: testData.length,
    successful,
    failed,
    duration: `${duration}ms`,
    averageTime: `${Math.round(duration / testData.length)}ms`,
    successRate: `${((successful / testData.length) * 100).toFixed(1)}%`,
    errors: [...new Set(errors)] // Unique errors only
  };

  logger.info('Concurrent payment test completed:', testResults);
  return testResults;
}