import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Booking.com-style Pricing Breakdown
 */
const PricingBreakdown = ({ baseRent, charges = [], taxes = [], deposit = 0, highlighted = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const serviceCharge = charges.find(c => c.type === 'service')?.amount || 0;
  const subtotal = baseRent + serviceCharge + charges.reduce((sum, c) => sum + (c.amount || 0), 0);
  const taxAmount = (subtotal * (taxes[0]?.rate || 0.16));
  const total = subtotal + taxAmount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-6 ${
        highlighted
          ? 'bg-gradient-to-br from-haven-blue to-haven-purple text-white shadow-xl'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          Price Breakdown
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`text-sm font-medium ${
            highlighted ? 'text-white/90 hover:text-white' : 'text-haven-blue hover:text-haven-600'
          }`}
        >
          {isExpanded ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Summary (Always Visible) */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className={highlighted ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}>
            Monthly Rent
          </span>
          <span className={`font-semibold ${highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            KES {baseRent.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {charges.map((charge, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className={highlighted ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}>
                    {charge.label}
                  </span>
                  <span className={highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}>
                    KES {charge.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className={highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}>
                  Subtotal
                </span>
                <span className={highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}>
                  KES {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={highlighted ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}>
                  VAT (16%)
                </span>
                <span className={highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}>
                  KES {taxAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Total */}
      <div className={`pt-4 border-t ${highlighted ? 'border-white/30' : 'border-gray-200 dark:border-gray-700'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-lg font-bold ${highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            Total
          </span>
          <span className={`text-2xl font-bold ${highlighted ? 'text-white' : 'text-haven-blue'}`}>
            KES {total.toLocaleString()}/mo
          </span>
        </div>
        {!isExpanded && (
          <p className={`text-xs mt-1 ${highlighted ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>
            Including taxes and fees
          </p>
        )}
      </div>

      {/* Security Deposit */}
      {deposit > 0 && (
        <div className={`mt-4 p-3 rounded-lg ${highlighted ? 'bg-white/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
          <div className="flex items-center justify-between text-sm">
            <span className={highlighted ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}>
              Security Deposit
            </span>
            <span className={`font-semibold ${highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              KES {deposit.toLocaleString()}
            </span>
          </div>
          <p className={`text-xs mt-1 ${highlighted ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>
            Refundable at end of lease
          </p>
        </div>
      )}

      {/* Price per sqft */}
      <div className={`mt-4 text-center text-sm ${highlighted ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>
        📐 KES {Math.round(baseRent / 850)}/sqft
      </div>
    </motion.div>
  );
};

export default PricingBreakdown;
