import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

/**
 * Currency Input Component
 * Provides a formatted input field for currency amounts
 */
const CurrencyInput = ({
    value,
    onChange,
    placeholder = '0.00',
    className = '',
    disabled = false,
    required = false,
    min = 0,
    max,
    showSymbol = true,
    allowNegative = false,
    ...props
}) => {
    const { currency, format, parse, symbol } = useCurrency();
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Update display value when value prop changes
    useEffect(() => {
        if (value !== undefined && value !== null) {
            if (isFocused) {
                // Show raw number when focused for easier editing
                setDisplayValue(value.toString());
            } else {
                // Show formatted currency when not focused
                setDisplayValue(format(value, { showSymbol: false, useGrouping: true }));
            }
        } else {
            setDisplayValue('');
        }
    }, [value, format, isFocused]);

    const handleFocus = (e) => {
        setIsFocused(true);
        // Show raw number for editing
        if (value !== undefined && value !== null) {
            setDisplayValue(value.toString());
        }
        e.target.select(); // Select all text for easy replacement
    };

    const handleBlur = (e) => {
        setIsFocused(false);

        const numericValue = parseFloat(displayValue) || 0;

        // Validate constraints
        let validatedValue = numericValue;

        if (!allowNegative && validatedValue < 0) {
            validatedValue = 0;
        }

        if (min !== undefined && validatedValue < min) {
            validatedValue = min;
        }

        if (max !== undefined && validatedValue > max) {
            validatedValue = max;
        }

        // Update parent component
        if (onChange) {
            onChange(validatedValue);
        }

        // Format display value
        setDisplayValue(format(validatedValue, { showSymbol: false, useGrouping: true }));
    };

    const handleChange = (e) => {
        let inputValue = e.target.value;

        // Remove any non-numeric characters except decimal point and minus
        if (allowNegative) {
            inputValue = inputValue.replace(/[^0-9.-]/g, '');
        } else {
            inputValue = inputValue.replace(/[^0-9.]/g, '');
        }

        // Ensure only one decimal point
        const parts = inputValue.split('.');
        if (parts.length > 2) {
            inputValue = parts[0] + '.' + parts.slice(1).join('');
        }

        // Ensure only one minus sign at the beginning
        if (allowNegative) {
            const minusCount = (inputValue.match(/-/g) || []).length;
            if (minusCount > 1) {
                inputValue = inputValue.replace(/-/g, '');
                if (inputValue.charAt(0) !== '-') {
                    inputValue = '-' + inputValue;
                }
            } else if (inputValue.includes('-') && inputValue.charAt(0) !== '-') {
                inputValue = inputValue.replace('-', '');
            }
        }

        setDisplayValue(inputValue);
    };

    const handleKeyDown = (e) => {
        // Allow: backspace, delete, tab, escape, enter
        if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }

        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) &&
            (e.keyCode < 96 || e.keyCode > 105) &&
            e.keyCode !== 190 && e.keyCode !== 110) { // Allow decimal point
            e.preventDefault();
        }

        // Allow minus sign only at the beginning and if negative values are allowed
        if (e.keyCode === 189 || e.keyCode === 109) { // Minus key
            if (!allowNegative || e.target.selectionStart !== 0) {
                e.preventDefault();
            }
        }
    };

    return (
        <div className={`relative ${className}`}>
            {showSymbol && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        {symbol()}
                    </span>
                </div>
            )}

            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                className={`
          w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          dark:bg-gray-700 dark:text-white
          ${showSymbol ? 'pl-12' : 'pl-3'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-600' : ''}
        `}
                {...props}
            />

            {/* Currency Code Indicator */}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                    {currency}
                </span>
            </div>
        </div>
    );
};

export default CurrencyInput;