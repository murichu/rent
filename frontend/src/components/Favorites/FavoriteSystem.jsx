import React, { useState } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';

/**
 * Airbnb-style Save/Favorite System
 */
export const FavoriteButton = ({ itemId, itemType = 'property', initialFavorited = false, size = 'md' }) => {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isAnimating, setIsAnimating] = useState(false);

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  const handleToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsAnimating(true);
    setIsFavorited(!isFavorited);

    try {
      // API call to save/unsave
      // await api.favorites.toggle(itemId, itemType);
      
      if (!isFavorited) {
        showToast.success('Added to favorites! ❤️', { duration: 2000 });
      } else {
        showToast.info('Removed from favorites', { duration: 2000 });
      }
    } catch (error) {
      setIsFavorited(isFavorited); // Revert on error
      showToast.error('Failed to update favorites');
    }

    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.button
      onClick={handleToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={`${sizes[size]} bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <motion.svg
        className={iconSizes[size]}
        fill={isFavorited ? '#ef4444' : 'none'}
        stroke={isFavorited ? '#ef4444' : 'currentColor'}
        viewBox="0 0 24 24"
        animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </motion.svg>
    </motion.button>
  );
};

/**
 * Favorites Page/Modal
 */
export const FavoritesList = ({ favorites = [] }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Your Favorites
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {favorites.length} saved {favorites.length === 1 ? 'property' : 'properties'}
          </p>
        </div>
        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Share Collection
        </button>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">💙</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No favorites yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start adding properties to your favorites to see them here
          </p>
          <button className="px-6 py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors">
            Browse Properties
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((item) => (
            <div key={item.id} className="relative group">
              {/* Property card here */}
              <div className="absolute top-3 right-3 z-10">
                <FavoriteButton itemId={item.id} initialFavorited={true} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoriteButton;
