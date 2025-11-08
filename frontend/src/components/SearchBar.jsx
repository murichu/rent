import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Clock, TrendingUp, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SearchBar = ({
  value = '',
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search properties by name, location, or address...',
  suggestions = [],
  recentSearches = [],
  loading = false,
  disabled = false,
  showSuggestions = true,
  showRecentSearches = true,
  autoComplete = true,
  debounceMs = 300,
  className,
  inputClassName,
  containerClassName,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const debounceTimeoutRef = useRef(null)

  // Debounce search input
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedValue(internalValue)
      if (onChange) {
        onChange(internalValue)
      }
    }, debounceMs)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [internalValue, debounceMs, onChange])

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(internalValue.toLowerCase()) &&
    suggestion.toLowerCase() !== internalValue.toLowerCase()
  ).slice(0, 5)

  // Filter recent searches
  const filteredRecentSearches = recentSearches.filter(search =>
    search.toLowerCase().includes(internalValue.toLowerCase()) &&
    search.toLowerCase() !== internalValue.toLowerCase()
  ).slice(0, 3)

  // Combined dropdown items
  const dropdownItems = [
    ...filteredSuggestions.map(item => ({ type: 'suggestion', value: item })),
    ...(internalValue.length === 0 ? filteredRecentSearches.map(item => ({ type: 'recent', value: item })) : [])
  ]

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    setSelectedIndex(-1)
    setShowDropdown(true)
  }

  const handleInputFocus = () => {
    setIsFocused(true)
    setShowDropdown(true)
  }

  const handleInputBlur = (e) => {
    // Delay hiding dropdown to allow for clicks
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsFocused(false)
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }, 150)
  }

  const handleSubmit = (searchValue = internalValue) => {
    if (onSubmit) {
      onSubmit(searchValue)
    }
    setShowDropdown(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setInternalValue('')
    setDebouncedValue('')
    setShowDropdown(false)
    setSelectedIndex(-1)
    if (onClear) {
      onClear()
    }
    if (onChange) {
      onChange('')
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!showDropdown || dropdownItems.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < dropdownItems.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          const selectedItem = dropdownItems[selectedIndex]
          setInternalValue(selectedItem.value)
          handleSubmit(selectedItem.value)
        } else {
          handleSubmit()
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
      default:
        break
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInternalValue(suggestion)
    handleSubmit(suggestion)
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative w-full max-w-2xl', containerClassName)} {...props}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10">
          <Search className="h-5 w-5" />
        </div>
        
        <Input
          ref={inputRef}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pl-12 pr-12 h-12 text-base border-gray-300 focus:border-primary-500 focus:ring-primary-500 bg-white shadow-sm',
            'placeholder:text-gray-500',
            'transition-all duration-200',
            isFocused && 'ring-2 ring-primary-500 border-primary-500',
            inputClassName
          )}
          autoComplete={autoComplete ? 'on' : 'off'}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && (
            <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          )}
          
          {internalValue && !loading && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleClear}
              className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (showSuggestions || showRecentSearches) && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50',
            'max-h-80 overflow-y-auto',
            'animate-in fade-in-0 zoom-in-95 duration-200'
          )}
        >
          {dropdownItems.length > 0 ? (
            <div className="py-2">
              {dropdownItems.map((item, index) => (
                <button
                  key={`${item.type}-${item.value}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionClick(item.value)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                    'flex items-center gap-3 text-sm',
                    'transition-colors duration-150',
                    selectedIndex === index && 'bg-primary-50 text-primary-700'
                  )}
                >
                  <div className="flex-shrink-0 text-gray-400">
                    {item.type === 'recent' ? (
                      <Clock className="h-4 w-4" />
                    ) : item.value.includes('location') || item.value.includes('address') ? (
                      <MapPin className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item.value}
                    </div>
                    {item.type === 'recent' && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Recent search
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : internalValue.length > 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No suggestions found</p>
              <p className="text-xs text-gray-400 mt-1">
                Press Enter to search for "{internalValue}"
              </p>
            </div>
          ) : (
            showRecentSearches && recentSearches.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No recent searches</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start typing to see suggestions
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

// Mobile-optimized SearchBar variant
const MobileSearchBar = ({
  value = '',
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search properties...',
  className,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit(internalValue)
    }
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setInternalValue('')
    if (onClear) {
      onClear()
    }
    if (onChange) {
      onChange('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)} {...props}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        
        <Input
          ref={inputRef}
          type="search"
          value={internalValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-10 h-11 text-base border-gray-300 focus:border-primary-500 focus:ring-primary-500',
            'rounded-full bg-white shadow-sm',
            'placeholder:text-gray-500',
            isFocused && 'ring-2 ring-primary-500 border-primary-500'
          )}
        />

        {internalValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600 rounded-full"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  )
}

// Compact SearchBar for headers/toolbars
const CompactSearchBar = ({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'Search...',
  className,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value)
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    if (onChange) {
      onChange(newValue)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit(internalValue)
    }
  }

  const handleExpand = () => {
    setIsExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleCollapse = () => {
    if (!internalValue) {
      setIsExpanded(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)} {...props}>
      <div className={cn(
        'flex items-center transition-all duration-300',
        isExpanded ? 'w-64' : 'w-10'
      )}>
        {!isExpanded ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleExpand}
            className="h-10 w-10 text-gray-500 hover:text-gray-700"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </Button>
        ) : (
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <Input
              ref={inputRef}
              type="search"
              value={internalValue}
              onChange={handleInputChange}
              onBlur={handleCollapse}
              placeholder={placeholder}
              className="pl-9 pr-3 h-10 text-sm border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
            />
          </div>
        )}
      </div>
    </form>
  )
}

export { SearchBar, MobileSearchBar, CompactSearchBar }
export default SearchBar