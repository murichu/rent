import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Zillow/Airbnb-style Advanced Filter Sidebar
 */
const AdvancedFilterSidebar = ({ onFilterChange, onClose, isMobile = false }) => {
  const [filters, setFilters] = useState({
    locations: [],
    priceRange: [0, 100000],
    bedrooms: [],
    bathrooms: [],
    propertyTypes: [],
    statuses: [],
    amenities: [],
    availableFrom: null,
    rating: null,
  });

  const [expandedSections, setExpandedSections] = useState({
    location: true,
    price: true,
    bedrooms: true,
    propertyType: true,
    status: true,
  });

  const locations = [
    { value: 'westlands', label: 'Westlands', count: 12 },
    { value: 'kilimani', label: 'Kilimani', count: 8 },
    { value: 'lavington', label: 'Lavington', count: 15 },
    { value: 'karen', label: 'Karen', count: 6 },
    { value: 'runda', label: 'Runda', count: 4 },
  ];

  const propertyTypes = [
    { value: 'apartment', label: 'Apartment', icon: '🏢', count: 24 },
    { value: 'house', label: 'House', icon: '🏠', count: 12 },
    { value: 'condo', label: 'Condo', icon: '🏘️', count: 8 },
    { value: 'townhouse', label: 'Townhouse', icon: '🏡', count: 4 },
  ];

  const statuses = [
    { value: 'available', label: 'Available', color: 'green', count: 24 },
    { value: 'occupied', label: 'Occupied', color: 'blue', count: 45 },
    { value: 'maintenance', label: 'Maintenance', color: 'red', count: 3 },
    { value: 'off_market', label: 'Off Market', color: 'gray', count: 2 },
  ];

  const amenities = [
    { value: 'parking', label: 'Parking', icon: '🚗' },
    { value: 'wifi', label: 'WiFi', icon: '📶' },
    { value: 'gym', label: 'Gym', icon: '💪' },
    { value: 'pool', label: 'Pool', icon: '🏊' },
    { value: 'security', label: '24/7 Security', icon: '🔒' },
    { value: 'backup', label: 'Backup Power', icon: '⚡' },
  ];

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      
      return { ...prev, [category]: updated };
    });
  };

  const handlePriceChange = (values) => {
    setFilters((prev) => ({ ...prev, priceRange: values }));
  };

  const clearAllFilters = () => {
    setFilters({
      locations: [],
      priceRange: [0, 100000],
      bedrooms: [],
      bathrooms: [],
      propertyTypes: [],
      statuses: [],
      amenities: [],
      availableFrom: null,
      rating: null,
    });
  };

  const applyFilters = () => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  const activeFilterCount = 
    filters.locations.length +
    filters.bedrooms.length +
    filters.bathrooms.length +
    filters.propertyTypes.length +
    filters.statuses.length +
    filters.amenities.length +
    (filters.rating ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000 ? 1 : 0);

  const FilterSection = ({ title, section, children }) => (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between text-left font-semibold text-gray-900 dark:text-white hover:text-haven-blue transition-colors"
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transition-transform ${expandedSections[section] ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {expandedSections[section] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      initial={{ x: isMobile ? 0 : -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: isMobile ? 0 : -300, opacity: 0 }}
      className={`bg-white dark:bg-gray-800 ${isMobile ? 'h-full' : 'h-screen'} overflow-y-auto scrollbar-hide`}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filters</h2>
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {activeFilterCount > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </p>
        )}
      </div>

      {/* Filter Sections */}
      <div className="p-4">
        {/* Location */}
        <FilterSection title="📍 Location" section="location">
          {locations.map((loc) => (
            <label
              key={loc.value}
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.locations.includes(loc.value)}
                  onChange={() => toggleFilter('locations', loc.value)}
                  className="w-4 h-4 text-haven-blue rounded focus:ring-2 focus:ring-haven-blue"
                />
                <span className="text-sm text-gray-900 dark:text-white">{loc.label}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">({loc.count})</span>
            </label>
          ))}
        </FilterSection>

        {/* Price Range */}
        <FilterSection title="💰 Price Range" section="price">
          <div className="px-3">
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max="100000"
                step="5000"
                value={filters.priceRange[1]}
                onChange={(e) => handlePriceChange([filters.priceRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">Min</span>
                <input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) => handlePriceChange([parseInt(e.target.value), filters.priceRange[1]])}
                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <span className="text-gray-400">—</span>
              <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">Max</span>
                <input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) => handlePriceChange([filters.priceRange[0], parseInt(e.target.value)])}
                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <p className="mt-2 text-center text-sm font-medium text-haven-blue">
              KES {filters.priceRange[0].toLocaleString()} - KES {filters.priceRange[1].toLocaleString()}
            </p>
          </div>
        </FilterSection>

        {/* Bedrooms */}
        <FilterSection title="🛏️ Bedrooms" section="bedrooms">
          <div className="flex flex-wrap gap-2">
            {['Studio', '1', '2', '3', '4', '5+'].map((bed) => (
              <button
                key={bed}
                onClick={() => toggleFilter('bedrooms', bed)}
                className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                  filters.bedrooms.includes(bed)
                    ? 'border-haven-blue bg-haven-blue text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-haven-blue'
                }`}
              >
                {bed}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Property Type */}
        <FilterSection title="🏢 Property Type" section="propertyType">
          {propertyTypes.map((type) => (
            <label
              key={type.value}
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.propertyTypes.includes(type.value)}
                  onChange={() => toggleFilter('propertyTypes', type.value)}
                  className="w-4 h-4 text-haven-blue rounded focus:ring-2 focus:ring-haven-blue"
                />
                <span className="text-xl">{type.icon}</span>
                <span className="text-sm text-gray-900 dark:text-white">{type.label}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">({type.count})</span>
            </label>
          ))}
        </FilterSection>

        {/* Status */}
        <FilterSection title="✨ Status" section="status">
          {statuses.map((status) => (
            <label
              key={status.value}
              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(status.value)}
                  onChange={() => toggleFilter('statuses', status.value)}
                  className="w-4 h-4 text-haven-blue rounded focus:ring-2 focus:ring-haven-blue"
                />
                <div className={`w-2 h-2 rounded-full bg-${status.color}-500`}></div>
                <span className="text-sm text-gray-900 dark:text-white">{status.label}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">({status.count})</span>
            </label>
          ))}
        </FilterSection>

        {/* Amenities */}
        <FilterSection title="✨ Amenities" section="amenities">
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity) => (
              <button
                key={amenity.value}
                onClick={() => toggleFilter('amenities', amenity.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  filters.amenities.includes(amenity.value)
                    ? 'border-haven-blue bg-haven-blue/10 text-haven-blue'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-haven-blue'
                }`}
              >
                <span>{amenity.icon}</span>
                <span className="text-xs font-medium">{amenity.label}</span>
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection title="⭐ Minimum Rating" section="rating">
          <div className="space-y-2">
            {[5, 4, 3].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilters((prev) => ({ ...prev, rating }))}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  filters.rating === rating
                    ? 'bg-haven-blue text-white'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex">
                  {[...Array(rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <span className="text-sm font-medium">& up</span>
              </button>
            ))}
          </div>
        </FilterSection>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
        <button
          onClick={clearAllFilters}
          className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={applyFilters}
          className="flex-1 py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors"
        >
          Show Results
        </button>
      </div>
    </motion.div>
  );
};

export default AdvancedFilterSidebar;
