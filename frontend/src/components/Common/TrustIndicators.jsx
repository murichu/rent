import React from 'react';
import { motion } from 'framer-motion';

/**
 * Airbnb-style Trust Indicators & Badges
 */
const TrustIndicators = ({ manager, property, type = 'manager' }) => {
  if (type === 'manager') {
    const badges = [
      { icon: '✓', label: 'Verified Manager', color: 'green', verified: true },
      { icon: '⚡', label: 'Quick Responder', subtitle: '< 1 hour', color: 'yellow', verified: manager?.responseTime < 3600 },
      { icon: '⭐', label: 'Top Rated', subtitle: '4.9/5.0', color: 'blue', verified: manager?.rating >= 4.8 },
      { icon: '🏆', label: 'Experienced', subtitle: `${manager?.propertyCount || 48} properties`, color: 'purple', verified: manager?.propertyCount >= 10 },
      { icon: '📧', label: 'Email Verified', color: 'green', verified: manager?.emailVerified },
      { icon: '🔒', label: '2FA Enabled', color: 'blue', verified: manager?.twoFactorEnabled },
      { icon: '🎖️', label: 'Member', subtitle: 'Since 2020', color: 'gray', verified: true },
    ];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          Trust & Verification
        </h3>
        <div className="space-y-3">
          {badges.filter(b => b.verified).map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className={`w-8 h-8 rounded-full bg-${badge.color}-100 dark:bg-${badge.color}-900/30 flex items-center justify-center`}>
                <span className="text-lg">{badge.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {badge.label}
                </p>
                {badge.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {badge.subtitle}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'property') {
    const verifications = [
      { label: 'Photos verified', verified: property?.photosVerified },
      { label: 'Address confirmed', verified: property?.addressConfirmed },
      { label: 'Amenities accurate', verified: property?.amenitiesAccurate },
      { label: 'Recently inspected', verified: property?.recentlyInspected },
    ];

    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Verified Property
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {verifications.filter(v => v.verified).map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default SmartSearch;
