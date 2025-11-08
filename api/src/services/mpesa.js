import axios from 'axios';
import { prisma } from '../db.js';
import logger from '../utils/logger.js';

// M-Pesa Configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  shortcode: process.env.MPESA_SHORTCODE || '174379',
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
};

/**
 * Get M-Pesa base URL based on environment
 */
function getBaseUrl() {
  return MPESA_CONFIG.environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

/**
 * Get timestamp in the format required by M-Pesa
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * Get M-Pesa access token
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
        timeout: 10000,
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
 * Format phone number for M-Pesa
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
        timeout: 25000, // 25 second timeout
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
        timeout: 10000,
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    logger.error('M-Pesa status query failed:', error.response?.data || error.message);
    throw new Error('Failed to query M-Pesa transaction status');
  }
}

/**
 * Process M-Pesa callback
 * @param {Object} callbackData - Callback data from M-Pesa
 */
export async function processMpesaCallback(callbackData) {
  try {
    const { Body } = callbackData;
    const { stkCallback } = Body;
    
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    logger.info('Processing M-Pesa callback:', {
      checkoutRequestId,
      merchantRequestId,
      resultCode,
      resultDesc,
    });

    // Find the transaction in database
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId },
    });

    if (!transaction) {
      logger.warn('M-Pesa callback for unknown transaction:', checkoutRequestId);
      return { success: false, message: 'Transaction not found' };
    }

    // Update transaction based on result code
    let status = 'FAILED';
    let mpesaReceiptNumber = null;
    let transactionDate = null;

    if (resultCode === 0) {
      // Success
      status = 'SUCCESS';
      
      // Extract callback metadata
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      
      for (const item of callbackMetadata) {
        if (item.Name === 'MpesaReceiptNumber') {
          mpesaReceiptNumber = item.Value;
        } else if (item.Name === 'TransactionDate') {
          transactionDate = new Date(item.Value.toString());
        }
      }
    }

    // Update transaction in database
    await prisma.mpesaTransaction.update({
      where: { checkoutRequestId },
      data: {
        status,
        resultCode: resultCode.toString(),
        resultDescription: resultDesc,
        mpesaReceiptNumber,
        transactionDate,
        completedAt: new Date(),
      },
    });

    // If successful, create payment record
    if (status === 'SUCCESS' && transaction.leaseId) {
      await prisma.payment.create({
        data: {
          leaseId: transaction.leaseId,
          agencyId: transaction.agencyId,
          amount: transaction.amount,
          paidAt: transactionDate || new Date(),
          method: 'MPESA_C2B',
          referenceNumber: mpesaReceiptNumber,
          notes: `M-Pesa payment - ${mpesaReceiptNumber}`,
        },
      });

      logger.info('Payment record created for successful M-Pesa transaction:', {
        checkoutRequestId,
        mpesaReceiptNumber,
        amount: transaction.amount,
      });
    }

    return {
      success: true,
      message: 'Callback processed successfully',
      data: {
        checkoutRequestId,
        status,
        mpesaReceiptNumber,
      },
    };
  } catch (error) {
    logger.error('Failed to process M-Pesa callback:', error);
    throw new Error('Failed to process M-Pesa callback');
  }
}

/**
 * Get M-Pesa transaction by checkout request ID
 * @param {string} checkoutRequestId - Checkout request ID
 */
export async function getMpesaTransaction(checkoutRequestId) {
  try {
    const transaction = await prisma.mpesaTransaction.findUnique({
      where: { checkoutRequestId },
      include: {
        lease: {
          include: {
            tenant: true,
            property: true,
            unit: true,
          },
        },
      },
    });

    return transaction;
  } catch (error) {
    logger.error('Failed to get M-Pesa transaction:', error);
    throw new Error('Failed to get M-Pesa transaction');
  }
}

/**
 * Get M-Pesa transactions by lease ID
 * @param {string} leaseId - Lease ID
 */
export async function getMpesaTransactionsByLease(leaseId) {
  try {
    const transactions = await prisma.mpesaTransaction.findMany({
      where: { leaseId },
      orderBy: { createdAt: 'desc' },
    });

    return transactions;
  } catch (error) {
    logger.error('Failed to get M-Pesa transactions by lease:', error);
    throw new Error('Failed to get M-Pesa transactions');
  }
}

/**
 * Link M-Pesa transaction to lease
 * @param {string} checkoutRequestId - Checkout request ID
 * @param {string} leaseId - Lease ID
 */
export async function linkTransactionToLease(checkoutRequestId, leaseId) {
  try {
    await prisma.mpesaTransaction.update({
      where: { checkoutRequestId },
      data: { leaseId },
    });

    logger.info('M-Pesa transaction linked to lease:', {
      checkoutRequestId,
      leaseId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to link M-Pesa transaction to lease:', error);
    throw new Error('Failed to link transaction to lease');
  }
}

/**
 * Get detailed transaction status with user-friendly messages
 * @param {string} checkoutRequestId - Checkout request ID
 */
export async function getDetailedTransactionStatus(checkoutRequestId) {
  try {
    const transaction = await getMpesaTransaction(checkoutRequestId);
    
    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found',
        status: 'NOT_FOUND',
      };
    }

    let userMessage = '';
    let statusColor = 'yellow';

    switch (transaction.status) {
      case 'PENDING':
        userMessage = 'Processing payment... Please enter your M-Pesa PIN on your phone.';
        statusColor = 'blue';
        break;
      case 'SUCCESS':
        userMessage = `Payment completed successfully! Receipt: ${transaction.mpesaReceiptNumber}`;
        statusColor = 'green';
        break;
      case 'FAILED':
        userMessage = transaction.resultDescription || 'Payment failed. Please try again.';
        statusColor = 'red';
        break;
      case 'CANCELLED':
        userMessage = 'Payment was cancelled by user.';
        statusColor = 'orange';
        break;
      default:
        userMessage = 'Unknown payment status.';
        statusColor = 'gray';
    }

    return {
      success: true,
      data: {
        ...transaction,
        userMessage,
        statusColor,
      },
    };
  } catch (error) {
    logger.error('Failed to get detailed transaction status:', error);
    throw new Error('Failed to get transaction status');
  }
}

// ==================== B2C (Business to Customer) ====================

/**
 * Initiate B2C payment (send money to customer)
 * @param {Object} params - B2C parameters
 * @param {string} params.phoneNumber - Recipient phone number
 * @param {number} params.amount - Amount to send
 * @param {string} params.remarks - Transaction remarks
 * @param {string} params.occasion - Occasion for payment
 * @param {string} params.commandID - Command ID (BusinessPayment, SalaryPayment, PromotionPayment)
 */
export async function initiateB2C({ phoneNumber, amount, remarks = "Payment", occasion = "", commandID = "BusinessPayment" }) {
  try {
    const token = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    const response = await axios.post(
      `${config.mpesa.baseUrl}/mpesa/b2c/v1/paymentrequest`,
      {
        InitiatorName: config.mpesa.initiatorName,
        SecurityCredential: config.mpesa.securityCredential,
        CommandID: commandID,
        Amount: amount,
        PartyA: config.mpesa.shortCode,
        PartyB: phoneNumber,
        Remarks: remarks,
        QueueTimeOutURL: `${config.mpesa.callbackUrl}/b2c/timeout`,
        ResultURL: `${config.mpesa.callbackUrl}/b2c/result`,
        Occasion: occasion,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    logger.info("B2C payment initiated", {
      phoneNumber,
      amount,
      conversationID: response.data.ConversationID,
    });

    return {
      success: true,
      conversationID: response.data.ConversationID,
      originatorConversationID: response.data.OriginatorConversationID,
      responseDescription: response.data.ResponseDescription,
    };
  } catch (error) {
    logger.error("B2C payment failed", {
      error: error.response?.data || error.message,
      phoneNumber,
      amount,
    });
    throw error;
  }
}

/**
 * Process B2C callback
 */
export async function processB2cCallback(callbackData) {
  try {
    const result = callbackData.Result;
    logger.info("B2C callback received", { result });

    // Extract result parameters
    const resultParameters = result.ResultParameters?.ResultParameter || [];
    const transactionData = {};
    
    resultParameters.forEach(param => {
      transactionData[param.Key] = param.Value;
    });

    // Store or update transaction record
    // You can add database logic here to track B2C transactions

    return {
      success: result.ResultCode === 0,
      resultCode: result.ResultCode,
      resultDesc: result.ResultDesc,
      transactionData,
    };
  } catch (error) {
    logger.error("B2C callback processing failed", { error: error.message });
    throw error;
  }
}

// ==================== Transaction Reversal ====================

/**
 * Reverse an M-Pesa transaction
 * @param {Object} params - Reversal parameters
 * @param {string} params.transactionID - Original transaction ID to reverse
 * @param {number} params.amount - Amount to reverse
 * @param {string} params.remarks - Reversal remarks
 * @param {string} params.occasion - Occasion for reversal
 */
export async function reverseTransaction({ transactionID, amount, remarks = "Transaction Reversal", occasion = "" }) {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      `${config.mpesa.baseUrl}/mpesa/reversal/v1/request`,
      {
        Initiator: config.mpesa.initiatorName,
        SecurityCredential: config.mpesa.securityCredential,
        CommandID: "TransactionReversal",
        TransactionID: transactionID,
        Amount: amount,
        ReceiverParty: config.mpesa.shortCode,
        RecieverIdentifierType: "11", // Shortcode
        ResultURL: `${config.mpesa.callbackUrl}/reversal/result`,
        QueueTimeOutURL: `${config.mpesa.callbackUrl}/reversal/timeout`,
        Remarks: remarks,
        Occasion: occasion,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    logger.info("Transaction reversal initiated", {
      transactionID,
      amount,
      conversationID: response.data.ConversationID,
    });

    return {
      success: true,
      conversationID: response.data.ConversationID,
      originatorConversationID: response.data.OriginatorConversationID,
      responseDescription: response.data.ResponseDescription,
    };
  } catch (error) {
    logger.error("Transaction reversal failed", {
      error: error.response?.data || error.message,
      transactionID,
    });
    throw error;
  }
}

/**
 * Process reversal callback
 */
export async function processReversalCallback(callbackData) {
  try {
    const result = callbackData.Result;
    logger.info("Reversal callback received", { result });

    return {
      success: result.ResultCode === 0,
      resultCode: result.ResultCode,
      resultDesc: result.ResultDesc,
    };
  } catch (error) {
    logger.error("Reversal callback processing failed", { error: error.message });
    throw error;
  }
}

// ==================== Account Balance ====================

/**
 * Check M-Pesa account balance
 * @param {string} remarks - Remarks for balance check
 */
export async function checkAccountBalance(remarks = "Balance Check") {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      `${config.mpesa.baseUrl}/mpesa/accountbalance/v1/query`,
      {
        Initiator: config.mpesa.initiatorName,
        SecurityCredential: config.mpesa.securityCredential,
        CommandID: "AccountBalance",
        PartyA: config.mpesa.shortCode,
        IdentifierType: "4", // Shortcode
        Remarks: remarks,
        QueueTimeOutURL: `${config.mpesa.callbackUrl}/balance/timeout`,
        ResultURL: `${config.mpesa.callbackUrl}/balance/result`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    logger.info("Balance check initiated", {
      conversationID: response.data.ConversationID,
    });

    return {
      success: true,
      conversationID: response.data.ConversationID,
      originatorConversationID: response.data.OriginatorConversationID,
      responseDescription: response.data.ResponseDescription,
    };
  } catch (error) {
    logger.error("Balance check failed", {
      error: error.response?.data || error.message,
    });
    throw error;
  }
}

/**
 * Process balance callback
 */
export async function processBalanceCallback(callbackData) {
  try {
    const result = callbackData.Result;
    logger.info("Balance callback received", { result });

    // Extract balance information
    const resultParameters = result.ResultParameters?.ResultParameter || [];
    const balanceData = {};
    
    resultParameters.forEach(param => {
      balanceData[param.Key] = param.Value;
    });

    // Store balance information (you can add database logic here)
    logger.info("Account balance", { balanceData });

    return {
      success: result.ResultCode === 0,
      resultCode: result.ResultCode,
      resultDesc: result.ResultDesc,
      balanceData,
    };
  } catch (error) {
    logger.error("Balance callback processing failed", { error: error.message });
    throw error;
  }
}

/**
 * Get latest account balance from stored records
 * Note: This requires implementing a balance storage mechanism
 */
export async function getLatestAccountBalance() {
  try {
    // TODO: Implement database query to get latest balance
    // For now, trigger a new balance check
    logger.info("Fetching latest account balance");
    
    // You can store balance checks in a separate collection/table
    // and query the most recent one here
    
    return {
      message: "Balance check initiated. Results will be available via callback.",
      note: "Implement balance storage to retrieve historical data",
    };
  } catch (error) {
    logger.error("Failed to get latest balance", { error: error.message });
    throw error;
  }
}