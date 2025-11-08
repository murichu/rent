import React from 'react'
import { Grid, List, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PropertyCard from './PropertyCard'
import { cn } from '@/lib/utils'

const PropertyGrid = ({
  properties = [],
  viewMode = 'grid',
  onViewModeChange,
  onPropertySelect,
  onPropertyFavorite,
  loading = false,
  loadingCount = 6,
  className,
  ...props
}) => {
  // Generate loading skeletons
  const loadingItems = Array.from({ length: loadingCount }, (_, index) => ({
    id: `loading-${index}`,
    loading: true
  }))

  const displayItems = loading ? loadingItems : properties

  const ViewToggle = () => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange?.('grid')}
        className={cn(
          'h-8 px-3',
          viewMode === 'grid' 
            ? 'bg-white shadow-sm' 
            : 'hover:bg-gray-200'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">Grid</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange?.('list')}
        className={cn(
          'h-8 px-3',
          viewMode === 'list' 
            ? 'bg-white shadow-sm' 
            : 'hover:bg-gray-200'
        )}
      >
        <List className="h-4 w-4" />
        <span className="ml-1 hidden sm:inline">List</span>
      </Button>
    </div>
  )

  const EmptyState = () => (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Grid className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No properties found
      </h3>
      <p className="text-gray-600 mb-6 max-w-md">
        We couldn't find any properties matching your criteria. Try adjusting your filters or search terms.
      </p>
      <Button variant="outline">
        Clear Filters
      </Button>
    </div>
  )

  if (viewMode === 'list') {
    return (
      <div className={cn('space-y-4', className)} {...props}>
        {/* View Toggle Header */}
        {onViewModeChange && (
          <div className="flex justify-end">
            <ViewToggle />
          </div>
        )}

        {/* List Layout */}
        <div className="space-y-4">
          {displayItems.length === 0 && !loading ? (
            <EmptyState />
          ) : (
            displayItems.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                viewMode="list"
                loading={property.loading}
                onSelect={onPropertySelect}
                onFavorite={onPropertyFavorite}
                className="w-full"
              />
            ))
          )}
        </div>
      </div>
    )
  }

  // Grid Layout (default)
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {/* View Toggle Header */}
      {onViewModeChange && (
        <div className="flex justify-end">
          <ViewToggle />
        </div>
      )}

      {/* Grid Layout */}
      <div className={cn(
        'grid gap-6',
        // Responsive grid columns
        'grid-cols-1',           // Mobile: 1 column
        'sm:grid-cols-2',        // Small: 2 columns  
        'lg:grid-cols-3',        // Large: 3 columns
        'xl:grid-cols-4',        // Extra large: 4 columns
        '2xl:grid-cols-5'        // 2XL: 5 columns
      )}>
        {displayItems.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          displayItems.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              viewMode="grid"
              loading={property.loading}
              onSelect={onPropertySelect}
              onFavorite={onPropertyFavorite}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Responsive Grid Container Component
const ResponsivePropertyGrid = ({
  properties = [],
  viewMode = 'grid',
  onViewModeChange,
  onPropertySelect,
  onPropertyFavorite,
  loading = false,
  loadingCount = 6,
  spacing = 'default',
  maxColumns = 5,
  className,
  ...props
}) => {
  const spacingClasses = {
    tight: 'gap-3',
    default: 'gap-6',
    loose: 'gap-8'
  }

  const getGridColumns = () => {
    const baseClasses = 'grid-cols-1'
    const responsiveClasses = []
    
    if (maxColumns >= 2) responsiveClasses.push('sm:grid-cols-2')
    if (maxColumns >= 3) responsiveClasses.push('lg:grid-cols-3')
    if (maxColumns >= 4) responsiveClasses.push('xl:grid-cols-4')
    if (maxColumns >= 5) responsiveClasses.push('2xl:grid-cols-5')
    
    return [baseClasses, ...responsiveClasses].join(' ')
  }

  if (viewMode === 'list') {
    return (
      <div className={cn('space-y-4', className)} {...props}>
        {onViewModeChange && (
          <div className="flex justify-end">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="h-8 px-3 hover:bg-gray-200"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8 px-3 bg-white shadow-sm"
              >
                <List className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">List</span>
              </Button>
            </div>
          </div>
        )}

        <div className={cn('space-y-4', spacingClasses[spacing])}>
          {loading ? (
            Array.from({ length: loadingCount }).map((_, index) => (
              <PropertyCard
                key={`loading-${index}`}
                loading={true}
                viewMode="list"
                className="w-full"
              />
            ))
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Grid className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No properties found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                We couldn't find any properties matching your criteria. Try adjusting your filters or search terms.
              </p>
            </div>
          ) : (
            properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                viewMode="list"
                onSelect={onPropertySelect}
                onFavorite={onPropertyFavorite}
                className="w-full"
              />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)} {...props}>
      {onViewModeChange && (
        <div className="flex justify-end">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3 bg-white shadow-sm"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="h-8 px-3 hover:bg-gray-200"
            >
              <List className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">List</span>
            </Button>
          </div>
        </div>
      )}

      <div className={cn(
        'grid',
        getGridColumns(),
        spacingClasses[spacing]
      )}>
        {loading ? (
          Array.from({ length: loadingCount }).map((_, index) => (
            <PropertyCard
              key={`loading-${index}`}
              loading={true}
              viewMode="grid"
            />
          ))
        ) : properties.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Grid className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No properties found
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              We couldn't find any properties matching your criteria. Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              viewMode="grid"
              onSelect={onPropertySelect}
              onFavorite={onPropertyFavorite}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Masonry Grid Layout (Alternative)
const MasonryPropertyGrid = ({
  properties = [],
  onPropertySelect,
  onPropertyFavorite,
  loading = false,
  loadingCount = 6,
  columns = 3,
  gap = 6,
  className,
  ...props
}) => {
  const columnArrays = Array.from({ length: columns }, () => [])
  
  // Distribute properties across columns
  properties.forEach((property, index) => {
    columnArrays[index % columns].push(property)
  })

  if (loading) {
    const loadingItems = Array.from({ length: loadingCount }, (_, index) => ({
      id: `loading-${index}`,
      loading: true
    }))
    
    loadingItems.forEach((item, index) => {
      columnArrays[index % columns].push(item)
    })
  }

  return (
    <div 
      className={cn('flex', className)}
      style={{ gap: `${gap * 0.25}rem` }}
      {...props}
    >
      {columnArrays.map((columnProperties, columnIndex) => (
        <div 
          key={columnIndex}
          className="flex-1 space-y-6"
        >
          {columnProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              viewMode="grid"
              loading={property.loading}
              onSelect={onPropertySelect}
              onFavorite={onPropertyFavorite}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default PropertyGrid
export { ResponsivePropertyGrid, MasonryPropertyGrid }