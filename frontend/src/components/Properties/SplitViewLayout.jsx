import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PropertyMap from './PropertyMap';
import PropertyCard from './PropertyCard';

/**
 * Airbnb-style Split View (List + Map side by side)
 */
const SplitViewLayout = ({ properties = [], onPropertyHover, onPropertyClick }) => {
  const [hoveredProperty, setHoveredProperty] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'list', 'map', 'split'

  const handlePropertyHover = (property) => {
    setHoveredProperty(property);
    if (onPropertyHover) onPropertyHover(property);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* View Toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {properties.length} Properties
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {properties.filter(p => p.status === 'AVAILABLE').length} available
          </p>
        </div>

        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {[
            { id: 'list', icon: '☰', label: 'List' },
            { id: 'split', icon: '⊞', label: 'Split' },
            { id: 'map', icon: '🗺️', label: 'Map' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-4 py-2 rounded-md font-medium transition-all ${
                viewMode === mode.id
                  ? 'bg-white dark:bg-gray-800 shadow-sm text-haven-blue'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={mode.label}
            >
              <span className="mr-2">{mode.icon}</span>
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Property List */}
        {(viewMode === 'list' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto p-6 space-y-4`}>
            {properties.map((property) => (
              <motion.div
                key={property.id}
                onMouseEnter={() => handlePropertyHover(property)}
                onMouseLeave={() => setHoveredProperty(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`transition-all ${
                  hoveredProperty?.id === property.id ? 'ring-2 ring-haven-blue' : ''
                }`}
              >
                <PropertyCard
                  property={property}
                  view="list"
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </motion.div>
            ))}

            {properties.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-lg">No properties found</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            )}
          </div>
        )}

        {/* Map View */}
        {(viewMode === 'map' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} relative`}>
            <div className="absolute inset-0">
              <PropertyMap
                properties={properties}
                center={[40.7128, -74.006]}
                zoom={12}
                hoveredProperty={hoveredProperty}
                onMarkerClick={onPropertyClick}
              />
            </div>

            {/* Search This Area Button */}
            <button className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-full shadow-lg hover:shadow-xl transition-all font-medium z-10">
              🔍 Search this area
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitViewLayout;
