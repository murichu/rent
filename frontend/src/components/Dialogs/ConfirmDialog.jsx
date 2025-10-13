import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // danger, warning, info
  requireTyping = false,
  typeText = 'DELETE',
  details = null,
}) => {
  const [typedText, setTypedText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    if (requireTyping && typedText !== typeText) return;
    
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const typeColors = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: '⚠️',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: '⚡',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const colors = typeColors[type];
  const canConfirm = !requireTyping || typedText === typeText;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className={`${colors.bg} ${colors.border} border-b p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`${colors.iconBg} w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0`}>
                    {colors.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}
              {details && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    {Array.isArray(details) ? (
                      details.map((detail, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-gray-400">•</span>
                          {detail}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Type confirmation */}
              {requireTyping && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Type <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-red-600 dark:text-red-400">{typeText}</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder={typeText}
                    autoFocus
                  />
                </div>
              )}

              {/* Actions */}
              <div className="p-6 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || isLoading}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${colors.button} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
