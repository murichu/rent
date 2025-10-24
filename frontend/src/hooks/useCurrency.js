import { useCallback } from 'react';
import { useSettingsStore } from '../store/index';
import { formatCurrency, parseCurrency, getCurrencySymbol, getCurrencyInfo } from '../utils/currency';

/**
 * Currency Hook
 * Provides currency formatting and utilities based on user settings
 */
export const useCurrency = () => {
  const { userSettings } = useSettingsStore();
  const currentCurrency = userSettings?.currency || 'KES';
  
  // Format amount with user's preferred currency
  const format = useCallback((amount, options = {}) => {
    return formatCurrency(amount, currentCurrency, options);
  }, [currentCurrency]);
  
  // Parse currency string to number
  const parse = useCallback((currencyString) => {
    return parseCurrency(currencyString, currentCurrency);
  }, [currentCurrency]);
  
  // Get currency symbol
  const symbol = useCallback(() => {
    return getCurrencySymbol(currentCurrency);
  }, [currentCurrency]);
  
  // Get currency info
  const info = useCallback(() => {
    return getCurrencyInfo(currentCurrency);
  }, [currentCurrency]);
  
  // Format for display in tables/lists
  const formatCompact = useCallback((amount) => {
    return formatCurrency(amount, currentCurrency, {
      showSymbol: true,
      showCode: false,
      useGrouping: true
    });
  }, [currentCurrency]);
  
  // Format for input fields
  const formatInput = useCallback((amount) => {
    return formatCurrency(amount, currentCurrency, {
      showSymbol: false,
      useGrouping: false
    });
  }, [currentCurrency]);
  
  // Format with currency code for exports/reports
  const formatWithCode = useCallback((amount) => {
    return formatCurrency(amount, currentCurrency, {
      showSymbol: true,
      showCode: true
    });
  }, [currentCurrency]);
  
  return {
    currency: currentCurrency,
    format,
    parse,
    symbol,
    info,
    formatCompact,
    formatInput,
    formatWithCode
  };
};

export default useCurrency;