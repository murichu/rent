import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Custom hook for managing search and filter state with URL synchronization
 * and real-time updates with debouncing
 */
export const useSearchAndFilter = ({
  initialFilters = {},
  debounceMs = 300,
  syncWithUrl = true,
  onFiltersChange,
  onSearch
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Initialize state from URL params or defaults
  const getInitialState = useCallback(() => {
    if (!syncWithUrl) {
      return {
        searchQuery: '',
        filters: initialFilters,
        sortBy: 'name',
        sortOrder: 'asc',
        viewMode: 'grid'
      }
    }

    const urlSearchQuery = searchParams.get('q') || ''
    const urlSortBy = searchParams.get('sortBy') || 'name'
    const urlSortOrder = searchParams.get('sortOrder') || 'asc'
    const urlViewMode = searchParams.get('view') || 'grid'
    
    // Parse filters from URL
    const urlFilters = { ...initialFilters }
    
    // Price range
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    if (minPrice || maxPrice) {
      urlFilters.priceRange = [
        minPrice ? parseInt(minPrice) : 0,
        maxPrice ? parseInt(maxPrice) : 100000
      ]
    }
    
    // Property types
    const propertyTypes = searchParams.get('types')
    if (propertyTypes) {
      urlFilters.propertyTypes = propertyTypes.split(',')
    }
    
    // Amenities
    const amenities = searchParams.get('amenities')
    if (amenities) {
      urlFilters.amenities = amenities.split(',')
    }
    
    // Bedrooms/Bathrooms
    const bedrooms = searchParams.get('bedrooms')
    if (bedrooms) {
      urlFilters.bedrooms = bedrooms
    }
    
    const bathrooms = searchParams.get('bathrooms')
    if (bathrooms) {
      urlFilters.bathrooms = bathrooms
    }
    
    // Locations
    const locations = searchParams.get('locations')
    if (locations) {
      urlFilters.locations = locations.split(',')
    }

    return {
      searchQuery: urlSearchQuery,
      filters: urlFilters,
      sortBy: urlSortBy,
      sortOrder: urlSortOrder,
      viewMode: urlViewMode
    }
  }, [searchParams, syncWithUrl, initialFilters])

  const [state, setState] = useState(getInitialState)
  const [loading, setLoading] = useState(false)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(state.searchQuery)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(state.searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [state.searchQuery, debounceMs])

  // Update URL when state changes
  useEffect(() => {
    if (!syncWithUrl) return

    const newSearchParams = new URLSearchParams()
    
    // Search query
    if (state.searchQuery) {
      newSearchParams.set('q', state.searchQuery)
    }
    
    // Sort
    if (state.sortBy !== 'name') {
      newSearchParams.set('sortBy', state.sortBy)
    }
    if (state.sortOrder !== 'asc') {
      newSearchParams.set('sortOrder', state.sortOrder)
    }
    
    // View mode
    if (state.viewMode !== 'grid') {
      newSearchParams.set('view', state.viewMode)
    }
    
    // Filters
    if (state.filters.priceRange) {
      const [min, max] = state.filters.priceRange
      if (min > 0) newSearchParams.set('minPrice', min.toString())
      if (max < 100000) newSearchParams.set('maxPrice', max.toString())
    }
    
    if (state.filters.propertyTypes?.length > 0) {
      newSearchParams.set('types', state.filters.propertyTypes.join(','))
    }
    
    if (state.filters.amenities?.length > 0) {
      newSearchParams.set('amenities', state.filters.amenities.join(','))
    }
    
    if (state.filters.bedrooms) {
      newSearchParams.set('bedrooms', state.filters.bedrooms)
    }
    
    if (state.filters.bathrooms) {
      newSearchParams.set('bathrooms', state.filters.bathrooms)
    }
    
    if (state.filters.locations?.length > 0) {
      newSearchParams.set('locations', state.filters.locations.join(','))
    }

    // Only update URL if params actually changed
    const currentParams = searchParams.toString()
    const newParams = newSearchParams.toString()
    
    if (currentParams !== newParams) {
      setSearchParams(newSearchParams, { replace: true })
    }
  }, [state, syncWithUrl, setSearchParams, searchParams])

  // Trigger callbacks when filters or search change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(state.filters)
    }
  }, [state.filters, onFiltersChange])

  useEffect(() => {
    if (onSearch && debouncedSearchQuery !== state.searchQuery) {
      onSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, onSearch, state.searchQuery])

  // Action creators
  const setSearchQuery = useCallback((query) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const setFilters = useCallback((filters) => {
    setState(prev => ({ ...prev, filters }))
  }, [])

  const updateFilter = useCallback((key, value) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }))
  }, [])

  const removeFilter = useCallback((key) => {
    setState(prev => {
      const newFilters = { ...prev.filters }
      delete newFilters[key]
      return { ...prev, filters: newFilters }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, filters: {} }))
  }, [])

  const setSorting = useCallback((sortBy, sortOrder = 'asc') => {
    setState(prev => ({ ...prev, sortBy, sortOrder }))
  }, [])

  const setViewMode = useCallback((viewMode) => {
    setState(prev => ({ ...prev, viewMode }))
  }, [])

  const resetAll = useCallback(() => {
    setState({
      searchQuery: '',
      filters: {},
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'grid'
    })
  }, [])

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return Object.keys(state.filters).length > 0 || state.searchQuery.length > 0
  }, [state.filters, state.searchQuery])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (state.searchQuery) count++
    
    Object.entries(state.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        count += value.length
      } else if (value !== undefined && value !== null && value !== '') {
        count++
      }
    })
    
    return count
  }, [state.filters, state.searchQuery])

  return {
    // State
    searchQuery: state.searchQuery,
    debouncedSearchQuery,
    filters: state.filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    viewMode: state.viewMode,
    loading,
    
    // Computed
    hasActiveFilters,
    activeFilterCount,
    
    // Actions
    setSearchQuery,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
    setSorting,
    setViewMode,
    resetAll,
    setLoading
  }
}

/**
 * Hook for managing search suggestions and recent searches
 */
export const useSearchSuggestions = ({
  searchQuery,
  suggestions = [],
  maxRecentSearches = 5,
  storageKey = 'recentSearches'
}) => {
  const [recentSearches, setRecentSearches] = useState([])

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error)
    }
  }, [storageKey])

  // Filter suggestions based on current query
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    
    return suggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(searchQuery.toLowerCase()) &&
        suggestion.toLowerCase() !== searchQuery.toLowerCase()
      )
      .slice(0, 8)
  }, [suggestions, searchQuery])

  // Filter recent searches
  const filteredRecentSearches = useMemo(() => {
    if (searchQuery.length > 0) {
      return recentSearches.filter(search =>
        search.toLowerCase().includes(searchQuery.toLowerCase()) &&
        search.toLowerCase() !== searchQuery.toLowerCase()
      )
    }
    return recentSearches
  }, [recentSearches, searchQuery])

  // Add search to recent searches
  const addRecentSearch = useCallback((query) => {
    if (!query || query.length < 2) return

    setRecentSearches(prev => {
      const filtered = prev.filter(search => search !== query)
      const updated = [query, ...filtered].slice(0, maxRecentSearches)
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch (error) {
        console.warn('Failed to save recent search:', error)
      }
      
      return updated
    })
  }, [maxRecentSearches, storageKey])

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to clear recent searches:', error)
    }
  }, [storageKey])

  return {
    recentSearches: filteredRecentSearches,
    suggestions: filteredSuggestions,
    addRecentSearch,
    clearRecentSearches
  }
}

/**
 * Hook for filtering and sorting data based on search and filter state
 */
export const useFilteredData = (data = [], { searchQuery, filters, sortBy, sortOrder }) => {
  return useMemo(() => {
    let filtered = [...data]

    // Apply search filter
    if (searchQuery && searchQuery.length > 0) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => {
        return (
          item.name?.toLowerCase().includes(query) ||
          item.location?.toLowerCase().includes(query) ||
          item.address?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.type?.toLowerCase().includes(query)
        )
      })
    }

    // Apply filters
    if (filters.priceRange) {
      const [min, max] = filters.priceRange
      filtered = filtered.filter(item => {
        const price = item.price || item.rent || 0
        return price >= min && price <= max
      })
    }

    if (filters.propertyTypes?.length > 0) {
      filtered = filtered.filter(item =>
        filters.propertyTypes.includes(item.type?.toLowerCase())
      )
    }

    if (filters.amenities?.length > 0) {
      filtered = filtered.filter(item => {
        const itemAmenities = item.amenities || []
        return filters.amenities.some(amenity =>
          itemAmenities.some(itemAmenity =>
            itemAmenity.toLowerCase().includes(amenity.toLowerCase())
          )
        )
      })
    }

    if (filters.bedrooms) {
      const minBedrooms = parseInt(filters.bedrooms)
      filtered = filtered.filter(item => {
        const bedrooms = item.bedrooms || 0
        return bedrooms >= minBedrooms
      })
    }

    if (filters.bathrooms) {
      const minBathrooms = parseInt(filters.bathrooms)
      filtered = filtered.filter(item => {
        const bathrooms = item.bathrooms || 0
        return bathrooms >= minBathrooms
      })
    }

    if (filters.locations?.length > 0) {
      filtered = filtered.filter(item =>
        filters.locations.some(location =>
          item.location?.toLowerCase().includes(location.toLowerCase()) ||
          item.address?.toLowerCase().includes(location.toLowerCase())
        )
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]

      // Handle different data types
      if (sortBy === 'price' || sortBy === 'rent') {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime() || 0
        bValue = new Date(bValue).getTime() || 0
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue?.toLowerCase() || ''
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [data, searchQuery, filters, sortBy, sortOrder])
}