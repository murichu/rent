import React from 'react';
import { motion } from 'framer-motion';

/**
 * Zillow-style Neighborhood Insights & Scores
 */
const NeighborhoodInsights = ({ location = 'Westlands, Nairobi' }) => {
  const scores = [
    {
      category: 'Walk Score',
      score: 85,
      rating: 'Very Walkable',
      description: 'Most errands can be accomplished on foot',
      icon: '🚶',
      color: 'green',
    },
    {
      category: 'Transit Score',
      score: 78,
      rating: 'Excellent Transit',
      description: 'Convenient for most trips',
      icon: '🚌',
      color: 'blue',
    },
    {
      category: 'Safety Score',
      score: 92,
      rating: 'Very Safe',
      description: 'Low crime rate, 24/7 security',
      icon: '🔒',
      color: 'green',
    },
  ];

  const amenities = [
    { icon: '🏪', label: 'Supermarkets', count: 5, distance: '500m' },
    { icon: '🏥', label: 'Hospitals', count: 2, distance: '1.2km' },
    { icon: '🏫', label: 'Schools', count: 8, distance: '800m' },
    { icon: '🍽️', label: 'Restaurants', count: 24, distance: '300m' },
    { icon: '⛽', label: 'Gas Stations', count: 3, distance: '600m' },
    { icon: '🏦', label: 'Banks/ATMs', count: 12, distance: '400m' },
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          About {location}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Neighborhood insights and local amenities
        </p>
      </div>

      {/* Neighborhood Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scores.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{item.icon}</div>
              <div className={`w-16 h-16 rounded-full ${getScoreBg(item.score)} flex items-center justify-center`}>
                <span className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                  {item.score}
                </span>
              </div>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {item.category}
            </h3>
            <p className={`font-medium mb-2 ${getScoreColor(item.score)}`}>
              {item.rating}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Nearby Amenities */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 dark:text-white mb-6 text-xl">
          📍 What's Nearby
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {amenities.map((amenity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="text-3xl">{amenity.icon}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {amenity.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {amenity.count} within {amenity.distance}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Map Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-xl">
          🗺️ Explore the Area
        </h3>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-3">🗺️</div>
            <p className="text-gray-600 dark:text-gray-400">Interactive map coming soon</p>
            <button className="mt-4 px-4 py-2 bg-haven-blue text-white rounded-lg hover:bg-haven-600 transition-colors">
              View on Map
            </button>
          </div>
        </div>
      </div>

      {/* Community Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          <span className="text-2xl">🏘️</span>
          Community Vibe
        </h3>
        <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
          Westlands is a vibrant, cosmopolitan neighborhood known for its mix of residential and commercial properties. 
          Popular with young professionals and families, it offers excellent amenities, nightlife, and easy access to 
          the CBD. The area has seen significant development in recent years with modern apartments and shopping centers.
        </p>
      </div>
    </div>
  );
};

export default NeighborhoodInsights;
