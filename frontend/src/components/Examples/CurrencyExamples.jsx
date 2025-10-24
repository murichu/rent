import React, { useState } from 'react';
import CurrencySelector from '../CurrencySelector';
import CurrencyInput from '../CurrencyInput';
import { useCurrency } from '../../hooks/useCurrency';
import { formatCurrency, getCurrencyDisplayName } from '../../utils/currency';

/**
 * Currency Examples Component
 * Demonstrates usage of currency components and utilities
 */
const CurrencyExamples = () => {
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [amount, setAmount] = useState(50000);
  const { format, formatCompact, formatWithCode } = useCurrency();
  
  const exampleAmounts = [1000, 50000, 150000, 1500000];
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Currency System Examples
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Demonstration of currency selection, formatting, and input components.
        </p>
      </div>
      
      {/* Currency Selector Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Currency Selector
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Currency
            </label>
            <CurrencySelector
              value={selectedCurrency}
              onChange={setSelectedCurrency}
              showPopular={true}
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Selected:</strong> {getCurrencyDisplayName(selectedCurrency)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Currency Input Example */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Currency Input
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Amount
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="Enter amount"
              min={0}
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Value:</strong> {amount}
            </div>
          </div>
        </div>
      </div>
      
      {/* Formatting Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Currency Formatting Examples
        </h3>
        <div className="space-y-4">
          {exampleAmounts.map((exampleAmount) => (
            <div key={exampleAmount} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Raw Amount
                </div>
                <div className="font-mono text-sm">
                  {exampleAmount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Standard Format
                </div>
                <div className="font-medium">
                  {formatCurrency(exampleAmount, selectedCurrency)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Compact Format
                </div>
                <div className="font-medium">
                  {formatCurrency(exampleAmount, selectedCurrency, { useGrouping: true })}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  With Code
                </div>
                <div className="font-medium">
                  {formatCurrency(exampleAmount, selectedCurrency, { showCode: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* User Settings Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          User Settings Integration
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                User's Currency Format
              </div>
              <div className="font-medium text-lg">
                {format(amount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Compact Display
              </div>
              <div className="font-medium text-lg">
                {formatCompact(amount)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                With Currency Code
              </div>
              <div className="font-medium text-lg">
                {formatWithCode(amount)}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            These formats automatically use the currency selected in user settings.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyExamples;