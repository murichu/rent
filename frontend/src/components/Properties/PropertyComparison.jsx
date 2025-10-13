import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Zillow-style Property Comparison View
 */
const PropertyComparison = ({ properties = [], onRemove, onClose }) => {
  const maxProperties = 4;

  const comparisonFields = [
    { key: 'image', label: 'Photo', type: 'image' },
    { key: 'title', label: 'Property Name', type: 'text' },
    { key: 'rentAmount', label: 'Monthly Rent', type: 'price' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'number', suffix: ' BR' },
    { key: 'bathrooms', label: 'Bathrooms', type: 'number', suffix: ' BA' },
    { key: 'sizeSqFt', label: 'Size', type: 'number', suffix: ' sqft' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'rating', label: 'Rating', type: 'rating' },
    { key: 'address', label: 'Location', type: 'text' },
    { key: 'type', label: 'Property Type', type: 'text' },
    { key: 'parking', label: 'Parking', type: 'boolean' },
    { key: 'wifi', label: 'WiFi', type: 'boolean' },
    { key: 'security', label: '24/7 Security', type: 'boolean' },
    { key: 'gym', label: 'Gym', type: 'boolean' },
  ];

  const renderCell = (property, field) => {
    const value = property[field.key];

    switch (field.type) {
      case 'image':
        return (
          <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {property.image ? (
              <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                <span className="text-5xl">🏠</span>
              </div>
            )}
          </div>
        );
      
      case 'price':
        return (
          <div className="text-2xl font-bold text-haven-blue">
            KES {value?.toLocaleString()}
            <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
          </div>
        );
      
      case 'number':
        return <span className="font-semibold">{value}{field.suffix}</span>;
      
      case 'status':
        const statusColors = {
          AVAILABLE: 'bg-green-100 text-green-600',
          OCCUPIED: 'bg-blue-100 text-blue-600',
          MAINTENANCE: 'bg-red-100 text-red-600',
          OFF_MARKET: 'bg-gray-100 text-gray-600',
        };
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[value] || ''}`}>
            {value}
          </span>
        );
      
      case 'rating':
        return (
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">⭐</span>
            <span className="font-semibold">{value || 'N/A'}</span>
          </div>
        );
      
      case 'boolean':
        return value ? (
          <span className="text-green-600 dark:text-green-400 text-xl">✅</span>
        ) : (
          <span className="text-gray-400 text-xl">—</span>
        );
      
      default:
        return <span>{value || '—'}</span>;
    }
  };

  const findBest = (field) => {
    if (field.type === 'price') {
      return Math.min(...properties.map(p => p[field.key] || Infinity));
    }
    if (field.type === 'number') {
      return Math.max(...properties.map(p => p[field.key] || 0));
    }
    return null;
  };

  const isBest = (property, field) => {
    const best = findBest(field);
    if (!best) return false;
    return property[field.key] === best;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Compare Properties
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Side-by-side comparison of {properties.length} properties
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-7xl mx-auto overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${properties.length + 1}, minmax(250px, 1fr))` }}>
            {/* Labels Column */}
            <div className="space-y-4">
              {comparisonFields.map((field, index) => (
                <div
                  key={field.key}
                  className={`${
                    field.type === 'image' ? 'h-48' : 'h-20'
                  } flex items-center px-4 font-semibold text-gray-700 dark:text-gray-300`}
                >
                  {field.label}
                </div>
              ))}
            </div>

            {/* Property Columns */}
            {properties.map((property, propIndex) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: propIndex * 0.1 }}
                className="space-y-4"
              >
                {comparisonFields.map((field) => (
                  <div
                    key={field.key}
                    className={`${
                      field.type === 'image' ? 'h-48' : 'h-20'
                    } bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center p-4 relative ${
                      isBest(property, field) ? 'ring-2 ring-green-500' : ''
                    }`}
                  >
                    {isBest(property, field) && field.type !== 'image' && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {renderCell(property, field)}
                  </div>
                ))}

                {/* Remove Button */}
                <button
                  onClick={() => onRemove && onRemove(property.id)}
                  className="w-full py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                >
                  Remove
                </button>

                {/* Select Button */}
                <button className="w-full py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors">
                  Select This Property
                </button>
              </motion.div>
            ))}

            {/* Add More Column */}
            {properties.length < maxProperties && (
              <div className="space-y-4">
                <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-haven-blue hover:bg-haven-50 dark:hover:bg-haven-900/20 transition-all">
                  <div className="text-center">
                    <div className="text-4xl mb-2">➕</div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Add Property<br/>to Compare
                    </p>
                  </div>
                </div>
                {comparisonFields.slice(1).map((field) => (
                  <div key={field.key} className="h-20" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <strong>Green checkmark</strong> indicates the best value in that category
        </p>
      </div>
    </div>
  );
};

export default PropertyComparison;
