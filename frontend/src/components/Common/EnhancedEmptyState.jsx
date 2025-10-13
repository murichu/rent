import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * Airbnb/Booking.com-style Enhanced Empty States
 */
const EnhancedEmptyState = ({
  icon = '📭',
  title = 'No items found',
  description = 'Get started by adding your first item',
  primaryAction,
  secondaryActions = [],
  illustration = null,
  tips = [],
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Illustration or Icon */}
      {illustration ? (
        <div className="mb-8">
          <img src={illustration} alt="Empty state" className="w-64 h-64 object-contain" />
        </div>
      ) : (
        <div className="text-8xl mb-6">
          {icon}
        </div>
      )}

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h2>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
        {description}
      </p>

      {/* Primary Action */}
      {primaryAction && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mb-6"
        >
          {primaryAction.href ? (
            <Link
              to={primaryAction.href}
              className="inline-flex items-center gap-2 px-8 py-4 bg-haven-blue text-white rounded-xl font-semibold hover:bg-haven-600 transition-all shadow-lg hover:shadow-xl"
            >
              {primaryAction.icon && <span className="text-xl">{primaryAction.icon}</span>}
              {primaryAction.label}
            </Link>
          ) : (
            <button
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-2 px-8 py-4 bg-haven-blue text-white rounded-xl font-semibold hover:bg-haven-600 transition-all shadow-lg hover:shadow-xl"
            >
              {primaryAction.icon && <span className="text-xl">{primaryAction.icon}</span>}
              {primaryAction.label}
            </button>
          )}
        </motion.div>
      )}

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {secondaryActions.map((action, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={action.onClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div className="max-w-md">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <span>💡</span> Pro Tips
            </h3>
            <ul className="space-y-2 text-left text-sm text-blue-800 dark:text-blue-200">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Help Link */}
      <div className="mt-8">
        <Link
          to="/help"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-haven-blue transition-colors"
        >
          Need help? View documentation →
        </Link>
      </div>
    </motion.div>
  );
};

export default EnhancedEmptyState;
