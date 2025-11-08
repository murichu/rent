import React, { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { cn } from '@/lib/utils'
import { useGestures } from '@/hooks/useGestures'

// Touch-optimized Input with enhanced interactions
const TouchInput = ({ 
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  success,
  disabled,
  className,
  autoComplete,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const inputRef = useRef(null)

  const { hapticFeedback } = useGestures()

  const handleFocus = (e) => {
    setIsFocused(true)
    setHasInteracted(true)
    hapticFeedback(20)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
    hapticFeedback(30)
  }

  const inputType = type === 'password' && showPassword ? 'text' : type

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label 
          htmlFor={props.id}
          className={cn(
            'block text-sm font-medium transition-colors',
            isFocused ? 'text-primary-600' : 'text-gray-700',
            error && hasInteracted && 'text-red-600'
          )}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          className={cn(
            'min-h-[48px] text-base transition-all duration-200',
            'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'touch-manipulation',
            isFocused && 'ring-2 ring-primary-500 border-primary-500',
            error && hasInteracted && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            success && hasInteracted && 'border-green-500 focus:border-green-500 focus:ring-green-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...props}
        />
        
        {/* Password toggle */}
        {type === 'password' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Eye className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        )}
        
        {/* Success/Error icons */}
        {hasInteracted && (success || error) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {success && <Check className="h-4 w-4 text-green-500" />}
            {error && <X className="h-4 w-4 text-red-500" />}
          </div>
        )}
      </div>
      
      {/* Error/Success messages */}
      {hasInteracted && error && (
        <p className="text-sm text-red-600 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
      {hasInteracted && success && (
        <p className="text-sm text-green-600 animate-in slide-in-from-top-1 duration-200">
          {success}
        </p>
      )}
    </div>
  )
}

// Touch-optimized Select component
const TouchSelect = ({ 
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled,
  className,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const selectRef = useRef(null)

  const { hapticFeedback } = useGestures()

  const handleToggle = () => {
    if (disabled) return
    setIsOpen(!isOpen)
    setHasInteracted(true)
    hapticFeedback(30)
  }

  const handleSelect = (option) => {
    onChange(option.value)
    setIsOpen(false)
    hapticFeedback(20)
  }

  const selectedOption = options.find(opt => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('space-y-2', className)} ref={selectRef}>
      {label && (
        <label className={cn(
          'block text-sm font-medium',
          error && hasInteracted ? 'text-red-600' : 'text-gray-700'
        )}>
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'w-full min-h-[48px] px-3 py-2 text-left bg-white border border-gray-300 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'transition-all duration-200 touch-manipulation',
            'flex items-center justify-between',
            isOpen && 'ring-2 ring-primary-500 border-primary-500',
            error && hasInteracted && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
          )}
          {...props}
        >
          <span className={cn(
            'block truncate text-base',
            !selectedOption && 'text-gray-500'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>
        
        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  'w-full px-3 py-3 text-left text-base hover:bg-gray-50 focus:bg-gray-50',
                  'focus:outline-none transition-colors touch-manipulation',
                  'min-h-[48px] flex items-center',
                  value === option.value && 'bg-primary-50 text-primary-600 font-medium'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {hasInteracted && error && (
        <p className="text-sm text-red-600 animate-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}

// Touch-optimized Checkbox
const TouchCheckbox = ({ 
  label,
  checked,
  onChange,
  disabled,
  className,
  ...props 
}) => {
  const { hapticFeedback } = useGestures()

  const handleChange = (e) => {
    onChange(e.target.checked)
    hapticFeedback(20)
  }

  return (
    <label className={cn(
      'flex items-center space-x-3 cursor-pointer touch-manipulation',
      'min-h-[48px] py-2',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div className={cn(
          'w-5 h-5 border-2 rounded transition-all duration-200',
          'flex items-center justify-center',
          checked 
            ? 'bg-primary-600 border-primary-600' 
            : 'bg-white border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50'
        )}>
          {checked && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>
      </div>
      <span className="text-base text-gray-700 select-none">
        {label}
      </span>
    </label>
  )
}

// Touch-optimized Radio Group
const TouchRadioGroup = ({ 
  label,
  options = [],
  value,
  onChange,
  disabled,
  className,
  ...props 
}) => {
  const { hapticFeedback } = useGestures()

  const handleChange = (optionValue) => {
    onChange(optionValue)
    hapticFeedback(20)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center space-x-3 cursor-pointer touch-manipulation',
              'min-h-[48px] py-2',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="relative">
              <input
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={() => handleChange(option.value)}
                disabled={disabled}
                className="sr-only"
              />
              <div className={cn(
                'w-5 h-5 border-2 rounded-full transition-all duration-200',
                'flex items-center justify-center',
                value === option.value
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-white border-gray-300 hover:border-gray-400',
                disabled && 'opacity-50'
              )}>
                {value === option.value && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
            </div>
            <span className="text-base text-gray-700 select-none">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Touch-optimized Button with enhanced feedback
const TouchButton = ({ 
  children,
  variant = 'default',
  size = 'default',
  disabled,
  loading,
  className,
  onClick,
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const { hapticFeedback } = useGestures()

  const handlePress = () => {
    setIsPressed(true)
    hapticFeedback(30)
  }

  const handleRelease = () => {
    setIsPressed(false)
  }

  const handleClick = (e) => {
    if (!disabled && !loading) {
      onClick?.(e)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={handleClick}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      className={cn(
        'min-h-[48px] touch-manipulation transition-all duration-150',
        'active:scale-95',
        isPressed && 'scale-95',
        className
      )}
      {...props}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </Button>
  )
}

export {
  TouchInput,
  TouchSelect,
  TouchCheckbox,
  TouchRadioGroup,
  TouchButton
}

export default TouchInput