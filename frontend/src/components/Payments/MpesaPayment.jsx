import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import showToast from '../../utils/toast';
import api from '../../services/api';
import OTPInput from '../Auth/OTPInput';

const MpesaPayment = ({ amount, leaseId, accountReference, onSuccess, onCancel }) => {
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Waiting for payment, 3: Success/Failed
  const [phoneNumber, setPhoneNumber] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  const formatPhoneNumber = (value) => {
    // Remove non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as: 0712 345 678 or 254712 345 678
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3').trim();
    } else {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4').trim();
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const startPolling = (requestId) => {
    let attempts = 0;
    const maxAttempts = 20; // Poll for 60 seconds (20 * 3s)

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await api.mpesa.getStatus(requestId);
        const status = response.data.status;

        if (status === 'SUCCESS') {
          clearInterval(interval);
          setTransactionStatus('SUCCESS');
          setStep(3);
          showToast.success('Payment received successfully! 🎉');
          if (onSuccess) {
            onSuccess(response.data);
          }
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          clearInterval(interval);
          setTransactionStatus('FAILED');
          setStep(3);
          showToast.error('Payment failed or was cancelled');
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setTransactionStatus('TIMEOUT');
          setStep(3);
          showToast.warning('Payment verification timed out. Check status later.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  };

  const handleInitiatePayment = async () => {
    if (!phoneNumber) {
      showToast.error('Please enter a phone number');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.length < 10) {
      showToast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const response = await api.mpesa.initiateStkPush({
        phoneNumber: cleanPhone,
        amount: Math.round(amount),
        accountReference: accountReference || `Haven-${Date.now()}`,
        transactionDesc: `Rent payment - KES ${amount}`,
        leaseId: leaseId,
      });

      setCheckoutRequestId(response.data.checkoutRequestId);
      setStep(2);
      showToast.success('Payment request sent! Check your phone.');

      // Start polling for status
      startPolling(response.data.checkoutRequestId);
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Step 1: Enter Phone Number */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📱</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Pay with M-Pesa
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Enter your M-Pesa phone number to pay <strong>KES {amount.toLocaleString()}</strong>
            </p>
          </div>

          {/* Phone Number Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              M-Pesa Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="0712 345 678"
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              maxLength={15}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Format: 0712345678 or 254712345678
            </p>
          </div>

          {/* Amount Display */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount to Pay:</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                KES {amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiatePayment}
              disabled={!phoneNumber || loading}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Pay Now'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Waiting for Payment */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <span className="text-5xl">📱</span>
          </motion.div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Payment on Your Phone
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Check your phone for the M-Pesa prompt and enter your PIN
          </p>

          {/* Loading Animation */}
          <div className="flex justify-center gap-2 mb-6">
            <span className="w-3 h-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-3 h-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-3 h-3 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-left">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">📌 Instructions:</p>
            <ol className="space-y-1 text-blue-800 dark:text-blue-200 list-decimal list-inside">
              <li>Check your phone for M-Pesa prompt</li>
              <li>Enter your M-Pesa PIN</li>
              <li>Confirm the payment</li>
              <li>Wait for confirmation SMS</li>
            </ol>
          </div>

          <button
            onClick={handleCancel}
            className="mt-6 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
          >
            Cancel Payment
          </button>
        </motion.div>
      )}

      {/* Step 3: Success/Failed */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center"
        >
          {transactionStatus === 'SUCCESS' ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Successful! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your payment of <strong>KES {amount.toLocaleString()}</strong> has been received.
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 dark:text-green-200">
                  You will receive an M-Pesa confirmation SMS shortly.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment {transactionStatus === 'TIMEOUT' ? 'Pending' : 'Failed'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {transactionStatus === 'TIMEOUT'
                  ? 'Payment verification timed out. Please check your M-Pesa messages.'
                  : 'The payment was not completed. Please try again.'}
              </p>
            </>
          )}

          <button
            onClick={onCancel || handleCancel}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default MpesaPayment;
