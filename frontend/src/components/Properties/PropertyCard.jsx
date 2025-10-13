import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PropertyCard = ({ property, onEdit, onDelete, view = 'grid' }) => {
  const statusColors = {
    AVAILABLE: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    OCCUPIED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    MAINTENANCE: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    OFF_MARKET: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };

  const statusDots = {
    AVAILABLE: 'bg-green-500',
    OCCUPIED: 'bg-blue-500',
    MAINTENANCE: 'bg-red-500',
    OFF_MARKET: 'bg-gray-500',
  };

  if (view === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all p-4 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-4">
          {/* Image */}
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
            {property.image ? (
              <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🏢</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Link
                  to={`/properties/${property.id}`}
                  className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {property.title}
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{property.address}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {property.bedrooms && <span>🛏️ {property.bedrooms} BR</span>}
                  {property.bathrooms && <span>🚿 {property.bathrooms} BA</span>}
                  {property.sizeSqFt && <span>📐 {property.sizeSqFt} sqft</span>}
                </div>
              </div>

              {/* Status & Price */}
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  ${property.rentAmount?.toLocaleString()}/mo
                </p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${statusColors[property.status]}`}>
                  <span className={`w-2 h-2 rounded-full ${statusDots[property.status]}`}></span>
                  {property.status}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(property)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              aria-label="Edit property"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(property)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label="Delete property"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view (default)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Image */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {property.image ? (
          <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🏢</div>
        )}
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusColors[property.status]} backdrop-blur-sm`}>
            <span className={`w-2 h-2 rounded-full ${statusDots[property.status]} animate-pulse`}></span>
            {property.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <Link
          to={`/properties/${property.id}`}
          className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
        >
          {property.title}
        </Link>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {property.address}
        </p>

        {/* Property Details */}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <span>🛏️</span> {property.bedrooms} BR
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center gap-1">
              <span>🚿</span> {property.bathrooms} BA
            </span>
          )}
          {property.sizeSqFt && (
            <span className="flex items-center gap-1">
              <span>📐</span> {property.sizeSqFt} sqft
            </span>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${property.rentAmount?.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(property)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              aria-label="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(property)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;
