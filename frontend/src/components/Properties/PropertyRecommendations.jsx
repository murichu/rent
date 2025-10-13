import React from 'react';
import { motion } from 'framer-motion';
import PropertyCard from './PropertyCard';

/**
 * Airbnb-style "Similar properties you might like"
 */
const PropertyRecommendations = ({ currentProperty, recommendations = [], title = 'Similar Properties' }) => {
  return (
    <div className="py-12 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Based on location, price, and features
          </p>
        </div>
        <button className="text-haven-blue hover:underline font-medium">
          See all →
        </button>
      </div>

      {/* Horizontal Scroll Grid */}
      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {recommendations.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-80"
            >
              <PropertyCard property={property} view="grid" />
              
              {/* Why Recommended */}
              <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-100 font-medium">
                  💡 Similar location • {property.bedrooms} BR like yours
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Scroll Indicators */}
        <button className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Recommendation Algorithm Info */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <strong>AI-Powered:</strong> Recommendations based on your viewing history, preferences, and similar properties
        </p>
      </div>
    </div>
  );
};

export default PropertyRecommendations;
