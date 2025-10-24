/**
 * Currency Utility Functions
 * Provides comprehensive currency formatting and conversion utilities
 */

// Supported currencies with detailed information
export const SUPPORTED_CURRENCIES = {
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    flag: '🇰🇪',
    decimals: 2,
    locale: 'en-KE',
    popular: true,
    region: 'East Africa'
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    decimals: 2,
    locale: 'en-US',
    popular: true,
    region: 'North America'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    decimals: 2,
    locale: 'en-EU',
    popular: true,
    region: 'Europe'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    decimals: 2,
    locale: 'en-GB',
    popular: true,
    region: 'Europe'
  },
  UGX: {
    code: 'UGX',
    name: 'Ugandan Shilling',
    symbol: 'USh',
    flag: '🇺🇬',
    decimals: 0,
    locale: 'en-UG',
    popular: false,
    region: 'East Africa'
  },
  TZS: {
    code: 'TZS',
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    flag: '🇹🇿',
    decimals: 0,
    locale: 'en-TZ',
    popular: false,
    region: 'East Africa'
  },
  RWF: {
    code: 'RWF',
    name: 'Rwandan Franc',
    symbol: 'RF',
    flag: '🇷🇼',
    decimals: 0,
    locale: 'en-RW',
    popular: false,
    region: 'East Africa'
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    flag: '🇿🇦',
    decimals: 2,
    locale: 'en-ZA',
    popular: false,
    region: 'Southern Africa'
  },
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    flag: '🇳🇬',
    decimals: 2,
    locale: 'en-NG',
    popular: false,
    region: 'West Africa'
  },
  GHS: {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: '₵',
    flag: '🇬🇭',
    decimals: 2,
    locale: 'en-GH',
    popular: false,
    region: 'West Africa'
  }
};

// Get currency list grouped by region
export const getCurrenciesByRegion = () => {
  const regions = {};
  
  Object.values(SUPPORTED_CURRENCIES).forEach(currency => {
    if (!regions[currency.region]) {
      regions[currency.region] = [];
    }
    regions[currency.region].push(currency);
  });
  
  // Sort currencies within each region
  Object.keys(regions).forEach(region => {
    regions[region].sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.name.localeCompare(b.name);
    });
  });
  
  return regions;
};

// Get popular currencies
export const getPopularCurrencies = () => {
  return Object.values(SUPPORTED_CURRENCIES)
    .filter(currency => currency.popular)
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Format currency amount
export const formatCurrency = (amount, currencyCode = 'KES', options = {}) => {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) {
    console.warn(`Unsupported currency: ${currencyCode}`);
    return `${amount}`;
  }
  
  const {
    showSymbol = true,
    showCode = false,
    minimumFractionDigits = currency.decimals,
    maximumFractionDigits = currency.decimals,
    useGrouping = true,
    locale = currency.locale
  } = options;
  
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping
    });
    
    let formatted = formatter.format(amount);
    
    // For currencies without Intl support, use manual formatting
    if (!showSymbol || formatted === amount.toString()) {
      const numberFormatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
        useGrouping
      }).format(amount);
      
      formatted = showSymbol ? `${currency.symbol} ${numberFormatted}` : numberFormatted;
    }
    
    // Add currency code if requested
    if (showCode) {
      formatted += ` ${currencyCode}`;
    }
    
    return formatted;
  } catch (error) {
    console.error('Currency formatting error:', error);
    return `${currency.symbol} ${amount}`;
  }
};

// Parse currency string to number
export const parseCurrency = (currencyString, currencyCode = 'KES') => {
  if (typeof currencyString === 'number') return currencyString;
  if (!currencyString) return 0;
  
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) return parseFloat(currencyString) || 0;
  
  // Remove currency symbols and codes
  let cleaned = currencyString.toString()
    .replace(new RegExp(currency.symbol, 'g'), '')
    .replace(new RegExp(currencyCode, 'g'), '')
    .replace(/[^\d.,\-]/g, '')
    .trim();
  
  // Handle different decimal separators
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Assume comma is thousands separator
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    // Could be decimal separator in some locales
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  return parseFloat(cleaned) || 0;
};

// Convert amount between currencies (placeholder for future exchange rate integration)
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  // Placeholder conversion rates (in production, fetch from API)
  const exchangeRates = {
    KES: { USD: 0.0067, EUR: 0.0061, GBP: 0.0052 },
    USD: { KES: 149.25, EUR: 0.91, GBP: 0.78 },
    EUR: { KES: 164.21, USD: 1.10, GBP: 0.86 },
    GBP: { KES: 191.35, USD: 1.28, EUR: 1.16 }
  };
  
  const rate = exchangeRates[fromCurrency]?.[toCurrency];
  if (!rate) {
    console.warn(`Exchange rate not available: ${fromCurrency} to ${toCurrency}`);
    return amount;
  }
  
  return amount * rate;
};

// Get currency symbol
export const getCurrencySymbol = (currencyCode) => {
  return SUPPORTED_CURRENCIES[currencyCode]?.symbol || currencyCode;
};

// Get currency info
export const getCurrencyInfo = (currencyCode) => {
  return SUPPORTED_CURRENCIES[currencyCode] || null;
};

// Validate currency code
export const isValidCurrency = (currencyCode) => {
  return currencyCode in SUPPORTED_CURRENCIES;
};

// Format currency for input fields
export const formatCurrencyInput = (value, currencyCode = 'KES') => {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) return value;
  
  const numValue = parseCurrency(value, currencyCode);
  return formatCurrency(numValue, currencyCode, {
    showSymbol: false,
    useGrouping: false
  });
};

// Get currency display name with flag
export const getCurrencyDisplayName = (currencyCode) => {
  const currency = SUPPORTED_CURRENCIES[currencyCode];
  if (!currency) return currencyCode;
  
  return `${currency.flag} ${currency.name} (${currency.code})`;
};

export default {
  SUPPORTED_CURRENCIES,
  getCurrenciesByRegion,
  getPopularCurrencies,
  formatCurrency,
  parseCurrency,
  convertCurrency,
  getCurrencySymbol,
  getCurrencyInfo,
  isValidCurrency,
  formatCurrencyInput,
  getCurrencyDisplayName
};