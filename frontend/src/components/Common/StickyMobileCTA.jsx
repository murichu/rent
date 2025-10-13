import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Airbnb-style Sticky Mobile CTA Bar
 */
const StickyMobileCTA = ({ price, action, secondaryAction, show = true }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling 300px
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl p-4"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Price */}
            <div>
              {price && (
                <>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    KES {price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Including taxes
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className="px-4 py-3 border-2 border-haven-blue text-haven-blue rounded-lg font-semibold hover:bg-haven-50 dark:hover:bg-haven-900/20 transition-colors"
                >
                  {secondaryAction.icon && <span className="mr-2">{secondaryAction.icon}</span>}
                  {secondaryAction.label}
                </button>
              )}
              <button
                onClick={action.onClick}
                className="px-6 py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors shadow-lg flex items-center gap-2"
              >
                {action.icon && <span>{action.icon}</span>}
                {action.label}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyMobileCTA;
