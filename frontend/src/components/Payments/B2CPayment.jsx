import React, { useState } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';
import api from '../../services/api';

const B2CPayment = ({ onSuccess, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [occasion, setOccasion] = useState('Refund');
  const [loading, setLoading] = useState(false);

  const occasions = ['Refund', 'Payout', 'Salary', 'Bonus', 'Commission', 'Other'];

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
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

  const handleInitiateB2C = async () => {
    if (!phoneNumber || !amount) {
      showToast.error('Please enter phone number and amount');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');
    const amountNum = parseFloat(amount);

    if (cleanPhone.length < 10 || amountNum <= 0) {
      showToast.error('Please enter valid phone number and amount');
      return;
    }

    setLoading(true);

    try {
      const response = await api.mpesa.initiateB2C({
        phoneNumber: cleanPhone,
        amount: amountNum,
        remarks: remarks || `Refund from Haven`,
        occasion: occasion,
      });

      showToast.success('B2C payment initiated! Funds will be sent to customer.');
      
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Reset form
      setPhoneNumber('');
      setAmount('');
      setRemarks('');
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Failed to initiate B2C payment');
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
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">💸</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Send Money (B2C)
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Send funds directly to customer's M-Pesa
        </p>
      </div>

      <div className="space-y-4">
        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipient Phone Number
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="0712 345 678"
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            maxLength={15}
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount (KES)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            min="10"
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Occasion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Occasion
          </label>
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {occasions.map((occ) => (
              <option key={occ} value={occ}>
                {occ}
              </option>
            ))}
          </select>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Remarks (Optional)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter transaction remarks..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            maxLength={100}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleInitiateB2C}
          disabled={!phoneNumber || !amount || loading}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Money'}
        </button>
      </div>
    </motion.div>
  );
};

export default B2CPayment;
