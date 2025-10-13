import React from 'react';

/**
 * Property-specific skeleton loaders that match actual layout
 */

// Property Card Skeleton (matches PropertyCard layout)
export const PropertyCardSkeleton = ({ view = 'grid' }) => {
  if (view === 'list') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
      <div className="p-5 space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="flex gap-4 mt-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="flex gap-2">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Property Grid Skeleton
export const PropertyGridSkeleton = ({ count = 6, view = 'grid' }) => {
  return (
    <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
      {[...Array(count)].map((_, i) => (
        <PropertyCardSkeleton key={i} view={view} />
      ))}
    </div>
  );
};

// Property Detail Skeleton
export const PropertyDetailSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Image Grid */}
      <div className="grid grid-cols-4 gap-2 mb-8 h-96">
        <div className="col-span-2 row-span-2 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyCardSkeleton;
