import React, { useState, useEffect, useCallback } from 'react'
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  Home,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  Bed,
  Bath,
  Square,
  Star,
  Wifi,
  Car,
  Coffee,
  Tv,
  AirVent,
  Waves
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Price Range Slider Component
const PriceRangeSlider = ({ 
  min = 0, 
  max = 100000, 
  value = [0, 100000], 
  onChange,
  currency = 'KSh',
  step = 1000,
  className 
}) => {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleMinChange = (e) => {
    const newMin = Math.min(Number(e.target.value), localValue[1] - step)
    const newValue = [newMin, localValue[1]]
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const handleMaxChange = (e) => {
    const newMax = Math.max(Number(e.target.value), localValue[0] + step)
    const newValue = [localValue[0], newMax]
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('KES', currency)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between text-sm font-medium text-gray-700">
        <span>Price Range</span>
        <span className="text-primary-600">
          {formatPrice(localValue[0])} - {formatPrice(localValue[1])}
        </span>
      </div>
      
      <div className="relative">
        {/* Track */}
        <div className="h-2 bg-gray-200 rounded-full relative">
          <div 
            className="absolute h-2 bg-primary-500 rounded-full"
            style={{
              left: `${((localValue[0] - min) / (max - min)) * 100}%`,
              width: `${((localValue[1] - localValue[0]) / (max - min)) * 100}%`
            }}
          />
        </div>
        
        {/* Min Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute top-0 w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
        />
        
        {/* Max Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute top-0 w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
        />
      </div>
      
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Min Price</label>
          <Input
            type="number"
            value={localValue[0]}
            onChange={(e) => handleMinChange(e)}
            min={min}
            max={localValue[1] - step}
            step={step}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Max Price</label>
          <Input
            type="number"
            value={localValue[1]}
            onChange={(e) => handleMaxChange(e)}
            min={localValue[0] + step}
            max={max}
            step={step}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )
}

// Checkbox Group Component
const CheckboxGroup = ({ 
  options = [], 
  value = [], 
  onChange, 
  title,
  icon: Icon,
  className 
}) => {
  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onChange?.(newValue)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </div>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                className="sr-only"
              />
              <div className={cn(
                'w-4 h-4 border-2 rounded transition-all duration-200',
                value.includes(option.value)
                  ? 'bg-primary-500 border-primary-500'
                  : 'border-gray-300 group-hover:border-primary-300'
              )}>
                {value.includes(option.value) && (
                  <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
              {option.label}
              {option.count && (
                <span className="text-gray-400 ml-1">({option.count})</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Collapsible Filter Section
const FilterSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultExpanded = true,
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={cn('border-b border-gray-200 last:border-b-0', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 px-4 -mx-4 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-500" />}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="pb-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

// Active Filter Chips
const ActiveFilterChips = ({ 
  filters = [], 
  onRemove, 
  onClearAll,
  className 
}) => {
  if (filters.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm font-medium text-gray-700">Active filters:</span>
      {filters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors"
        >
          <span className="text-xs">{filter.label}</span>
          <button
            type="button"
            onClick={() => onRemove(filter.key)}
            className="ml-1 hover:text-primary-900 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-gray-600 hover:text-gray-900 h-7 px-2 text-xs"
        >
          Clear all
        </Button>
      )}
    </div>
  )
}

// Main Filter System Component
const FilterSystem = ({
  filters = {},
  onChange,
  onApply,
  onReset,
  propertyTypes = [],
  amenities = [],
  locations = [],
  priceRange = { min: 0, max: 100000 },
  showMobileDrawer = false,
  onToggleMobileDrawer,
  className,
  ...props
}) => {
  const [localFilters, setLocalFilters] = useState(filters)
  const [hasChanges, setHasChanges] = useState(false)

  // Default property types
  const defaultPropertyTypes = [
    { value: 'apartment', label: 'Apartment', count: 45 },
    { value: 'house', label: 'House', count: 32 },
    { value: 'commercial', label: 'Commercial', count: 18 },
    { value: 'office', label: 'Office', count: 12 },
    { value: 'warehouse', label: 'Warehouse', count: 8 },
    { value: 'land', label: 'Land', count: 15 }
  ]

  // Default amenities with icons
  const defaultAmenities = [
    { value: 'wifi', label: 'WiFi', icon: Wifi },
    { value: 'parking', label: 'Parking', icon: Car },
    { value: 'kitchen', label: 'Kitchen', icon: Coffee },
    { value: 'tv', label: 'TV', icon: Tv },
    { value: 'ac', label: 'Air Conditioning', icon: AirVent },
    { value: 'pool', label: 'Swimming Pool', icon: Waves }
  ]

  useEffect(() => {
    setLocalFilters(filters)
    setHasChanges(false)
  }, [filters])

  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    setHasChanges(true)
    
    if (onChange) {
      onChange(newFilters)
    }
  }, [localFilters, onChange])

  const handleApply = () => {
    if (onApply) {
      onApply(localFilters)
    }
    setHasChanges(false)
  }

  const handleReset = () => {
    const resetFilters = {}
    setLocalFilters(resetFilters)
    setHasChanges(false)
    
    if (onReset) {
      onReset()
    }
    if (onChange) {
      onChange(resetFilters)
    }
  }

  // Generate active filter chips
  const activeFilters = []
  
  if (localFilters.priceRange && (localFilters.priceRange[0] > priceRange.min || localFilters.priceRange[1] < priceRange.max)) {
    activeFilters.push({
      key: 'priceRange',
      label: `KSh ${localFilters.priceRange[0].toLocaleString()} - KSh ${localFilters.priceRange[1].toLocaleString()}`
    })
  }
  
  if (localFilters.propertyTypes?.length > 0) {
    localFilters.propertyTypes.forEach(type => {
      const typeOption = [...defaultPropertyTypes, ...propertyTypes].find(t => t.value === type)
      if (typeOption) {
        activeFilters.push({
          key: `propertyType-${type}`,
          label: typeOption.label
        })
      }
    })
  }
  
  if (localFilters.amenities?.length > 0) {
    localFilters.amenities.forEach(amenity => {
      const amenityOption = [...defaultAmenities, ...amenities].find(a => a.value === amenity)
      if (amenityOption) {
        activeFilters.push({
          key: `amenity-${amenity}`,
          label: amenityOption.label
        })
      }
    })
  }

  const handleRemoveFilter = (filterKey) => {
    const newFilters = { ...localFilters }
    
    if (filterKey === 'priceRange') {
      delete newFilters.priceRange
    } else if (filterKey.startsWith('propertyType-')) {
      const type = filterKey.replace('propertyType-', '')
      newFilters.propertyTypes = (newFilters.propertyTypes || []).filter(t => t !== type)
      if (newFilters.propertyTypes.length === 0) {
        delete newFilters.propertyTypes
      }
    } else if (filterKey.startsWith('amenity-')) {
      const amenity = filterKey.replace('amenity-', '')
      newFilters.amenities = (newFilters.amenities || []).filter(a => a !== amenity)
      if (newFilters.amenities.length === 0) {
        delete newFilters.amenities
      }
    }
    
    setLocalFilters(newFilters)
    setHasChanges(true)
    
    if (onChange) {
      onChange(newFilters)
    }
  }

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <ActiveFilterChips
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={handleReset}
        />
      )}

      {/* Price Range */}
      <FilterSection title="Price Range" icon={DollarSign}>
        <PriceRangeSlider
          min={priceRange.min}
          max={priceRange.max}
          value={localFilters.priceRange || [priceRange.min, priceRange.max]}
          onChange={(value) => handleFilterChange('priceRange', value)}
        />
      </FilterSection>

      {/* Property Types */}
      <FilterSection title="Property Type" icon={Home}>
        <CheckboxGroup
          options={propertyTypes.length > 0 ? propertyTypes : defaultPropertyTypes}
          value={localFilters.propertyTypes || []}
          onChange={(value) => handleFilterChange('propertyTypes', value)}
        />
      </FilterSection>

      {/* Bedrooms & Bathrooms */}
      <FilterSection title="Rooms" icon={Bed}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-2">Bedrooms</label>
            <select
              value={localFilters.bedrooms || ''}
              onChange={(e) => handleFilterChange('bedrooms', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5+</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Bathrooms</label>
            <select
              value={localFilters.bathrooms || ''}
              onChange={(e) => handleFilterChange('bathrooms', e.target.value || undefined)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>
        </div>
      </FilterSection>

      {/* Amenities */}
      <FilterSection title="Amenities" icon={Star}>
        <CheckboxGroup
          options={amenities.length > 0 ? amenities : defaultAmenities}
          value={localFilters.amenities || []}
          onChange={(value) => handleFilterChange('amenities', value)}
        />
      </FilterSection>

      {/* Location */}
      {locations.length > 0 && (
        <FilterSection title="Location" icon={MapPin}>
          <CheckboxGroup
            options={locations}
            value={localFilters.locations || []}
            onChange={(value) => handleFilterChange('locations', value)}
          />
        </FilterSection>
      )}

      {/* Apply/Reset Buttons */}
      {hasChanges && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleApply}
            className="flex-1"
          >
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  )

  // Mobile Drawer
  if (showMobileDrawer) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onToggleMobileDrawer}
        />
        
        {/* Drawer */}
        <div className="fixed right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-xl animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMobileDrawer}
              aria-label="Close filters"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
            <FilterContent />
          </div>
        </div>
      </div>
    )
  }

  // Desktop Panel
  return (
    <Card className={cn('w-full', className)} {...props}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <SlidersHorizontal className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  )
}

export { FilterSystem, PriceRangeSlider, CheckboxGroup, FilterSection, ActiveFilterChips }
export default FilterSystem