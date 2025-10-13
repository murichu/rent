import React, { useState } from 'react';
import { motion } from 'framer-motion';
import StripePayment from './StripePayment';
import PaystackPayment from './PaystackPayment';

/**
 * Card Payment Gateway Selector (Stripe vs Paystack)
 */
const CardPaymentSelector = ({ amount, leaseId, email, onSuccess, onCancel }) => {
  const [selectedProvider, setSelectedProvider] = useState(null);

  const providers = [
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'International cards (Visa, Mastercard, Amex)',
      icon: '💳',
      color: 'purple',
      fees: '2.9% + KES 50',
      popular: false,
    },
    {
      id: 'paystack',
      name: 'Paystack',
      description: 'Cards, M-Pesa, Bank, USSD',
      icon: '🌟',
      color: 'blue',
      fees: '1.5% + KES 100',
      popular: true,
    },
  ];

  const colorClasses = {
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-500',
      hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500',
      hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
    },
  };

  if (selectedProvider === 'stripe') {
    return (
      <div>
        <button
          onClick={() => setSelectedProvider(null)}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Choose Different Provider
        </button>
        <StripePayment
          amount={amount}
          leaseId={leaseId}
          email={email}
          onSuccess={onSuccess}
          onCancel={() => setSelectedProvider(null)}
        />
      </div>
    );
  }

  if (selectedProvider === 'paystack') {
    return (
      <div>
        <button
          onClick={() => setSelectedProvider(null)}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Choose Different Provider
        </button>
        <PaystackPayment
          amount={amount}
          leaseId={leaseId}
          email={email}
          onSuccess={onSuccess}
          onCancel={() => setSelectedProvider(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Pay with Card
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose your preferred card payment provider
        </p>
        <div className="mt-4 inline-block px-6 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            KES {amount.toLocaleString()}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider, index) => {
          const colors = colorClasses[provider.color];
          
          return (
            <motion.button
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedProvider(provider.id)}
              className={`relative p-6 rounded-xl border-2 ${colors.border} ${colors.bg} ${colors.hover} transition-all text-left group`}
            >
              {provider.popular && (
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                  POPULAR
                </div>
              )}

              <div className="text-6xl mb-4">{provider.icon}</div>

              <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>
                {provider.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {provider.description}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Secure payment
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Instant processing
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Fee: {provider.fees}
                </div>
              </div>

              <div className={`flex items-center gap-2 ${colors.text} font-medium group-hover:gap-3 transition-all mt-4`}>
                <span>Continue</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          );
        })}
      </div>

      {onCancel && (
        <div className="text-center mt-8">
          <button
            onClick={onCancel}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Cancel Payment
          </button>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 text-sm">
            <p className="font-medium text-gray-900 dark:text-white mb-1">Secure Payment</p>
            <p className="text-gray-600 dark:text-gray-400">
              Your payment is secured with bank-level encryption. We never store your card details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardPaymentSelector;
