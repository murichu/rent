import Stripe from 'stripe';
import logger from '../utils/logger.js';
import { prisma } from '../db.js';

/**
 * Stripe Payment Integration for Card Payments
 * Supports Visa, Mastercard, and other international cards
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create payment intent
 */
export async function createStripePaymentIntent(amount, currency = 'KES', metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses cents
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        provider: 'stripe',
        platform: 'Haven',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info('Stripe payment intent created:', {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };
  } catch (error) {
    logger.error('Stripe payment intent failed:', error.message);
    throw new Error('Failed to create Stripe payment intent');
  }
}

/**
 * Confirm payment
 */
export async function confirmStripePayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    logger.info('Stripe payment confirmed:', {
      paymentIntentId,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
    });

    return {
      success: paymentIntent.status === 'succeeded',
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      charges: paymentIntent.charges.data[0],
    };
  } catch (error) {
    logger.error('Stripe payment confirmation failed:', error.message);
    throw error;
  }
}

/**
 * Handle Stripe webhook
 */
export async function handleStripeWebhook(rawBody, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    logger.info('Stripe webhook received:', {
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      
      default:
        logger.info('Unhandled Stripe event type:', event.type);
    }

    return { received: true };
  } catch (error) {
    logger.error('Stripe webhook error:', error.message);
    throw error;
  }
}

async function handlePaymentSuccess(paymentIntent) {
  const { id, amount, currency, metadata } = paymentIntent;

  // Store successful payment
  await prisma.cardTransaction.create({
    data: {
      transactionId: id,
      provider: 'STRIPE',
      amount: amount / 100,
      currency: currency.toUpperCase(),
      status: 'SUCCESS',
      metadata: JSON.stringify(metadata),
      leaseId: metadata.leaseId,
      agencyId: metadata.agencyId,
      completedAt: new Date(),
    },
  });

  // Create payment record if linked to lease
  if (metadata.leaseId) {
    await prisma.payment.create({
      data: {
        leaseId: metadata.leaseId,
        agencyId: metadata.agencyId,
        amount: amount / 100,
        paidAt: new Date(),
        method: 'CARD',
        referenceNumber: id,
        notes: `Card payment via Stripe`,
      },
    });

    logger.info('Payment record created for Stripe transaction');
  }
}

async function handlePaymentFailed(paymentIntent) {
  const { id, amount, last_payment_error } = paymentIntent;

  await prisma.cardTransaction.update({
    where: { transactionId: id },
    data: {
      status: 'FAILED',
      errorMessage: last_payment_error?.message,
      completedAt: new Date(),
    },
  });

  logger.warn('Stripe payment failed:', {
    paymentIntentId: id,
    error: last_payment_error?.message,
  });
}

async function handleRefund(charge) {
  logger.info('Stripe refund processed:', {
    chargeId: charge.id,
    amount: charge.amount_refunded / 100,
  });
}

/**
 * Create customer
 */
export async function createStripeCustomer(tenantData) {
  try {
    const customer = await stripe.customers.create({
      email: tenantData.email,
      name: tenantData.name,
      phone: tenantData.phone,
      metadata: {
        tenantId: tenantData.id,
      },
    });

    logger.info('Stripe customer created:', customer.id);

    return {
      customerId: customer.id,
    };
  } catch (error) {
    logger.error('Failed to create Stripe customer:', error.message);
    throw error;
  }
}

/**
 * Create setup intent for saving card
 */
export async function createSetupIntent(customerId) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  } catch (error) {
    logger.error('Failed to create setup intent:', error.message);
    throw error;
  }
}

/**
 * Create subscription for recurring rent payments
 */
export async function createStripeSubscription(customerId, priceAmount, leaseId) {
  try {
    // Create product
    const product = await stripe.products.create({
      name: 'Monthly Rent',
      metadata: { leaseId },
    });

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(priceAmount * 100),
      currency: 'kes',
      recurring: {
        interval: 'month',
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      metadata: { leaseId },
    });

    logger.info('Stripe subscription created:', {
      subscriptionId: subscription.id,
      amount: priceAmount,
    });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
    };
  } catch (error) {
    logger.error('Failed to create subscription:', error.message);
    throw error;
  }
}

/**
 * Get payment status
 */
export async function getStripePaymentStatus(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };
  } catch (error) {
    logger.error('Failed to retrieve Stripe payment:', error.message);
    throw error;
  }
}
