import { prisma } from '../db.js';
import logger from '../utils/logger.js';
import { initiateb2c } from './mpesa.js';
import { sendToBank } from './kcbBuni.js';

/**
 * Security Deposit Management Service
 * Track, refund, and manage security deposits
 */

/**
 * Record security deposit
 */
export async function recordDeposit(leaseId, amount, paymentMethod, referenceNumber) {
  const deposit = await prisma.securityDeposit.create({
    data: {
      leaseId,
      amount,
      paidAt: new Date(),
      paymentMethod,
      paymentReference: referenceNumber,
      status: 'HELD',
    },
  });

  logger.info('Security deposit recorded:', {
    leaseId,
    amount,
  });

  return deposit;
}

/**
 * Initiate deposit refund
 */
export async function initiateDepositRefund(depositId, deductions = [], refundMethod, recipientDetails) {
  const deposit = await prisma.securityDeposit.findUnique({
    where: { id: depositId },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
        },
      },
    },
  });

  if (!deposit) {
    throw new Error('Deposit not found');
  }

  if (deposit.status !== 'HELD') {
    throw new Error('Deposit already processed');
  }

  // Calculate total deductions
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = deposit.amount - totalDeductions;

  if (refundAmount < 0) {
    throw new Error('Deductions exceed deposit amount');
  }

  // Create refund request
  const refundRequest = await prisma.depositRefund.create({
    data: {
      depositId,
      totalDeductions,
      deductions: JSON.stringify(deductions),
      refundAmount,
      refundMethod,
      recipientPhone: recipientDetails.phone,
      recipientAccount: recipientDetails.account,
      recipientBank: recipientDetails.bank,
      status: 'PENDING_APPROVAL',
    },
  });

  logger.info('Deposit refund initiated:', {
    depositId,
    refundAmount,
    deductions: totalDeductions,
  });

  return refundRequest;
}

/**
 * Approve deposit refund
 */
export async function approveDepositRefund(refundId, approverId, notes = null) {
  const refund = await prisma.depositRefund.update({
    where: { id: refundId },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
      approvalNotes: notes,
    },
    include: {
      deposit: {
        include: {
          lease: {
            include: {
              tenant: true,
            },
          },
        },
      },
    },
  });

  logger.info('Deposit refund approved:', {
    refundId,
    amount: refund.refundAmount,
  });

  return refund;
}

/**
 * Process approved refund (send money)
 */
export async function processDepositRefund(refundId) {
  const refund = await prisma.depositRefund.findUnique({
    where: { id: refundId },
    include: {
      deposit: {
        include: {
          lease: {
            include: {
              tenant: true,
            },
          },
        },
      },
    },
  });

  if (!refund || refund.status !== 'APPROVED') {
    throw new Error('Refund not approved');
  }

  let transactionResult;

  try {
    if (refund.refundMethod === 'MPESA') {
      // Send via M-Pesa B2C
      transactionResult = await initiateb2c(
        refund.recipientPhone,
        refund.refundAmount,
        `Security deposit refund - ${refund.deposit.lease.tenant.name}`,
        'Refund'
      );
    } else if (refund.refundMethod === 'BANK') {
      // Send via bank transfer
      transactionResult = await sendToBank(
        refund.recipientBank,
        refund.recipientAccount,
        refund.deposit.lease.tenant.name,
        refund.refundAmount,
        'Security deposit refund'
      );
    }

    // Update status
    await prisma.depositRefund.update({
      where: { id: refundId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        transactionReference: transactionResult?.data?.transactionId,
      },
    });

    // Update deposit status
    await prisma.securityDeposit.update({
      where: { id: refund.depositId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: refund.refundAmount,
      },
    });

    logger.info('Deposit refund processed:', {
      refundId,
      method: refund.refundMethod,
    });

    return { success: true, refund };
  } catch (error) {
    logger.error('Failed to process deposit refund:', error);
    
    // Mark as failed
    await prisma.depositRefund.update({
      where: { id: refundId },
      data: { status: 'FAILED', processedAt: new Date() },
    });

    throw error;
  }
}

/**
 * Get deposit refund status
 */
export async function getDepositRefundStatus(depositId) {
  const deposit = await prisma.securityDeposit.findUnique({
    where: { id: depositId },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
        },
      },
      refunds: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return deposit;
}
