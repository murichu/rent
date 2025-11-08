import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { prisma } from '../db.js';
import { kcbCircuitBreaker } from './circuitBreaker.js';

/**
 * KCB Buni API Integration
 * Complete implementation of all 5 KCB Buni APIs
 */

const KCB_CONFIG = {
  clientId: process.env.KCB_CLIENT_ID,
  clientSecret: process.env.KCB_CLIENT_SECRET,
  apiKey: process.env.KCB_API_KEY,
  accountNumber: process.env.KCB_ACCOUNT_NUMBER,
  environment: process.env.KCB_ENVIRONMENT || 'sandbox',
  baseUrl: process.env.KCB_ENVIRONMENT === 'production' 
    ? 'https://api.kcbbuni.co.ke' 
    : 'https://uat.buni.kcbgroup.com',
};

/**
 * Get KCB Buni OAuth access token with circuit breaker protection
 */
export async function getKcbAccessToken() {
  return await kcbCircuitBreaker.execute(async () => {
    const auth = Buffer.from(`${KCB_CONFIG.clientId}:${KCB_CONFIG.clientSecret}`).toString('base64');

    const response = await axios.post(
      `${KCB_CONFIG.baseUrl}/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
      }
    );

    logger.info('KCB Buni access token generated');
    return response.data.access_token;
  });
}

/**
 * Format phone number to 254XXXXXXXXX
 */
function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/[\s\-+]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
  return cleaned;
}

/**
 * Generate KCB signature
 */
function generateSignature(payload) {
  const message = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', KCB_CONFIG.clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

// ==================== 1. M-PESA STK PUSH (via KCB) ====================

/**
 * Initiate M-Pesa STK Push via KCB Buni
 */
export async function initiateKcbStkPush(phoneNumber, amount, accountReference, narrative = 'Payment') {
  try {
    const accessToken = await getKcbAccessToken();
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const transactionRef = `KCB-${Date.now()}`;

    const requestData = {
      phoneNumber: formattedPhone,
      amount: Math.round(amount),
      invoiceNumber: accountReference || transactionRef,
      sharedShortCode: true,
      orgShortCode: KCB_CONFIG.accountNumber,
      orgPassKey: process.env.KCB_PASSKEY,
      callbackUrl: `${process.env.BACKEND_URL}/api/kcb/mpesa-callback`,
      transactionDescription: narrative,
    };

    logger.info('Initiating KCB STK Push:', {
      phone: formattedPhone,
      amount,
      reference: accountReference,
    });

    const response = await kcbCircuitBreaker.execute(async () => {
      return await axios.post(
        `${KCB_CONFIG.baseUrl}/mm/api/request/v1.0.0/stkpush`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store transaction
    await prisma.kcbTransaction.create({
      data: {
        transactionRef: transactionRef,
        checkoutRequestId: response.data.checkoutRequestId || transactionRef,
        phoneNumber: formattedPhone,
        amount: amount,
        accountReference: accountReference,
        narrative: narrative,
        type: 'MPESA_STK',
        status: 'PENDING',
        responseCode: response.data.responseCode?.toString(),
        responseDescription: response.data.responseDescription,
      },
    });

    logger.info('KCB STK Push initiated:', {
      checkoutRequestId: response.data.checkoutRequestId,
    });

    return {
      success: true,
      message: 'STK Push sent via KCB',
      data: {
        checkoutRequestId: response.data.checkoutRequestId || transactionRef,
        transactionRef,
        responseCode: response.data.responseCode,
        responseDescription: response.data.responseDescription,
      },
    };
  } catch (error) {
    logger.error('KCB STK Push failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initiate KCB STK Push');
  }
}

/**
 * Process KCB M-Pesa callback
 */
export async function processKcbMpesaCallback(callbackData) {
  try {
    const {
      checkoutRequestId,
      resultCode,
      resultDesc,
      mpesaReceiptNumber,
      transactionDate,
      phoneNumber,
      amount,
    } = callbackData;

    logger.info('Processing KCB M-Pesa callback:', {
      checkoutRequestId,
      resultCode,
    });

    const transaction = await prisma.kcbTransaction.findFirst({
      where: { checkoutRequestId },
    });

    if (!transaction) {
      logger.error('KCB transaction not found:', checkoutRequestId);
      return { success: false };
    }

    if (resultCode === '0' || resultCode === 0) {
      // Success
      await prisma.kcbTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          resultCode: resultCode?.toString(),
          resultDescription: resultDesc,
          mpesaReceiptNumber,
          transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
          completedAt: new Date(),
        },
      });

      // Create payment record
      if (transaction.leaseId) {
        await prisma.payment.create({
          data: {
            leaseId: transaction.leaseId,
            agencyId: transaction.agencyId,
            amount: transaction.amount,
            paidAt: new Date(),
            method: 'MPESA_C2B',
            referenceNumber: mpesaReceiptNumber,
            notes: `KCB M-Pesa payment from ${phoneNumber}`,
          },
        });

        logger.info('Payment record created for KCB M-Pesa transaction');
      }

      logger.info('KCB M-Pesa payment completed:', { receiptNumber: mpesaReceiptNumber });
    } else {
      // Failed
      await prisma.kcbTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          resultCode: resultCode?.toString(),
          resultDescription: resultDesc,
          completedAt: new Date(),
        },
      });

      logger.warn('KCB M-Pesa payment failed:', { resultCode, resultDesc });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error processing KCB callback:', error);
    throw error;
  }
}

// ==================== 2. ACCOUNT STATEMENT ====================

/**
 * Get account statement
 */
export async function getAccountStatement(startDate, endDate) {
  try {
    const accessToken = await getKcbAccessToken();

    const requestData = {
      accountNumber: KCB_CONFIG.accountNumber,
      startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: endDate.toISOString().split('T')[0],
    };

    logger.info('Fetching KCB account statement:', {
      account: KCB_CONFIG.accountNumber,
      startDate: requestData.startDate,
      endDate: requestData.endDate,
    });

    const response = await kcbCircuitBreaker.execute(async () => {
      return await axios.post(
        `${KCB_CONFIG.baseUrl}/account/api/v1.0.0/statement`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store statement request
    await prisma.kcbStatementRequest.create({
      data: {
        accountNumber: KCB_CONFIG.accountNumber,
        startDate,
        endDate,
        transactionCount: response.data.transactions?.length || 0,
        status: 'SUCCESS',
      },
    });

    logger.info('KCB statement retrieved:', {
      transactions: response.data.transactions?.length,
    });

    return {
      success: true,
      data: {
        accountNumber: response.data.accountNumber,
        accountName: response.data.accountName,
        currency: response.data.currency,
        availableBalance: response.data.availableBalance,
        currentBalance: response.data.currentBalance,
        transactions: response.data.transactions || [],
      },
    };
  } catch (error) {
    logger.error('Failed to get KCB statement:', error.response?.data || error.message);
    throw new Error('Failed to retrieve account statement');
  }
}

// ==================== 3. SEND TO BANK (Inter-bank Transfer) ====================

/**
 * Send money to another bank
 */
export async function sendToBank(destinationBank, accountNumber, accountName, amount, narrative) {
  try {
    const accessToken = await getKcbAccessToken();
    const transactionRef = `S2B-${Date.now()}`;

    const requestData = {
      sourceAccount: KCB_CONFIG.accountNumber,
      destinationBankCode: destinationBank, // Bank code (e.g., 01 for KCB, 11 for Equity)
      destinationAccount: accountNumber,
      destinationAccountName: accountName,
      amount: Math.round(amount),
      currency: 'KES',
      transactionReference: transactionRef,
      narrative: narrative || 'Payment',
      callbackUrl: `${process.env.BACKEND_URL}/api/kcb/transfer-callback`,
    };

    logger.info('Initiating KCB send to bank:', {
      destinationBank,
      amount,
      reference: transactionRef,
    });

    const response = await kcbCircuitBreaker.execute(async () => {
      return await axios.post(
        `${KCB_CONFIG.baseUrl}/payment/api/v1.0.0/sendtobank`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store transaction
    await prisma.kcbTransaction.create({
      data: {
        transactionRef,
        destinationBank,
        destinationAccount: accountNumber,
        destinationAccountName: accountName,
        amount,
        narrative,
        type: 'SEND_TO_BANK',
        status: 'PENDING',
        responseCode: response.data.responseCode?.toString(),
        responseDescription: response.data.responseDescription,
      },
    });

    logger.info('KCB send to bank initiated:', { transactionRef });

    return {
      success: true,
      message: 'Inter-bank transfer initiated',
      data: {
        transactionRef,
        responseCode: response.data.responseCode,
        responseDescription: response.data.responseDescription,
      },
    };
  } catch (error) {
    logger.error('KCB send to bank failed:', error.response?.data || error.message);
    throw new Error('Failed to send money to bank');
  }
}

// ==================== 4. BANK TO BANK (KCB to KCB) ====================

/**
 * Transfer between KCB accounts
 */
export async function bankToBank(destinationAccount, accountName, amount, narrative) {
  try {
    const accessToken = await getKcbAccessToken();
    const transactionRef = `B2B-${Date.now()}`;

    const requestData = {
      sourceAccount: KCB_CONFIG.accountNumber,
      destinationAccount: destinationAccount,
      destinationAccountName: accountName,
      amount: Math.round(amount),
      currency: 'KES',
      transactionReference: transactionRef,
      narrative: narrative || 'Internal Transfer',
      callbackUrl: `${process.env.BACKEND_URL}/api/kcb/internal-transfer-callback`,
    };

    logger.info('Initiating KCB internal transfer:', {
      destinationAccount,
      amount,
    });

    const response = await kcbCircuitBreaker.execute(async () => {
      return await axios.post(
        `${KCB_CONFIG.baseUrl}/payment/api/v1.0.0/banktobank`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store transaction
    await prisma.kcbTransaction.create({
      data: {
        transactionRef,
        destinationAccount,
        destinationAccountName: accountName,
        amount,
        narrative,
        type: 'BANK_TO_BANK',
        status: 'PENDING',
        responseCode: response.data.responseCode?.toString(),
        responseDescription: response.data.responseDescription,
      },
    });

    logger.info('KCB internal transfer initiated:', { transactionRef });

    return {
      success: true,
      message: 'Internal transfer initiated',
      data: {
        transactionRef,
        responseCode: response.data.responseCode,
        responseDescription: response.data.responseDescription,
      },
    };
  } catch (error) {
    logger.error('KCB bank to bank failed:', error.response?.data || error.message);
    throw new Error('Failed to transfer between accounts');
  }
}

// ==================== 5. PESALINK ====================

/**
 * Send via PesaLink (instant inter-bank via mobile number)
 */
export async function sendViaPesaLink(mobileNumber, destinationBank, amount, narrative) {
  try {
    const accessToken = await getKcbAccessToken();
    const formattedPhone = formatPhoneNumber(mobileNumber);
    const transactionRef = `PSL-${Date.now()}`;

    const requestData = {
      sourceAccount: KCB_CONFIG.accountNumber,
      mobileNumber: formattedPhone,
      destinationBankCode: destinationBank, // Bank code of recipient
      amount: Math.round(amount),
      currency: 'KES',
      transactionReference: transactionRef,
      narrative: narrative || 'PesaLink Payment',
      callbackUrl: `${process.env.BACKEND_URL}/api/kcb/pesalink-callback`,
    };

    logger.info('Initiating PesaLink transfer:', {
      mobile: formattedPhone,
      amount,
      bank: destinationBank,
    });

    const response = await kcbCircuitBreaker.execute(async () => {
      return await axios.post(
        `${KCB_CONFIG.baseUrl}/payment/api/v1.0.0/pesalink`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000, // 25 second timeout (within circuit breaker's 30s limit)
        }
      );
    });

    // Store transaction
    await prisma.kcbTransaction.create({
      data: {
        transactionRef,
        phoneNumber: formattedPhone,
        destinationBank,
        amount,
        narrative,
        type: 'PESALINK',
        status: 'PENDING',
        responseCode: response.data.responseCode?.toString(),
        responseDescription: response.data.responseDescription,
      },
    });

    logger.info('PesaLink transfer initiated:', { transactionRef });

    return {
      success: true,
      message: 'PesaLink transfer initiated',
      data: {
        transactionRef,
        responseCode: response.data.responseCode,
        responseDescription: response.data.responseDescription,
      },
    };
  } catch (error) {
    logger.error('PesaLink transfer failed:', error.response?.data || error.message);
    throw new Error('Failed to send via PesaLink');
  }
}

// ==================== CALLBACK HANDLERS ====================

/**
 * Process transfer callback (Send to Bank, Bank to Bank, PesaLink)
 */
export async function processKcbTransferCallback(callbackData) {
  try {
    const {
      transactionReference,
      resultCode,
      resultDescription,
      transactionId,
      debitAccount,
      creditAccount,
      amount,
    } = callbackData;

    logger.info('Processing KCB transfer callback:', {
      reference: transactionReference,
      resultCode,
    });

    const transaction = await prisma.kcbTransaction.findFirst({
      where: { transactionRef: transactionReference },
    });

    if (!transaction) {
      logger.error('KCB transaction not found:', transactionReference);
      return { success: false };
    }

    if (resultCode === '0' || resultCode === 0) {
      // Success
      await prisma.kcbTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          resultCode: resultCode?.toString(),
          resultDescription,
          transactionId,
          completedAt: new Date(),
        },
      });

      logger.info('KCB transfer completed successfully:', { transactionId });
    } else {
      // Failed
      await prisma.kcbTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          resultCode: resultCode?.toString(),
          resultDescription,
          completedAt: new Date(),
        },
      });

      logger.warn('KCB transfer failed:', { resultCode, resultDescription });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error processing KCB callback:', error);
    throw error;
  }
}

// ==================== QUERY FUNCTIONS ====================

/**
 * Get KCB transaction status
 */
export async function getKcbTransactionStatus(transactionRef) {
  const transaction = await prisma.kcbTransaction.findFirst({
    where: { transactionRef },
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

  // Map result codes to user messages
  const statusMessages = {
    '0': 'Transaction completed successfully',
    '1': 'Insufficient funds',
    '2': 'Invalid account',
    '3': 'Transaction declined',
    '4': 'Transaction timeout',
  };

  const userMessage = statusMessages[transaction.resultCode] || transaction.resultDescription || 'Processing...';

  return {
    ...transaction,
    userMessage,
    statusIcon: transaction.status === 'SUCCESS' ? '✅' : transaction.status === 'FAILED' ? '❌' : '⏳',
  };
}

/**
 * Get transactions by type
 */
export async function getKcbTransactionsByType(type, agencyId) {
  return await prisma.kcbTransaction.findMany({
    where: { type, agencyId },
    orderBy: { createdAt: 'desc' },
    include: {
      lease: {
        include: {
          tenant: true,
        },
      },
    },
  });
}

/**
 * Link KCB transaction to lease
 */
export async function linkKcbTransactionToLease(transactionRef, leaseId, agencyId) {
  return await prisma.kcbTransaction.update({
    where: { transactionRef },
    data: { leaseId, agencyId },
  });
}

/**
 * Get account balance from latest statement
 */
export async function getKcbAccountBalance() {
  const latestStatement = await prisma.kcbStatementRequest.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
  });

  return latestStatement;
}

// ==================== BANK CODES ====================

/**
 * Kenya bank codes for reference
 */
export const KENYA_BANK_CODES = {
  KCB: '01',
  STANDARD_CHARTERED: '02',
  BARCLAYS: '03',
  BANK_OF_INDIA: '05',
  BANK_OF_BARODA: '06',
  COMMERCIAL_BANK_OF_AFRICA: '07',
  HABIB_BANK_AG_ZURICH: '08',
  PRIME_BANK: '10',
  EQUITY: '11',
  COOP_BANK: '12',
  NATIONAL_BANK: '13',
  ORIENTAL_COMMERCIAL: '14',
  CITIBANK: '16',
  HABIB_BANK: '17',
  MIDDLE_EAST_BANK: '18',
  BANK_OF_AFRICA: '19',
  CONSOLIDATED_BANK: '23',
  CREDIT_BANK: '25',
  TRANS_NATIONAL_BANK: '26',
  CHASE_BANK: '30',
  STANBIC: '31',
  AFRICAN_BANKING_CORP: '35',
  GIRO_COMMERCIAL: '42',
  ECOBANK: '43',
  SIDIAN_BANK: '66',
  FAMILY_BANK: '70',
  GULF_AFRICAN_BANK: '72',
  FIRST_COMMUNITY_BANK: '74',
};
