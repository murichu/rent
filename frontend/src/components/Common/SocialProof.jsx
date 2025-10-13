import React from 'react';
import { motion } from 'framer-motion';

/**
 * Booking.com-style Social Proof & Urgency Indicators
 */
const SocialProof = ({ type = 'booking', data }) => {
  const proofTypes = {
    booking: {
      icon: '👥',
      message: `${data.count || 3} people viewing this property`,
      color: 'blue',
    },
    recent: {
      icon: '✅',
      message: `${data.count || 2} leases signed today`,
      color: 'green',
    },
    popular: {
      icon: '🔥',
      message: 'High demand - Often booked',
      color: 'orange',
    },
    limited: {
      icon: '⏰',
      message: `Only ${data.count || 2} units available`,
      color: 'red',
    },
    trending: {
      icon: '📈',
      message: 'Trending in your area',
      color: 'purple',
    },
    verified: {
      icon: '🏆',
      message: 'Top 10% of properties',
      color: 'yellow',
    },
  };

  const proof = proofTypes[type] || proofTypes.booking;

  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${colorClasses[proof.color]} text-sm font-medium`}
    >
      <span className="text-lg">{proof.icon}</span>
      <span>{proof.message}</span>
    </motion.div>
  );
};

/**
 * Multiple Social Proof Indicators
 */
export const SocialProofBanner = ({ indicators = [] }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {indicators.map((indicator, index) => (
        <SocialProof key={index} {...indicator} />
      ))}
    </div>
  );
};

export default SocialProof;
