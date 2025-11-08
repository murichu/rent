import React, { useState } from 'react'
import { Search, SlidersHorizontal, Grid, List, X, Plus, Filter } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { CollapsibleSection } from './ResponsiveLayout'
import PullToRefresh from './PullToRefresh'
import SmoothScrollContainer from './SmoothScrollContainer'
import { useResponsive } from '@/hooks/useResponsive'
import { cn } from '@/lib/utils'

const MobilePropertiesLayout = ({
  properties,
  searchTerm,
  setSearchTerm,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus,
  onRefresh,
  onAddProperty,
  children
}) => {
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const { isMobile } = useResponsive()

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilterType('all')
    setFilterStatus('all')
  }

  const hasActiveFilters = searchTerm || filterType !== 'all' || filterStatus !== 'all'

  if (!isMobile) {
    return children // Return original layout for non-mobile
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Properties</h1>
              <p className="text-sm text-gray-600">{properties.length} total</p>
            </div>
            <Button
              size="sm"
              onClick={onAddProperty}
              className="min-h-[44px] px-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Search Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={showSearch ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="flex-1 min-h-[44px]"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="min-h-[44px] px-4"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter
              {hasActiveFilters && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-2 h-2"></span>
              )}
            </Button>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'grid' && 'bg-white shadow-sm'
                )}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'list' && 'bg-white shadow-sm'
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="px-4 pb-3 animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-gray-300"
                autoFocus
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-600">Active:</span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {filterType}
                  <button
                    onClick={() => setFilterType('all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {filterStatus}
                  <button
                    onClick={() => setFilterStatus('all')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-6 px-2"
              >
                Clear all
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 space-y-4">
            <CollapsibleSection title="Property Type" defaultOpen>
              <div className="grid grid-cols-2 gap-2">
                {['all', 'apartment', 'house', 'commercial', 'office'].map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className="justify-start capitalize min-h-[44px]"
                  >
                    {type === 'all' ? 'All Types' : type}
                  </Button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Status">
              <div className="grid grid-cols-2 gap-2">
                {['all', 'available', 'occupied', 'maintenance'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(status)}
                    className="justify-start capitalize min-h-[44px]"
                  >
                    {status === 'all' ? 'All Status' : status}
                  </Button>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Sort Options">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'name', label: 'Name' },
                      { value: 'price', label: 'Price' },
                      { value: 'type', label: 'Type' },
                      { value: 'location', label: 'Location' }
                    ].map((option) => (
                      <Button
                        key={option.value}
                        variant={sortBy === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy(option.value)}
                        className="justify-start min-h-[44px]"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={sortOrder === 'asc' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortOrder('asc')}
                      className="justify-start min-h-[44px]"
                    >
                      Ascending
                    </Button>
                    <Button
                      variant={sortOrder === 'desc' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortOrder('desc')}
                      className="justify-start min-h-[44px]"
                    >
                      Descending
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}

      {/* Properties Content with Pull-to-Refresh */}
      <div className="flex-1 overflow-hidden">
        <PullToRefresh onRefresh={onRefresh}>
          <SmoothScrollContainer className="h-full">
            <div className="p-4 pb-20"> {/* Extra bottom padding for FAB */}
              {children}
            </div>
          </SmoothScrollContainer>
        </PullToRefresh>
      </div>
    </div>
  )
}

export default MobilePropertiesLayout