import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MpesaPayment from './MpesaPayment';
import KcbMpesaPayment from './KcbMpesaPayment';

const PaymentGatewaySelector = ({ amount, leaseId, accountReference, onSuccess, onCancel }) => {
  const [selectedGateway, setSelectedGateway] = useState(null);

  const gateways = [
    {
      id: 'safaricom',
      name: 'Safaricom M-Pesa',
      description: 'Direct M-Pesa STK Push via Safaricom Daraja',
      icon: '📱',
      color: 'green',
      popular: true,
    },
    {
      id: 'kcb',
      name: 'KCB M-Pesa',
      description: 'M-Pesa payment via KCB Buni',
      icon: '🏦',
      color: 'blue',
      popular: false,
    },
  ];

  const colorClasses = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-500',
      hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500',
      hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
    },
  };

  if (selectedGateway === 'safaricom') {
    return (
      <div>
        <button
          onClick={() => setSelectedGateway(null)}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Choose Different Gateway
        </button>
        <MpesaPayment
          amount={amount}
          leaseId={leaseId}
          accountReference={accountReference}
          onSuccess={onSuccess}
          onCancel={() => setSelectedGateway(null)}
        />
      </div>
    );
  }

  if (selectedGateway === 'kcb') {
    return (
      <div>
        <button
          onClick={() => setSelectedGateway(null)}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Choose Different Gateway
        </button>
        <KcbMpesaPayment
          amount={amount}
          leaseId={leaseId}
          accountReference={accountReference}
          onSuccess={onSuccess}
          onCancel={() => setSelectedGateway(null)}
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
          Choose Payment Method
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select your preferred M-Pesa payment gateway
        </p>
        <div className="mt-4 inline-block px-6 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            KES {amount.toLocaleString()}
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gateways.map((gateway, index) => {
          const colors = colorClasses[gateway.color];
          
          return (
            <motion.button
              key={gateway.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedGateway(gateway.id)}
              className={`relative p-6 rounded-xl border-2 ${colors.border} ${colors.bg} ${colors.hover} transition-all text-left group`}
            >
              {/* Popular Badge */}
              {gateway.popular && (
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                  POPULAR
                </div>
              )}

              {/* Icon */}
              <div className="text-6xl mb-4">{gateway.icon}</div>

              {/* Content */}
              <h3 className={`text-xl font-bold mb-2 ${colors.text}`}>
                {gateway.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {gateway.description}
              </p>

              {/* Arrow */}
              <div className={`flex items-center gap-2 ${colors.text} font-medium group-hover:gap-3 transition-all`}>
                <span>Select</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Cancel Button */}
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

      {/* Info */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          <strong>Both gateways</strong> use M-Pesa for payment. Choose based on your preference or which one works better for you.
        </p>
      </div>
    </div>
  );
};

export default PaymentGatewaySelector;
