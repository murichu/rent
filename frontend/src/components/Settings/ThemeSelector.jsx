import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { motion } from 'framer-motion';

const ThemeSelector = () => {
  const { themeMode, setTheme } = useTheme();

  const themes = [
    {
      id: 'light',
      name: 'Light',
      description: 'Bright and clear',
      icon: '☀️',
      preview: 'bg-white border-gray-300',
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes',
      icon: '🌙',
      preview: 'bg-gray-900 border-gray-700',
    },
    {
      id: 'system',
      name: 'System',
      description: 'Match your device',
      icon: '💻',
      preview: 'bg-gradient-to-r from-white to-gray-900',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Theme Preference
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how Haven should look
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <motion.button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`p-6 rounded-xl border-2 transition-all ${
              themeMode === theme.id
                ? 'border-haven-blue bg-haven-blue/10 shadow-lg'
                : 'border-gray-300 dark:border-gray-600 hover:border-haven-blue/50'
            }`}
          >
            {/* Icon */}
            <div className="text-5xl mb-3 text-center">{theme.icon}</div>

            {/* Name */}
            <h4 className="font-semibold text-gray-900 dark:text-white text-center mb-1">
              {theme.name}
            </h4>

            {/* Description */}
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center mb-3">
              {theme.description}
            </p>

            {/* Preview */}
            <div className={`h-8 rounded-lg border ${theme.preview}`}></div>

            {/* Selected Indicator */}
            {themeMode === theme.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="mt-3 flex items-center justify-center gap-1 text-haven-blue text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Active
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Current theme: <strong className="capitalize">{themeMode}</strong>
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              {themeMode === 'system'
                ? 'Theme automatically matches your device settings'
                : `Theme is set to ${themeMode} mode`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
