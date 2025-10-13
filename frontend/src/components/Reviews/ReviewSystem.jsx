import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Booking.com/Airbnb-style Review & Rating System
 */
const ReviewSystem = ({ entityType = 'property', entityId, overallRating = 4.8, totalReviews = 24 }) => {
  const [filter, setFilter] = useState('all'); // all, recent, highest

  const ratingBreakdown = [
    { category: 'Cleanliness', rating: 4.9, icon: '✨' },
    { category: 'Location', rating: 4.7, icon: '📍' },
    { category: 'Value', rating: 4.8, icon: '💰' },
    { category: 'Communication', rating: 5.0, icon: '💬' },
    { category: 'Check-in', rating: 4.9, icon: '🔑' },
    { category: 'Accuracy', rating: 4.8, icon: '✅' },
  ];

  const reviews = [
    {
      id: 1,
      author: 'John D.',
      avatar: '👨',
      rating: 5,
      date: '2 weeks ago',
      verified: true,
      text: 'Excellent property! Very clean and well-maintained. The landlord was very responsive to all our queries. Would definitely recommend!',
      photos: [],
      helpful: 12,
    },
    {
      id: 2,
      author: 'Sarah M.',
      avatar: '👩',
      rating: 5,
      date: '1 month ago',
      verified: true,
      text: 'Great location in Westlands. Close to shopping centers and public transport. The apartment was exactly as described.',
      photos: [],
      helpful: 8,
    },
    {
      id: 3,
      author: 'Mike K.',
      avatar: '👨',
      rating: 4,
      date: '2 months ago',
      verified: false,
      text: 'Nice property overall. Only minor issue was parking can be tight during peak hours.',
      photos: [],
      helpful: 5,
    },
  ];

  const StarRating = ({ rating, size = 'md' }) => {
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-base',
      lg: 'text-2xl',
    };

    return (
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <div className="flex flex-col md:flex-row gap-8">
          {/* Big Rating */}
          <div className="text-center md:text-left">
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
              {overallRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(overallRating)} size="lg" />
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Based on {totalReviews} reviews
            </p>
            <button className="mt-4 text-haven-blue hover:underline font-medium">
              Write a review
            </button>
          </div>

          {/* Rating Breakdown */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {ratingBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.icon} {item.category}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.rating.toFixed(1)}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.rating / 5) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="h-full bg-haven-blue rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All Reviews' },
          { id: 'recent', label: 'Most Recent' },
          { id: 'highest', label: 'Highest Rated' },
          { id: 'lowest', label: 'Lowest Rated' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${
              filter === tab.id
                ? 'bg-haven-blue text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
          >
            {/* Reviewer Info */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl">
                  {review.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">{review.author}</p>
                    {review.verified && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{review.date}</p>
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>

            {/* Review Text */}
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {review.text}
            </p>

            {/* Review Photos (if any) */}
            {review.photos.length > 0 && (
              <div className="flex gap-2 mb-4">
                {review.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt="Review photo"
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </div>
            )}

            {/* Helpful Button */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-haven-blue transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Helpful ({review.helpful})
              </button>
              <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-haven-blue transition-colors">
                Report
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load More */}
      <div className="text-center py-6">
        <button className="px-6 py-3 border-2 border-haven-blue text-haven-blue rounded-lg font-semibold hover:bg-haven-blue hover:text-white transition-all">
          Load More Reviews
        </button>
      </div>
    </div>
  );
};

const StarRating = ({ rating }) => (
  <div className="flex">
    {[1, 2, 3, 4, 5].map((star) => (
      <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}>
        ⭐
      </span>
    ))}
  </div>
);

export default ReviewSystem;
