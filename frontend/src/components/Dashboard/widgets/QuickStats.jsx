import React from 'react';
import { motion } from 'framer-motion';

const QuickStats = () => {
  const stats = [
    {
      label: 'Total Revenue',
      value: '$45,230',
      change: '+12%',
      trend: 'up',
      icon: '💰',
      color: 'blue',
    },
    {
      label: 'Occupancy Rate',
      value: '92%',
      change: '+3%',
      trend: 'up',
      icon: '🏢',
      color: 'green',
    },
    {
      label: 'Pending Payments',
      value: '$8,500',
      change: '5 overdue',
      trend: 'down',
      icon: '⏰',
      color: 'yellow',
    },
    {
      label: 'Active Leases',
      value: '48',
      change: '3 expiring soon',
      trend: 'neutral',
      icon: '📋',
      color: 'purple',
    },
  ];

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  const bgColors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className={`w-10 h-10 rounded-lg ${bgColors[stat.color]} flex items-center justify-center text-xl`}>
              {stat.icon}
            </div>
            <span className={`text-sm font-medium ${trendColors[stat.trend]}`}>{stat.change}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default QuickStats;
