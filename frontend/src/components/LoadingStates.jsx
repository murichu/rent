import React from 'react'
import { cn } from '@/lib/utils'

// Skeleton component for loading states
const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      {...props}
    />
  )
}

// Search loading state
const SearchLoadingState = ({ className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-3">
        <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
        <span className="text-sm text-gray-600">Searching properties...</span>
      </div>
    </div>
  )
}

// Filter loading state
const FilterLoadingState = ({ className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Property card loading state
const PropertyCardSkeleton = ({ viewMode = 'grid', className }) => {
  if (viewMode === 'list') {
    return (
      <div className={cn('flex gap-4 p-4 border border-gray-200 rounded-lg', className)}>
        <Skeleton className="w-48 h-32 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4 p-4 border border-gray-200 rounded-lg', className)}>
      <Skeleton className="w-full h-48" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  )
}

// Properties grid loading state
const PropertiesGridSkeleton = ({ 
  count = 6, 
  viewMode = 'grid', 
  className 
}) => {
  const gridClasses = viewMode === 'grid' 
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
    : 'space-y-4'

  return (
    <div className={cn(gridClasses, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton 
          key={i} 
          viewMode={viewMode}
        />
      ))}
    </div>
  )
}

// Empty search results state
const EmptySearchState = ({ 
  searchQuery, 
  hasFilters, 
  onClearFilters,
  onClearSearch,
  className 
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No properties found
      </h3>
      
      <p className="text-gray-600 mb-8 max-w-md">
        {searchQuery ? (
          <>We couldn't find any properties matching "<strong>{searchQuery}</strong>"{hasFilters ? ' with your current filters' : ''}.</>
        ) : (
          'No properties match your current filters.'
        )}
      </p>
      
      <div className="flex gap-3">
        {searchQuery && (
          <button
            onClick={onClearSearch}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            Clear search
          </button>
        )}
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

// Search suggestions loading state
const SearchSuggestionsLoading = ({ className }) => {
  return (
    <div className={cn('py-4 space-y-2', className)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  )
}

// Filter results loading overlay
const FilterResultsLoading = ({ className }) => {
  return (
    <div className={cn(
      'absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10',
      className
    )}>
      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-md">
        <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
        <span className="text-sm text-gray-700">Updating results...</span>
      </div>
    </div>
  )
}

// Pulse animation for real-time updates
const PulseIndicator = ({ className, children }) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      <div className="absolute -top-1 -right-1 h-3 w-3">
        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></div>
        <div className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></div>
      </div>
    </div>
  )
}

// Loading dots animation
const LoadingDots = ({ className }) => {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
    </div>
  )
}

export {
  Skeleton,
  SearchLoadingState,
  FilterLoadingState,
  PropertyCardSkeleton,
  PropertiesGridSkeleton,
  EmptySearchState,
  SearchSuggestionsLoading,
  FilterResultsLoading,
  PulseIndicator,
  LoadingDots
}