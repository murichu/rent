import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PaystackButton } from 'react-paystack';
import showToast from '../../utils/toast';
import api from '../../services/api';

/**
 * Paystack Payment Component
 */
const PaystackPayment = ({ amount, leaseId, email, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const config = {
    reference: `PST-${Date.now()}`,
    email: email,
    amount: Math.round(amount * 100), // Convert to kobo/cents
    publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY,
    currency: 'KES',
    channels: ['card', 'bank', 'ussd', 'mobile_money'],
    metadata: {
      leaseId,
      custom_fields: [
        {
          display_name: 'Lease ID',
          variable_name: 'lease_id',
          value: leaseId,
        },
      ],
    },
  };

  const handlePaystackSuccess = async (reference) => {
    setLoading(true);
    
    try {
      // Verify payment on backend
      const response = await api.cards.verifyPaystack(reference.reference);

      if (response.data.success) {
        showToast.success(`Payment successful via ${response.data.channel}! 🎉`);
        if (onSuccess) {
          onSuccess(response.data);
        }
      } else {
        showToast.error('Payment verification failed');
      }
    } catch (error) {
      showToast.error('Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackClose = () => {
    showToast.warning('Payment cancelled');
  };

  const componentProps = {
    ...config,
    text: 'Pay with Paystack',
    onSuccess: handlePaystackSuccess,
    onClose: handlePaystackClose,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🌟</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pay with Paystack
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Multiple payment options available
        </p>
      </div>

      {/* Amount Display */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Amount to Pay:</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            KES {amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payment Channels */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Available payment methods:
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>💳</span> Credit/Debit Card
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>🏦</span> Bank Transfer
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>📱</span> Mobile Money
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>📞</span> USSD
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <div className="space-y-3">
        <PaystackButton
          {...componentProps}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        />
        
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Secured by Paystack • PCI Compliant
      </div>
    </motion.div>
  );
};

export default PaystackPayment;
