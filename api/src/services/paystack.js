import Paystack from 'paystack-node';
import logger from '../utils/logger.js';
import { prisma } from '../db.js';

/**
 * Paystack Payment Integration for Card Payments (Kenya)
 * Supports M-Pesa, Cards, Bank transfers, USSD
 */

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

/**
 * Initialize transaction
 */
export async function initializePaystackPayment(email, amount, metadata = {}) {
  try {
    const response = await paystack.transaction.initialize({
      email,
      amount: Math.round(amount * 100), // Paystack uses kobo/cents
      currency: 'KES',
      callback_url: `${process.env.BACKEND_URL}/api/v1/paystack/callback`,
      metadata: {
        ...metadata,
        provider: 'paystack',
        platform: 'Haven',
      },
      channels: ['card', 'bank', 'ussd', 'mobile_money'], // All payment channels
    });

    logger.info('Paystack transaction initialized:', {
      reference: response.data.reference,
      amount,
    });

    return {
      success: true,
      authorizationUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
      reference: response.data.reference,
    };
  } catch (error) {
    logger.error('Paystack initialization failed:', error.message);
    throw new Error('Failed to initialize Paystack payment');
  }
}

/**
 * Verify transaction
 */
export async function verifyPaystackPayment(reference) {
  try {
    const response = await paystack.transaction.verify(reference);

    if (response.data.status === 'success') {
      logger.info('Paystack payment verified:', {
        reference,
        amount: response.data.amount / 100,
        channel: response.data.channel,
      });

      // Store transaction
      await prisma.cardTransaction.create({
        data: {
          transactionId: response.data.id.toString(),
          provider: 'PAYSTACK',
          reference: response.data.reference,
          amount: response.data.amount / 100,
          currency: response.data.currency,
          channel: response.data.channel, // card, bank, ussd, mobile_money
          customerEmail: response.data.customer.email,
          status: 'SUCCESS',
          metadata: JSON.stringify(response.data.metadata),
          leaseId: response.data.metadata?.leaseId,
          agencyId: response.data.metadata?.agencyId,
          completedAt: new Date(response.data.paid_at),
        },
      });

      // Create payment record
      if (response.data.metadata?.leaseId) {
        await prisma.payment.create({
          data: {
            leaseId: response.data.metadata.leaseId,
            agencyId: response.data.metadata.agencyId,
            amount: response.data.amount / 100,
            paidAt: new Date(response.data.paid_at),
            method: 'CARD',
            referenceNumber: response.data.reference,
            notes: `Card payment via Paystack (${response.data.channel})`,
          },
        });

        logger.info('Payment record created for Paystack transaction');
      }

      return {
        success: true,
        amount: response.data.amount / 100,
        channel: response.data.channel,
        reference: response.data.reference,
        paidAt: response.data.paid_at,
      };
    } else {
      logger.warn('Paystack payment not successful:', {
        reference,
        status: response.data.status,
      });

      return {
        success: false,
        status: response.data.status,
        message: response.data.gateway_response,
      };
    }
  } catch (error) {
    logger.error('Paystack verification failed:', error.message);
    throw new Error('Failed to verify Paystack payment');
  }
}

/**
 * Handle Paystack webhook
 */
export async function handlePaystackWebhook(event) {
  try {
    logger.info('Paystack webhook received:', {
      event: event.event,
      reference: event.data.reference,
    });

    switch (event.event) {
      case 'charge.success':
        await verifyPaystackPayment(event.data.reference);
        break;
      
      case 'charge.failed':
        await handlePaymentFailed(event.data);
        break;
      
      case 'refund.processed':
        await handleRefund(event.data);
        break;
      
      default:
        logger.info('Unhandled Paystack event:', event.event);
    }

    return { success: true };
  } catch (error) {
    logger.error('Paystack webhook error:', error.message);
    throw error;
  }
}

async function handlePaymentFailed(data) {
  await prisma.cardTransaction.updateMany({
    where: { reference: data.reference },
    data: {
      status: 'FAILED',
      errorMessage: data.message,
      completedAt: new Date(),
    },
  });
}

async function handleRefund(data) {
  logger.info('Paystack refund processed:', {
    reference: data.reference,
    amount: data.amount / 100,
  });
}

/**
 * Create customer
 */
export async function createPaystackCustomer(tenantData) {
  try {
    const response = await paystack.customer.create({
      email: tenantData.email,
      first_name: tenantData.name.split(' ')[0],
      last_name: tenantData.name.split(' ').slice(1).join(' '),
      phone: tenantData.phone,
      metadata: {
        tenantId: tenantData.id,
      },
    });

    logger.info('Paystack customer created:', response.data.customer_code);

    return {
      customerId: response.data.customer_code,
    };
  } catch (error) {
    logger.error('Failed to create Paystack customer:', error.message);
    throw error;
  }
}

/**
 * Charge saved card (recurring payments)
 */
export async function chargePaystackCard(authorizationCode, email, amount, metadata = {}) {
  try {
    const response = await paystack.transaction.charge({
      email,
      amount: Math.round(amount * 100),
      authorization_code: authorizationCode,
      metadata,
    });

    if (response.data.status === 'success') {
      logger.info('Paystack card charged successfully:', {
        reference: response.data.reference,
        amount: response.data.amount / 100,
      });

      return {
        success: true,
        reference: response.data.reference,
        amount: response.data.amount / 100,
      };
    } else {
      throw new Error(response.data.message || 'Card charge failed');
    }
  } catch (error) {
    logger.error('Paystack card charge failed:', error.message);
    throw error;
  }
}

/**
 * Get transaction status
 */
export async function getPaystackTransactionStatus(reference) {
  try {
    const response = await paystack.transaction.verify(reference);
    
    return {
      status: response.data.status,
      amount: response.data.amount / 100,
      channel: response.data.channel,
      paidAt: response.data.paid_at,
    };
  } catch (error) {
    logger.error('Failed to get Paystack status:', error.message);
    throw error;
  }
}

/**
 * Create subscription plan
 */
export async function createPaystackPlan(name, amount, interval = 'monthly') {
  try {
    const response = await paystack.plan.create({
      name,
      amount: Math.round(amount * 100),
      interval,
      currency: 'KES',
    });

    logger.info('Paystack plan created:', response.data.plan_code);

    return {
      planCode: response.data.plan_code,
      planId: response.data.id,
    };
  } catch (error) {
    logger.error('Failed to create Paystack plan:', error.message);
    throw error;
  }
}

/**
 * Subscribe customer to plan (recurring rent)
 */
export async function subscribePaystackCustomer(customerCode, planCode, authorizationCode) {
  try {
    const response = await paystack.subscription.create({
      customer: customerCode,
      plan: planCode,
      authorization: authorizationCode,
    });

    logger.info('Paystack subscription created:', response.data.subscription_code);

    return {
      subscriptionCode: response.data.subscription_code,
      status: response.data.status,
      nextPaymentDate: response.data.next_payment_date,
    };
  } catch (error) {
    logger.error('Failed to create subscription:', error.message);
    throw error;
  }
}
