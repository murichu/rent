import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';
import api from '../../services/api';

const AccountBalance = () => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    fetchLatestBalance();
  }, []);

  const fetchLatestBalance = async () => {
    try {
      const response = await api.mpesa.getLatestBalance();
      if (response.data) {
        setBalance(response.data);
        setLastChecked(new Date(response.data.completedAt));
      }
    } catch (error) {
      // No balance data yet
      console.log('No balance data available');
    }
  };

  const handleCheckBalance = async () => {
    setLoading(true);

    try {
      await api.mpesa.checkBalance();
      showToast.info('Balance check initiated. Results will be available shortly.');

      // Poll for results
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const response = await api.mpesa.getLatestBalance();
          const latestBalance = response.data;

          // Check if this is a new balance check
          if (!lastChecked || new Date(latestBalance.completedAt) > lastChecked) {
            setBalance(latestBalance);
            setLastChecked(new Date(latestBalance.completedAt));
            clearInterval(pollInterval);
            setLoading(false);
            showToast.success('Balance updated!');
          }
        } catch (error) {
          // Still waiting
        }

        if (attempts >= 10) {
          clearInterval(pollInterval);
          setLoading(false);
          showToast.warning('Balance check is taking longer than expected');
        }
      }, 3000);
    } catch (error) {
      showToast.error('Failed to check balance');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-8 text-white"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-green-100 text-sm mb-1">M-Pesa Account Balance</p>
            <h2 className="text-4xl font-bold">
              {balance ? `KES ${balance.availableBalance.toLocaleString()}` : '---'}
            </h2>
          </div>
          <div className="text-6xl">💰</div>
        </div>

        {balance && (
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-6 text-sm">
            <p className="text-green-50">
              Last checked: {lastChecked ? new Date(lastChecked).toLocaleString() : 'Never'}
            </p>
            {balance.accountBalance && (
              <p className="text-green-50 mt-2 text-xs">
                {balance.accountBalance}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleCheckBalance}
          disabled={loading}
          className="w-full py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Balance
            </>
          )}
        </button>
      </div>

      {!balance && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Click the button above to check your M-Pesa account balance
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default AccountBalance;
