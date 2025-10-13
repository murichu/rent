import React from 'react';
import { motion } from 'framer-motion';

const InsightsDashboard = () => {
  const insights = [
    {
      type: 'warning',
      icon: '📉',
      title: 'Occupancy Rate Dropped',
      description: 'Your occupancy rate decreased by 5% this month',
      action: 'Consider reducing rent by $50 to attract tenants',
      impact: 'medium',
      color: 'yellow',
    },
    {
      type: 'opportunity',
      icon: '📈',
      title: 'Rental Market Trending Up',
      description: 'Similar properties in your area increased rent by 8%',
      action: 'You could increase rent by $100-150 on renewal',
      impact: 'high',
      color: 'green',
    },
    {
      type: 'alert',
      icon: '⚠️',
      title: 'Multiple Leases Expiring',
      description: '3 leases expiring in the next 30 days',
      action: 'Start renewal process now to avoid vacancies',
      impact: 'high',
      color: 'red',
    },
    {
      type: 'info',
      icon: '💡',
      title: 'Late Payments Increasing',
      description: 'Late payments up 20% this quarter',
      action: 'Review payment reminder timing and penalties',
      impact: 'medium',
      color: 'blue',
    },
  ];

  const predictions = {
    revenue: {
      next30days: 45200,
      confidence: 87,
      trend: 'up',
    },
    churnRisk: {
      count: 2,
      tenants: ['Apt 204', 'Apt 305'],
    },
    optimalPricing: {
      property: 'Sunset Apartments',
      current: 1200,
      suggested: 1350,
      increase: 12.5,
    },
  };

  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'bg-yellow-100 dark:bg-yellow-900/50',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'bg-green-100 dark:bg-green-900/50',
      text: 'text-green-800 dark:text-green-200',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'bg-red-100 dark:bg-red-900/50',
      text: 'text-red-800 dark:text-red-200',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'bg-blue-100 dark:bg-blue-900/50',
      text: 'text-blue-800 dark:text-blue-200',
    },
  };

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>💡</span> AI Insights for You
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {insights.map((insight, index) => {
            const colors = colorClasses[insight.color];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${colors.bg} ${colors.border} border rounded-xl p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  <div className={`${colors.icon} w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0`}>
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${colors.text} mb-1`}>{insight.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {insight.description}
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm">
                      <strong className="text-gray-900 dark:text-white">Recommendation:</strong>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">{insight.action}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {insight.impact.toUpperCase()} IMPACT
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Predictions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🔮</span> Predictions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Revenue Forecast */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Next 30 Days Revenue</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
              ${predictions.revenue.next30days.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
              <span className="font-medium text-gray-900 dark:text-white">{predictions.revenue.confidence}%</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${predictions.revenue.confidence}%` }}
                />
              </div>
            </div>
          </div>

          {/* Churn Risk */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Churn Risk</h3>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
              {predictions.churnRisk.count}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">tenants at risk</p>
            <div className="space-y-1">
              {predictions.churnRisk.tenants.map((tenant, index) => (
                <div
                  key={index}
                  className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded text-sm"
                >
                  {tenant}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Optimization */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Pricing Opportunity</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{predictions.optimalPricing.property}</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                ${predictions.optimalPricing.current}
              </span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${predictions.optimalPricing.suggested}
              </span>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
              <span>↑</span> +{predictions.optimalPricing.increase}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsDashboard;
