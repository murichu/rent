import React, { useEffect, useState, useCallback } from 'react'
import { Plus, SlidersHorizontal, Grid, List, MapPin, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SearchBar from '@/components/SearchBar'
import FilterSystem from '@/components/FilterSystem'
import PropertyGrid from '@/components/PropertyGrid'
import { useSearchAndFilter, useSearchSuggestions, useFilteredData } from '@/hooks/useSearchAndFilter'
import { cn } from '@/lib/utils'
import axios from 'axios'

const EnhancedPropertiesPage = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Search and filter state management
  const {
    searchQuery,
    debouncedSearchQuery,
    filters,
    sortBy,
    sortOrder,
    viewMode,
    hasActiveFilters,
    activeFilterCount,
    setSearchQuery,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
    setSorting,
    setViewMode,
    resetAll,
    setLoading: setSearchLoading
  } = useSearchAndFilter({
    initialFilters: {},
    debounceMs: 300,
    syncWithUrl: true,
    onFiltersChange: (newFilters) => {
      console.log('Filters changed:', newFilters)
    },
    onSearch: (query) => {
      console.log('Search query:', query)
    }
  })

  // Search suggestions management
  const {
    recentSearches,
    suggestions,
    addRecentSearch
  } = useSearchSuggestions({
    searchQuery: debouncedSearchQuery,
    suggestions: [
      'Apartment in Nairobi',
      'House in Westlands',
      'Commercial property',
      'Office space Karen',
      'Furnished apartment',
      'Studio apartment',
      'Two bedroom house',
      'Parking available',
      'Swimming pool',
      'Garden apartment'
    ],
    maxRecentSearches: 5
  })

  // Filter and sort properties
  const filteredProperties = useFilteredData(properties, {
    searchQuery: debouncedSearchQuery,
    filters,
    sortBy,
    sortOrder
  })

  // Transform properties for PropertyCard compatibility
  const transformedProperties = filteredProperties.map(property => ({
    ...property,
    location: property.location || property.address,
    price: property.rent || property.price,
    currency: 'KSh',
    images: property.images || [],
    amenities: property.amenities || [],
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    rating: property.rating,
    featured: property.featured || false,
    isFavorited: property.isFavorited || false
  }))

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await axios.get('/properties', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProperties(response.data.data || [])
      setError('')
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  // Handle search submission
  const handleSearchSubmit = useCallback((query) => {
    if (query && query.length > 0) {
      addRecentSearch(query)
    }
    setSearchQuery(query)
  }, [addRecentSearch, setSearchQuery])

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setSearchQuery('')
  }, [setSearchQuery])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters)
  }, [setFilters])

  // Handle property interactions
  const handlePropertySelect = useCallback((propertyId) => {
    console.log('Selected property:', propertyId)
    // Navigate to property details or open modal
  }, [])

  const handlePropertyFavorite = useCallback((propertyId, isFavorited) => {
    console.log('Favorite toggled:', propertyId, isFavorited)
    setProperties(prev => prev.map(prop => 
      prop.id === propertyId 
        ? { ...prop, isFavorited } 
        : prop
    ))
  }, [])

  // Handle sorting
  const handleSortChange = useCallback((newSortBy) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSorting(newSortBy, newSortOrder)
  }, [sortBy, sortOrder, setSorting])

  // Loading state
  if (loading && properties.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading properties...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Properties
          </h1>
          <p className="text-lg text-gray-600">
            Discover and manage your property portfolio with modern tools
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{transformedProperties.length} of {properties.length} properties</span>
            <span>•</span>
            <span>Updated {new Date().toLocaleDateString()}</span>
            {hasActiveFilters && (
              <>
                <span>•</span>
                <span className="text-primary-600 font-medium">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 lg:hidden',
              hasActiveFilters && 'border-primary-300 bg-primary-50 text-primary-700'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 lg:hidden"
          >
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="space-y-4">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSubmit={handleSearchSubmit}
          onClear={handleSearchClear}
          suggestions={suggestions}
          recentSearches={recentSearches}
          loading={loading}
          placeholder="Search properties by name, location, type, or amenities..."
          className="w-full"
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar - Desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <FilterSystem
              filters={filters}
              onChange={handleFilterChange}
              propertyTypes={[
                { value: 'apartment', label: 'Apartment', count: 45 },
                { value: 'house', label: 'House', count: 32 },
                { value: 'commercial', label: 'Commercial', count: 18 },
                { value: 'office', label: 'Office', count: 12 },
                { value: 'warehouse', label: 'Warehouse', count: 8 },
                { value: 'land', label: 'Land', count: 15 }
              ]}
              amenities={[
                { value: 'wifi', label: 'WiFi' },
                { value: 'parking', label: 'Parking' },
                { value: 'kitchen', label: 'Kitchen' },
                { value: 'tv', label: 'TV' },
                { value: 'ac', label: 'Air Conditioning' },
                { value: 'pool', label: 'Swimming Pool' },
                { value: 'gym', label: 'Gym' },
                { value: 'garden', label: 'Garden' },
                { value: 'security', label: '24/7 Security' },
                { value: 'elevator', label: 'Elevator' }
              ]}
              locations={[
                { value: 'nairobi', label: 'Nairobi CBD' },
                { value: 'westlands', label: 'Westlands' },
                { value: 'karen', label: 'Karen' },
                { value: 'kilimani', label: 'Kilimani' },
                { value: 'lavington', label: 'Lavington' }
              ]}
              priceRange={{ min: 0, max: 200000 }}
            />
          </div>
        </div>

        {/* Properties Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Results Summary and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {transformedProperties.length} of {properties.length} properties
              </div>
              
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear all filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-')
                  setSorting(newSortBy, newSortOrder)
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="price-asc">Price Low-High</option>
                <option value="price-desc">Price High-Low</option>
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'h-8 px-3',
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm' 
                      : 'hover:bg-gray-200'
                  )}
                >
                  <Grid className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
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
            </div>
          </div>

          {/* Properties Grid */}
          <PropertyGrid
            properties={transformedProperties}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPropertySelect={handlePropertySelect}
            onPropertyFavorite={handlePropertyFavorite}
            loading={loading}
            loadingCount={6}
          />

          {/* Empty State */}
          {!loading && transformedProperties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <MapPin className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {hasActiveFilters 
                  ? 'No properties match your criteria' 
                  : 'No properties yet'
                }
              </h3>
              <p className="text-gray-600 mb-8 max-w-md">
                {hasActiveFilters
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  : 'Get started by adding your first property to the system.'
                }
              </p>
              <div className="flex gap-3">
                {hasActiveFilters && (
                  <Button 
                    variant="outline"
                    onClick={resetAll}
                  >
                    Clear All Filters
                  </Button>
                )}
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <FilterSystem
        filters={filters}
        onChange={handleFilterChange}
        showMobileDrawer={showMobileFilters}
        onToggleMobileDrawer={() => setShowMobileFilters(false)}
        propertyTypes={[
          { value: 'apartment', label: 'Apartment', count: 45 },
          { value: 'house', label: 'House', count: 32 },
          { value: 'commercial', label: 'Commercial', count: 18 },
          { value: 'office', label: 'Office', count: 12 },
          { value: 'warehouse', label: 'Warehouse', count: 8 },
          { value: 'land', label: 'Land', count: 15 }
        ]}
        amenities={[
          { value: 'wifi', label: 'WiFi' },
          { value: 'parking', label: 'Parking' },
          { value: 'kitchen', label: 'Kitchen' },
          { value: 'tv', label: 'TV' },
          { value: 'ac', label: 'Air Conditioning' },
          { value: 'pool', label: 'Swimming Pool' }
        ]}
        priceRange={{ min: 0, max: 200000 }}
      />
    </div>
  )
}

export default EnhancedPropertiesPage