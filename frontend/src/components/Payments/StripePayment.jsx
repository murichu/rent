import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import showToast from '../../utils/toast';
import api from '../../services/api';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StripeCheckoutForm = ({ amount, leaseId, email, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const response = await api.cards.createStripeIntent({
        amount,
        email,
        leaseId,
        provider: 'stripe',
      });
      setClientSecret(response.data.clientSecret);
    } catch (error) {
      showToast.error('Failed to initialize payment');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email,
          },
        },
      });

      if (error) {
        showToast.error(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        showToast.success('Payment successful! 🎉');
        if (onSuccess) {
          onSuccess({ paymentIntentId: paymentIntent.id, amount: paymentIntent.amount / 100 });
        }
      }
    } catch (error) {
      showToast.error('Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">💳</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pay with Stripe
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Secure payment powered by Stripe
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Details
        </label>
        <div className="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1f2937',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Amount to Pay:</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            KES {amount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Secured by Stripe • PCI DSS Compliant
      </div>
    </motion.form>
  );
};

const StripePayment = (props) => (
  <Elements stripe={stripePromise}>
    <StripeCheckoutForm {...props} />
  </Elements>
);

export default StripePayment;
