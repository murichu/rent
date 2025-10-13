import React from 'react';
import { motion } from 'framer-motion';

const ActivityFeed = () => {
  const activities = [
    {
      id: 1,
      type: 'payment',
      user: 'John Doe',
      action: 'paid rent for Apt 204',
      amount: '$1,200',
      time: '5 minutes ago',
      icon: '💰',
      color: 'green',
    },
    {
      id: 2,
      type: 'lease',
      user: 'Jane Smith',
      action: 'signed lease for Apt 305',
      time: '1 hour ago',
      icon: '📋',
      color: 'blue',
    },
    {
      id: 3,
      type: 'maintenance',
      user: 'Bob Johnson',
      action: 'submitted maintenance request',
      time: '2 hours ago',
      icon: '🔧',
      color: 'yellow',
    },
    {
      id: 4,
      type: 'property',
      user: 'Admin',
      action: 'added new property: Sunset Villa',
      time: '3 hours ago',
      icon: '🏢',
      color: 'purple',
    },
    {
      id: 5,
      type: 'tenant',
      user: 'Sarah Wilson',
      action: 'gave move-out notice',
      time: '5 hours ago',
      icon: '👋',
      color: 'red',
    },
  ];

  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses[activity.color]}`}>
            <span className="text-lg">{activity.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 dark:text-white">
              <span className="font-medium">{activity.user}</span> {activity.action}
            </p>
            {activity.amount && (
              <p className="text-sm font-medium text-green-600 dark:text-green-400">{activity.amount}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ActivityFeed;
