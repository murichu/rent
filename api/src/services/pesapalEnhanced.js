import axios from 'axios';
import logger from '../utils/logger.js';
import { prisma } from '../db.js';
import { pesapalCircuitBreaker } from './circuitBreaker.js';

/**
 * Enhanced Pesapal Integration (Pesapal API v3)
 * Complete implementation following official docs
 */

const PESAPAL_CONFIG = {
  consumerKey: process.env.PESAPAL_CONSUMER_KEY,
  consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
  ipnUrl: `${process.env.BACKEND_URL}/api/v1/pesapal/ipn`,
  environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox',
};

const getBaseUrl = () => {
  return PESAPAL_CONFIG.environment === 'production'
    ? 'https://pay.pesapal.com/v3'
    : 'https://cybqa.pesapal.com/pesapalv3';
};

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get OAuth token (with caching)
 */
export async function getPesapalToken() {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await pesapalCircuitBreaker.execute(async () => {
      return await axios.post(
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
    });

    cachedToken = response.data.token;
    // Token expires in ~1 hour, refresh after 50 minutes
    tokenExpiry = new Date(Date.now() + 50 * 60 * 1000);

    logger.info('Pesapal token generated (cached for 50 min)');
    return cachedToken;
  } catch (error) {
    logger.error('Pesapal token generation failed:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Pesapal');
  }
}

/**
 * Register IPN URL
 */
export async function registerIPN(ipnUrl = PESAPAL_CONFIG.ipnUrl) {
  try {
    const token = await getPesapalToken();

    const response = await pesapalCircuitBreaker.execute(async () => {
      return await axios.post(
        `${getBaseUrl()}/api/URLSetup/RegisterIPN`,
        {
          url: ipnUrl,
          ipn_notification_type: 'GET',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    logger.info('Pesapal IPN registered:', {
      ipn_id: response.data.ipn_id,
      url: response.data.url,
    });

    return {
      ipnId: response.data.ipn_id,
      url: response.data.url,
      status: response.data.status,
    };
  } catch (error) {
    logger.error('IPN registration failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Calculate Pesapal fees (pass to customer)
 * Pesapal Kenya: 3.5% + KES 50
 */
export function calculatePesapalFees(baseAmount) {
  const percentageFee = Math.ceil(baseAmount * 0.035); // 3.5%
  const fixedFee = 50; // KES 50
  const totalFees = percentageFee + fixedFee;
  const totalAmount = baseAmount + totalFees;

  return {
    baseAmount, // What landlord receives
    percentageFee,
    fixedFee,
    totalFees, // What customer pays extra
    totalAmount, // Total customer pays
    feePercentage: '3.5%',
    explanation: `Pesapal processing fee: 3.5% (KES ${percentageFee}) + KES 50 = KES ${totalFees}`,
  };
}

/**
 * Submit order to Pesapal
 */
export async function submitPesapalOrder(orderData) {
  const {
    amount, // Base rent amount
    description,
    callbackUrl,
    cancellationUrl,
    leaseId,
    agencyId,
    customerEmail,
    customerPhone,
    customerFirstName,
    customerLastName,
  } = orderData;

  try {
    const token = await getPesapalToken();
    const pricing = calculatePesapalFees(amount);
    const merchantReference = `HAVEN-${Date.now()}`;

    const requestData = {
      id: merchantReference,
      currency: 'KES',
      amount: pricing.totalAmount, // Rent + Fees
      description: description || `Rent Payment - ${merchantReference}`,
      callback_url: callbackUrl || `${process.env.FRONTEND_URL}/payments/pesapal/callback`,
      cancellation_url: cancellationUrl || `${process.env.FRONTEND_URL}/payments/pesapal/cancel`,
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: customerEmail,
        phone_number: customerPhone,
        country_code: 'KE',
        first_name: customerFirstName || 'Tenant',
        last_name: customerLastName || '',
        line_1: 'Nairobi',
        line_2: '',
        city: 'Nairobi',
        state: 'Nairobi',
        postal_code: '00100',
        zip_code: '00100',
      },
    };

    logger.info('Submitting Pesapal order:', {
      merchantReference,
      baseAmount: amount,
      totalAmount: pricing.totalAmount,
      fees: pricing.totalFees,
    });

    const response = await pesapalCircuitBreaker.execute(async () => {
      return await axios.post(
        `${getBaseUrl()}/api/Transactions/SubmitOrderRequest`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store transaction in database
    await prisma.pesapalTransaction.create({
      data: {
        merchantReference,
        orderTrackingId: response.data.order_tracking_id,
        baseAmount: amount,
        pesapalFees: pricing.totalFees,
        totalAmount: pricing.totalAmount,
        currency: 'KES',
        description: requestData.description,
        customerEmail,
        customerPhone,
        customerName: `${customerFirstName} ${customerLastName}`,
        status: 'PENDING',
        leaseId,
        agencyId,
      },
    });

    logger.info('Pesapal order created:', {
      orderTrackingId: response.data.order_tracking_id,
      merchantReference,
    });

    return {
      success: true,
      orderTrackingId: response.data.order_tracking_id,
      merchantReference,
      redirectUrl: response.data.redirect_url,
      pricing,
      error: response.data.error,
    };
  } catch (error) {
    logger.error('Pesapal order submission failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to create Pesapal order');
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(orderTrackingId) {
  try {
    const token = await getPesapalToken();

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

    const data = response.data;

    logger.info('Pesapal transaction status:', {
      orderTrackingId,
      status: data.payment_status_description,
      paymentMethod: data.payment_method,
    });

    return {
      orderTrackingId: data.order_tracking_id,
      merchantReference: data.merchant_reference,
      status: data.payment_status_description, // 'Completed', 'Failed', 'Pending'
      statusCode: data.status_code,
      paymentMethod: data.payment_method,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      createdDate: data.created_date,
      confirmationCode: data.confirmation_code,
    };
  } catch (error) {
    logger.error('Failed to get Pesapal status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Process IPN notification
 */
export async function processIPNNotification(orderTrackingId, merchantReference) {
  try {
    // Get latest status from Pesapal
    const status = await getTransactionStatus(orderTrackingId);

    // Find transaction
    const transaction = await prisma.pesapalTransaction.findFirst({
      where: { orderTrackingId },
      include: {
        lease: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!transaction) {
      logger.error('Transaction not found:', orderTrackingId);
      return { success: false };
    }

    // Update based on status
    if (status.status === 'Completed' || status.status === 'COMPLETED') {
      await prisma.pesapalTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          paymentMethod: status.paymentMethod,
          confirmationCode: status.confirmationCode,
          confirmedAt: new Date(),
        },
      });

      // Create payment record (ONLY base amount, not fees)
      if (transaction.leaseId) {
        await prisma.payment.create({
          data: {
            leaseId: transaction.leaseId,
            agencyId: transaction.agencyId,
            amount: transaction.baseAmount, // Rent only, no fees
            paidAt: new Date(),
            method: 'PESAPAL',
            referenceNumber: status.confirmationCode || merchantReference,
            notes: `Card payment via Pesapal. Total paid by tenant: KES ${transaction.totalAmount} (Rent: ${transaction.baseAmount} + Fees: ${transaction.pesapalFees})`,
          },
        });

        logger.info('Payment record created (base amount only)', {
          baseAmount: transaction.baseAmount,
          totalPaid: transaction.totalAmount,
        });
      }

      logger.info('Pesapal payment successful');
    } else if (status.status === 'Failed' || status.status === 'FAILED') {
      await prisma.pesapalTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          confirmedAt: new Date(),
        },
      });
    } else if (status.status === 'Invalid' || status.status === 'INVALID') {
      await prisma.pesapalTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CANCELLED',
          confirmedAt: new Date(),
        },
      });
    }

    return { success: true, status: status.status };
  } catch (error) {
    logger.error('IPN processing error:', error);
    throw error;
  }
}
