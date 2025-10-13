import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';
import api from '../../services/api';

/**
 * Pesapal Card Payment Component
 * Fees (3.5% + KES 50) charged to customer
 */
const PesapalPayment = ({ amount, leaseId, email, phone, name, onSuccess, onCancel }) => {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  useEffect(() => {
    calculateFees();
  }, [amount]);

  const calculateFees = async () => {
    try {
      const response = await api.pesapal.calculateFees(amount);
      setPricing(response.data);
    } catch (error) {
      showToast.error('Failed to calculate fees');
    }
  };

  const handleInitiatePayment = async () => {
    if (!email || !phone || !name) {
      showToast.error('Please provide contact details');
      return;
    }

    setLoading(true);

    try {
      const response = await api.pesapal.initiate({
        amount,
        email,
        phone,
        name,
        leaseId,
        provider: 'pesapal',
      });

      // Redirect to Pesapal payment page
      window.open(response.data.redirectUrl, '_blank');
      
      showToast.info('Complete payment on the new page opened');
      
      // Start polling for status
      startPolling(response.data.merchantReference);
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  const startPolling = (merchantRef) => {
    let attempts = 0;
    const maxAttempts = 60; // 3 minutes

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await api.pesapal.getStatusDetailed(merchantRef);
        const status = response.data.status;

        if (status === 'SUCCESS') {
          clearInterval(interval);
          setLoading(false);
          showToast.success('Payment completed successfully! 🎉');
          if (onSuccess) {
            onSuccess(response.data);
          }
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          clearInterval(interval);
          setLoading(false);
          showToast.error(response.data.userMessage || 'Payment failed');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setLoading(false);
          showToast.warning('Payment verification timed out. Check status later.');
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setLoading(false);
        }
      }
    }, 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">💳</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pay with Card
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Powered by Pesapal (Kenya)
        </p>
      </div>

      {/* Pricing Breakdown with Fees */}
      {pricing && (
        <div className="mb-6 space-y-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Rent Amount:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                KES {pricing.baseAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Pesapal Fees (3.5% + KES 50):
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                KES {pricing.fees.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 dark:text-white">
                  Total to Pay:
                </span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  KES {pricing.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Explanation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">About Pesapal Fees</p>
                <p>Card payment processing fees (3.5% + KES 50) are charged to ensure secure transactions. Your landlord receives the full rent amount.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supported Cards */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Accepted payment methods:
        </p>
        <div className="flex gap-3 items-center">
          <div className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            <span className="font-bold text-blue-600">VISA</span>
          </div>
          <div className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            <span className="font-bold text-orange-600">Mastercard</span>
          </div>
          <div className="px-3 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            <span className="text-sm text-gray-600 dark:text-gray-400">+ More</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleInitiatePayment}
          disabled={loading || !pricing}
          className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Pay KES ${pricing?.totalAmount.toLocaleString() || '...'}`}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Secured by Pesapal • PCI DSS Compliant
      </div>

      {/* Pesapal Logo */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">Powered by</p>
        <p className="text-sm font-bold text-green-600">Pesapal</p>
      </div>
    </motion.div>
  );
};

export default PesapalPayment;
