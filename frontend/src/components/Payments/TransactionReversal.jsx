import React, { useState } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';
import api from '../../services/api';

const TransactionReversal = ({ transaction, onSuccess, onCancel }) => {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleReverse = async () => {
    if (!confirmed) {
      showToast.warning('Please confirm that you want to reverse this transaction');
      return;
    }

    setLoading(true);

    try {
      const response = await api.mpesa.reverseTransaction({
        transactionId: transaction.mpesaReceiptNumber,
        amount: transaction.amount,
        remarks: remarks || 'Transaction reversal requested by admin',
      });

      showToast.success('Reversal initiated! Funds will be returned to customer.');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to reverse transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Reverse Transaction
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This will refund the payment to the customer
        </p>
      </div>

      {/* Transaction Details */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
          <span className="font-mono text-gray-900 dark:text-white">{transaction.mpesaReceiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Amount:</span>
          <span className="font-bold text-gray-900 dark:text-white">KES {transaction.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Phone:</span>
          <span className="font-mono text-gray-900 dark:text-white">{transaction.phoneNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Date:</span>
          <span className="text-gray-900 dark:text-white">
            {new Date(transaction.transactionDate).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Remarks */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reversal Reason
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter reason for reversal..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
        />
      </div>

      {/* Confirmation */}
      <label className="flex items-center gap-3 mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500"
        />
        <span className="text-sm text-red-800 dark:text-red-200 font-medium">
          I confirm this reversal will refund KES {transaction.amount.toLocaleString()} to the customer
        </span>
      </label>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Warning</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              This action cannot be undone. Funds will be credited back to customer's M-Pesa account.
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleReverse}
          disabled={!confirmed || loading}
          className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Reverse Transaction'}
        </button>
      </div>
    </motion.div>
  );
};

export default TransactionReversal;
