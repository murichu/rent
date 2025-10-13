import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const ThemeCustomizer = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [layoutDensity, setLayoutDensity] = useState('comfortable');
  const [fontSize, setFontSize] = useState('medium');
  const [reducedMotion, setReducedMotion] = useState(false);

  const accentColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Red', value: '#ef4444' },
  ];

  const handleAccentColorChange = (color) => {
    setAccentColor(color);
    document.documentElement.style.setProperty('--accent-color', color);
    localStorage.setItem('accentColor', color);
  };

  const handleLayoutDensityChange = (density) => {
    setLayoutDensity(density);
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('layoutDensity', density);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    const sizeMap = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.setProperty('font-size', sizeMap[size]);
    localStorage.setItem('fontSize', size);
  };

  const handleReducedMotionToggle = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    document.documentElement.setAttribute('data-reduced-motion', newValue);
    localStorage.setItem('reducedMotion', newValue);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Theme Customization
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Personalize your experience with custom themes and layouts
        </p>
      </div>

      {/* Theme Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Theme Mode</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'light', label: 'Light', icon: '☀️' },
            { value: 'dark', label: 'Dark', icon: '🌙' },
            { value: 'auto', label: 'Auto', icon: '🔄' },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => theme.value === 'dark' ? toggleDarkMode() : null}
              className={`p-4 rounded-lg border-2 transition-all ${
                (theme.value === 'dark' && isDarkMode) || (theme.value === 'light' && !isDarkMode)
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <div className="text-3xl mb-2">{theme.icon}</div>
              <div className="font-medium text-gray-900 dark:text-white">{theme.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Accent Color</h3>
        <div className="grid grid-cols-6 gap-3">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => handleAccentColorChange(color.value)}
              className={`h-12 rounded-lg transition-all ${
                accentColor === color.value ? 'ring-4 ring-offset-2 ring-gray-400 dark:ring-gray-600' : ''
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={`Select ${color.name}`}
              title={color.name}
            >
              {accentColor === color.value && (
                <svg className="w-6 h-6 mx-auto text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Layout Density */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Layout Density</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'compact', label: 'Compact', description: 'More info, less space' },
            { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing' },
            { value: 'spacious', label: 'Spacious', description: 'More breathing room' },
          ].map((density) => (
            <button
              key={density.value}
              onClick={() => handleLayoutDensityChange(density.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                layoutDensity === density.value
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white mb-1">{density.label}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{density.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Font Size</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 flex-1">
            <span className="text-sm text-gray-600 dark:text-gray-400 w-16">Small</span>
            <input
              type="range"
              min="0"
              max="2"
              value={['small', 'medium', 'large'].indexOf(fontSize)}
              onChange={(e) => handleFontSizeChange(['small', 'medium', 'large'][parseInt(e.target.value)])}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">Large</span>
          </label>
          <span className="font-medium text-gray-900 dark:text-white w-24 text-center">
            {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
          </span>
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Accessibility</h3>
        <label className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
          <div>
            <div className="font-medium text-gray-900 dark:text-white">Reduce Motion</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Minimize animations and transitions</div>
          </div>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={handleReducedMotionToggle}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-2">Preview</h3>
        <p className="text-sm text-blue-100 mb-4">
          Your theme changes are applied immediately
        </p>
        <div className="flex gap-2">
          <button
            style={{ backgroundColor: accentColor }}
            className="px-4 py-2 rounded-lg font-medium"
          >
            Primary Button
          </button>
          <button className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg font-medium">
            Secondary Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;
