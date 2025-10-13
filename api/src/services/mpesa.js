import axios from 'axios';
import logger from '../utils/logger.js';
import { prisma } from '../db.js';

/**
 * Safaricom M-Pesa Daraja API Integration
 * C2B STK Push Implementation
 */

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
};

// API URLs
const getBaseUrl = () => {
  return MPESA_CONFIG.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

/**
 * Get OAuth access token
 */
export async function getMpesaAccessToken() {
  try {
    const auth = Buffer.from(
      `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
    ).toString('base64');

    const response = await axios.get(
      `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    logger.info('M-Pesa access token generated successfully');
    return response.data.access_token;
  } catch (error) {
    logger.error('Failed to get M-Pesa access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with M-Pesa');
  }
}

/**
 * Generate M-Pesa password
 */
function generatePassword() {
  const timestamp = getTimestamp();
  const password = Buffer.from(
    `${MPESA_CONFIG.shortcode}${MPESA_CONFIG.passkey}${timestamp}`
  ).toString('base64');
  return { password, timestamp };
}

/**
 * Get timestamp in format YYYYMMDDHHmmss
 */
function getTimestamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Format phone number to 254XXXXXXXXX
 */
function formatPhoneNumber(phone) {
  // Remove spaces, dashes, and plus
  let cleaned = phone.replace(/[\s\-+]/g, '');
  
  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // If doesn't start with 254, add it
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

/**
 * Initiate STK Push
 * @param {string} phoneNumber - Customer phone number (0712345678 or 254712345678)
 * @param {number} amount - Amount to charge (minimum 1 KES)
 * @param {string} accountReference - Account reference (e.g., invoice number)
 * @param {string} transactionDesc - Transaction description
 * @returns {Object} STK Push response
 */
export async function initiateStkPush(phoneNumber, amount, accountReference, transactionDesc = 'Payment') {
  try {
    const accessToken = await getMpesaAccessToken();
    const { password, timestamp } = generatePassword();
    const formattedPhone = formatPhoneNumber(phoneNumber);

    const requestData = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount), // Amount must be integer
      PartyA: formattedPhone, // Customer phone number
      PartyB: MPESA_CONFIG.shortcode, // Business shortcode
      PhoneNumber: formattedPhone, // Phone number to receive prompt
      CallBackURL: MPESA_CONFIG.callbackUrl,
      AccountReference: accountReference || 'Haven',
      TransactionDesc: transactionDesc || 'Property Rent Payment',
    };

    logger.info('Initiating M-Pesa STK Push:', {
      phone: formattedPhone,
      amount,
      reference: accountReference,
    });

    const response = await axios.post(
      `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('M-Pesa STK Push initiated successfully:', {
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
    });

    // Store transaction in database
    await prisma.mpesaTransaction.create({
      data: {
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        phoneNumber: formattedPhone,
        amount: amount,
        accountReference: accountReference,
        transactionDesc: transactionDesc,
        status: 'PENDING',
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
      },
    });

    return {
      success: true,
      message: 'STK Push sent successfully',
      data: {
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage,
      },
    };
  } catch (error) {
    logger.error('M-Pesa STK Push failed:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment'
    );
  }
}

/**
 * Query STK Push transaction status
 * @param {string} checkoutRequestId - Checkout request ID from STK Push
 */
export async function queryStkPushStatus(checkoutRequestId) {
  try {
    const accessToken = await getMpesaAccessToken();
    const { password, timestamp } = generatePassword();

    const requestData = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await axios.post(
      `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('M-Pesa transaction status queried:', {
      checkoutRequestId,
      resultCode: response.data.ResultCode,
    });

    return {
      checkoutRequestId: response.data.CheckoutRequestID,
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc,
      merchantRequestId: response.data.MerchantRequestID,
    };
  } catch (error) {
    logger.error('M-Pesa status query failed:', error.response?.data || error.message);
    throw new Error('Failed to query transaction status');
  }
}

/**
 * Process M-Pesa callback
 * Called by Safaricom when transaction completes
 */
export async function processMpesaCallback(callbackData) {
  try {
    const { Body } = callbackData;
    const { stkCallback } = Body;

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    logger.info('Processing M-Pesa callback:', {
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
    });

    // Find transaction in database
    const transaction = await prisma.mpesaTransaction.findFirst({
      where: { checkoutRequestId: CheckoutRequestID },
    });

    if (!transaction) {
      logger.error('Transaction not found for CheckoutRequestID:', CheckoutRequestID);
      return { success: false, message: 'Transaction not found' };
    }

    // Update transaction status
    if (ResultCode === 0) {
      // Success
      const metadata = CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = metadata.find((item) => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = metadata.find((item) => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = metadata.find((item) => item.Name === 'PhoneNumber')?.Value;
      const amount = metadata.find((item) => item.Name === 'Amount')?.Value;

      await prisma.mpesaTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          resultCode: ResultCode.toString(),
          resultDescription: ResultDesc,
          mpesaReceiptNumber,
          transactionDate: transactionDate ? new Date(transactionDate.toString()) : null,
          completedAt: new Date(),
        },
      });

      // Create payment record if linked to lease
      if (transaction.leaseId) {
        await prisma.payment.create({
          data: {
            leaseId: transaction.leaseId,
            agencyId: transaction.agencyId,
            amount: transaction.amount,
            paidAt: new Date(),
            method: 'MPESA_C2B',
            referenceNumber: mpesaReceiptNumber,
            notes: `M-Pesa payment from ${phoneNumber}`,
          },
        });

        logger.info('Payment record created for successful M-Pesa transaction');
      }

      logger.info('M-Pesa transaction completed successfully:', {
        receiptNumber: mpesaReceiptNumber,
        amount,
      });

      return {
        success: true,
        message: 'Payment processed successfully',
        receiptNumber: mpesaReceiptNumber,
      };
    } else {
      // Failed
      await prisma.mpesaTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          resultCode: ResultCode.toString(),
          resultDescription: ResultDesc,
          completedAt: new Date(),
        },
      });

      logger.warn('M-Pesa transaction failed:', {
        checkoutRequestId: CheckoutRequestID,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });

      return {
        success: false,
        message: ResultDesc || 'Payment failed',
      };
    }
  } catch (error) {
    logger.error('Error processing M-Pesa callback:', error);
    throw error;
  }
}

/**
 * Get M-Pesa transaction by checkout request ID
 */
export async function getMpesaTransaction(checkoutRequestId) {
  return await prisma.mpesaTransaction.findFirst({
    where: { checkoutRequestId },
  });
}

/**
 * Get M-Pesa transactions for a lease
 */
export async function getMpesaTransactionsByLease(leaseId) {
  return await prisma.mpesaTransaction.findMany({
    where: { leaseId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Link M-Pesa transaction to lease (for tracking rent payments)
 */
export async function linkTransactionToLease(checkoutRequestId, leaseId, agencyId) {
  return await prisma.mpesaTransaction.update({
    where: { checkoutRequestId },
    data: { leaseId, agencyId },
  });
}
