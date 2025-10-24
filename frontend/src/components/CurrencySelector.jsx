import React, { useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { getCurrenciesByRegion, getPopularCurrencies, getCurrencyDisplayName } from '../utils/currency';

/**
 * Enhanced Currency Selector Component
 * Provides a searchable, grouped currency selection interface
 */
const CurrencySelector = ({ 
  value, 
  onChange, 
  className = '',
  placeholder = 'Select currency',
  showPopular = true,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currenciesByRegion = getCurrenciesByRegion();
  const popularCurrencies = getPopularCurrencies();
  
  // Filter currencies based on search term
  const filterCurrencies = (currencies) => {
    if (!searchTerm) return currencies;
    
    return currencies.filter(currency =>
      currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };
  
  const handleSelect = (currencyCode) => {
    onChange(currencyCode);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const selectedCurrency = value ? getCurrencyDisplayName(value) : placeholder;
  
  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-left
          border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
          bg-white dark:bg-gray-700 text-gray-900 dark:text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer'}
          transition-colors duration-200
        `}
      >
        <span className="truncate">{selectedCurrency}</span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-600">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search currencies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Currency List */}
            <div className="max-h-64 overflow-y-auto">
              {/* Popular Currencies */}
              {showPopular && !searchTerm && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Popular
                  </div>
                  {popularCurrencies.map((currency) => (
                    <CurrencyOption
                      key={`popular-${currency.code}`}
                      currency={currency}
                      isSelected={value === currency.code}
                      onClick={() => handleSelect(currency.code)}
                    />
                  ))}
                </div>
              )}
              
              {/* Currencies by Region */}
              {Object.entries(currenciesByRegion).map(([region, currencies]) => {
                const filteredCurrencies = filterCurrencies(currencies);
                
                if (filteredCurrencies.length === 0) return null;
                
                return (
                  <div key={region}>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      {region}
                    </div>
                    {filteredCurrencies.map((currency) => (
                      <CurrencyOption
                        key={currency.code}
                        currency={currency}
                        isSelected={value === currency.code}
                        onClick={() => handleSelect(currency.code)}
                      />
                    ))}
                  </div>
                );
              })}
              
              {/* No Results */}
              {searchTerm && Object.values(currenciesByRegion).every(currencies => 
                filterCurrencies(currencies).length === 0
              ) && (
                <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No currencies found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Currency Option Component
 */
const CurrencyOption = ({ currency, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150
      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}
    `}
  >
    <div className="flex items-center space-x-3">
      <span className="text-lg">{currency.flag}</span>
      <div>
        <div className="font-medium">{currency.name}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currency.symbol} • {currency.code}
        </div>
      </div>
    </div>
    {isSelected && (
      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    )}
  </button>
);

export default CurrencySelector;