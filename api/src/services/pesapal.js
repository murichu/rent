import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { prisma } from '../db.js';
import { pesapalCircuitBreaker } from './circuitBreaker.js';

/**
 * Pesapal Payment Integration (Kenya)
 * Supports Visa, Mastercard, and other payment methods
 * Fees charged to customer
 */

const PESAPAL_CONFIG = {
  consumerKey: process.env.PESAPAL_CONSUMER_KEY,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
  environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox',
  ipnUrl: `${process.env.BACKEND_URL}/api/v1/pesapal/ipn`,
};

const getBaseUrl = () => {
  return PESAPAL_CONFIG.environment === 'production'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';
};

/**
 * Get OAuth access token with circuit breaker protection
 */
export async function getPesapalAccessToken() {
  return await pesapalCircuitBreaker.execute(async () => {
    const response = await axios.post(
      `${getBaseUrl()}/api/Auth/RequestToken`,
      {
        consumer_key: PESAPAL_CONFIG.consumerKey,
        consumer_secret: PESAPAL_CONFIG.consumerSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
      }
    );

    logger.info('Pesapal access token generated');
    return response.data.token;
  });
}

/**
 * Calculate Pesapal fees
 * Pesapal charges: 3.5% + KES 50 for cards in Kenya
 */
export function calculatePesapalFees(amount) {
  const percentageFee = amount * 0.035; // 3.5%
  const fixedFee = 50; // KES 50
  const totalFees = Math.ceil(percentageFee + fixedFee);
  const totalAmount = amount + totalFees;

  return {
    baseAmount: amount,
    fees: totalFees,
    totalAmount,
    breakdown: {
      percentageFee: Math.ceil(percentageFee),
      fixedFee,
    },
  };
}

/**
 * Register IPN URL (one-time setup) with circuit breaker protection
 */
export async function registerPesapalIPN() {
  return await pesapalCircuitBreaker.execute(async () => {
    const token = await getPesapalAccessToken();

    const response = await axios.post(
      `${getBaseUrl()}/api/URLSetup/RegisterIPN`,
      {
        url: PESAPAL_CONFIG.ipnUrl,
        ipn_notification_type: 'GET',
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
      }
    );

    logger.info('Pesapal IPN registered:', response.data);
    return response.data;
  });
}

/**
 * Submit order request
 */
export async function initiatePesapalPayment(orderData) {
  const {
    amount,
    currency = 'KES',
    description,
    callbackUrl,
    leaseId,
    agencyId,
    customerEmail,
    customerPhone,
    customerName,
  } = orderData;

  try {
    const token = await getPesapalAccessToken();
    
    // Calculate total with fees
    const pricing = calculatePesapalFees(amount);
    const merchantReference = `HAVEN-${Date.now()}`;

    const requestData = {
      id: merchantReference,
      currency,
      amount: pricing.totalAmount, // Amount PLUS fees
      description: description || 'Rent Payment',
      callback_url: callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
      notification_id: process.env.PESAPAL_IPN_ID, // From IPN registration
      billing_address: {
        email_address: customerEmail,
        phone_number: customerPhone,
        first_name: customerName?.split(' ')[0] || 'Tenant',
        last_name: customerName?.split(' ').slice(1).join(' ') || '',
      },
    };

    logger.info('Initiating Pesapal payment:', {
      merchantReference,
      baseAmount: amount,
      fees: pricing.fees,
      totalAmount: pricing.totalAmount,
    });

    const response = await pesapalCircuitBreaker.execute(async () => {
      return await axios.post(
        `${getBaseUrl()}/api/Transactions/SubmitOrderRequest`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store transaction
    await prisma.pesapalTransaction.create({
      data: {
        merchantReference,
        orderTrackingId: response.data.order_tracking_id,
        baseAmount: amount,
        pesapalFees: pricing.fees,
        totalAmount: pricing.totalAmount,
        currency,
        description,
        customerEmail,
        customerPhone,
        customerName,
        status: 'PENDING',
        leaseId,
        agencyId,
      },
    });

    logger.info('Pesapal order created:', {
      orderTrackingId: response.data.order_tracking_id,
      redirectUrl: response.data.redirect_url,
    });

    return {
      success: true,
      orderTrackingId: response.data.order_tracking_id,
      merchantReference,
      redirectUrl: response.data.redirect_url,
      pricing,
    };
  } catch (error) {
    logger.error('Pesapal payment failed:', error.response?.data || error.message);
    throw new Error('Failed to initiate Pesapal payment');
  }
}

/**
 * Get transaction status
 */
export async function getPesapalTransactionStatus(orderTrackingId) {
  try {
    const token = await getPesapalAccessToken();

    const response = await pesapalCircuitBreaker.execute(async () => {
      return await axios.get(
        `${getBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    logger.info('Pesapal status retrieved:', {
      orderTrackingId,
      status: response.data.payment_status_description,
    });

    return {
      status: response.data.payment_status_description,
      paymentMethod: response.data.payment_method,
      amount: response.data.amount,
      currency: response.data.currency,
      merchantReference: response.data.merchant_reference,
      confirmedAt: response.data.created_date,
    };
  } catch (error) {
    logger.error('Failed to get Pesapal status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Handle IPN notification
 */
export async function handlePesapalIPN(orderTrackingId, merchantReference) {
  try {
    // Get transaction status from Pesapal
    const status = await getPesapalTransactionStatus(orderTrackingId);

    // Find transaction in database
    const transaction = await prisma.pesapalTransaction.findFirst({
      where: { orderTrackingId },
    });

    if (!transaction) {
      logger.error('Pesapal transaction not found:', orderTrackingId);
      return { success: false };
    }

    // Update transaction status
    if (status.status === 'Completed' || status.status === 'COMPLETED') {
      await prisma.pesapalTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          paymentMethod: status.paymentMethod,
          confirmedAt: new Date(status.confirmedAt),
        },
      });

      // Create payment record
      if (transaction.leaseId) {
        await prisma.payment.create({
          data: {
            leaseId: transaction.leaseId,
            agencyId: transaction.agencyId,
            amount: transaction.baseAmount, // Only base amount (fees excluded from rent)
            paidAt: new Date(),
            method: 'PESAPAL',
            referenceNumber: merchantReference,
            notes: `Card payment via Pesapal (${status.paymentMethod}). Fees: KES ${transaction.pesapalFees}`,
          },
        });

        logger.info('Payment record created for Pesapal transaction');
      }

      logger.info('Pesapal payment completed successfully');
    } else if (status.status === 'Failed' || status.status === 'FAILED') {
      await prisma.pesapalTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          confirmedAt: new Date(),
        },
      });

      logger.warn('Pesapal payment failed');
    }

    return { success: true, status: status.status };
  } catch (error) {
    logger.error('Error processing Pesapal IPN:', error);
    throw error;
  }
}

/**
 * Get detailed transaction status with user message
 */
export async function getDetailedPesapalStatus(merchantReference) {
  const transaction = await prisma.pesapalTransaction.findFirst({
    where: { merchantReference },
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
    return null;
  }

  const statusMessages = {
    PENDING: 'Payment is being processed',
    SUCCESS: 'Payment completed successfully',
    FAILED: 'Payment failed. Please try again.',
    CANCELLED: 'Payment was cancelled',
  };

  return {
    ...transaction,
    userMessage: statusMessages[transaction.status] || 'Processing payment...',
    statusIcon: transaction.status === 'SUCCESS' ? '✅' : transaction.status === 'FAILED' ? '❌' : '⏳',
  };
}
