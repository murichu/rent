import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Three-dot Quick Actions Menu (Standard pattern)
 */
const QuickActionsMenu = ({ actions = [], position = 'bottom-right' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'top-full right-0 mt-2',
    'bottom-left': 'top-full left-0 mt-2',
    'top-right': 'bottom-full right-0 mb-2',
    'top-left': 'bottom-full left-0 mb-2',
  };

  return (
    <div className="relative">
      {/* Three Dots Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        aria-label="More actions"
      >
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute ${positionClasses[position]} w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-20`}
            >
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick && action.onClick();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                    action.danger
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
                    index > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''
                  }`}
                >
                  {action.icon && (
                    <span className="text-xl">{action.icon}</span>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{action.label}</p>
                    {action.subtitle && (
                      <p className={`text-xs ${action.danger ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {action.subtitle}
                      </p>
                    )}
                  </div>
                  {action.badge && (
                    <span className="px-2 py-0.5 bg-haven-blue text-white text-xs rounded-full">
                      {action.badge}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickActionsMenu;
