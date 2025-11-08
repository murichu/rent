import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-gray-300 focus-visible:border-primary-500 focus-visible:ring-primary-500",
        error: "border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500",
        success: "border-success-500 focus-visible:border-success-500 focus-visible:ring-success-500",
      },
      size: {
        sm: "h-11 px-2 text-xs min-h-[44px]", // Increased to meet 44px requirement
        default: "h-11 px-3 text-sm min-h-[44px]", // Increased to meet 44px requirement
        lg: "h-12 px-4 text-base min-h-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Input = React.forwardRef(({ 
  className, 
  type, 
  variant,
  size,
  error,
  success,
  ...props 
}, ref) => {
  // Determine variant based on props
  const computedVariant = error ? "error" : success ? "success" : variant

  return (
    <input
      type={type}
      className={cn(inputVariants({ variant: computedVariant, size }), className)}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

// Enhanced Input with Label and Error Message
const FormInput = React.forwardRef(({
  label,
  error,
  success,
  helperText,
  required,
  className,
  containerClassName,
  leftIcon,
  rightIcon,
  autoSave = false,
  autoSaveDelay = 1000,
  onAutoSave,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = React.useState(props.value || props.defaultValue || "")
  const [isValidating, setIsValidating] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const autoSaveTimeoutRef = React.useRef(null)
  const id = props.id || `input-${Math.random().toString(36).slice(2, 9)}`

  // Handle auto-save functionality
  React.useEffect(() => {
    if (autoSave && onAutoSave && isDirty && internalValue !== (props.value || props.defaultValue || "")) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        setIsValidating(true)
        onAutoSave(internalValue)
          .finally(() => {
            setIsValidating(false)
            setIsDirty(false)
          })
      }, autoSaveDelay)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [internalValue, autoSave, onAutoSave, autoSaveDelay, isDirty, props.value, props.defaultValue])

  const handleChange = (e) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    setIsDirty(true)
    
    if (props.onChange) {
      props.onChange(e)
    }
  }

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <label 
          htmlFor={id}
          className={cn(
            "block text-sm font-medium text-gray-700",
            required && "after:content-['*'] after:ml-0.5 after:text-error-500"
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <Input
          ref={ref}
          id={id}
          error={!!error}
          success={!!success}
          className={cn(
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className
          )}
          value={internalValue}
          onChange={handleChange}
          {...props}
        />
        {(rightIcon || isValidating) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {isValidating ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : rightIcon}
          </div>
        )}
      </div>
      {(error || success || helperText) && (
        <p className={cn(
          "text-xs flex items-center gap-1",
          error && "text-error-600",
          success && "text-success-600", 
          !error && !success && "text-gray-500"
        )}>
          {error && (
            <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
          )}
          {success && (
            <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
          )}
          {error || success || helperText}
        </p>
      )}
      {autoSave && isDirty && !isValidating && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Auto-saving...
        </p>
      )}
    </div>
  )
})
FormInput.displayName = "FormInput"

// Floating Label Input
const FloatingInput = React.forwardRef(({
  label,
  className,
  containerClassName,
  error,
  success,
  required,
  ...props
}, ref) => {
  const [focused, setFocused] = React.useState(false)
  const [hasValue, setHasValue] = React.useState(false)
  const id = props.id || `floating-input-${Math.random().toString(36).slice(2, 9)}`

  const handleFocus = (e) => {
    setFocused(true)
    if (props.onFocus) props.onFocus(e)
  }
  
  const handleBlur = (e) => {
    setFocused(false)
    setHasValue(e.target.value !== '')
    if (props.onBlur) props.onBlur(e)
  }

  React.useEffect(() => {
    setHasValue(props.value !== '' && props.value !== undefined && props.value !== null)
  }, [props.value])

  const isLabelFloated = focused || hasValue
  const computedVariant = error ? "error" : success ? "success" : "default"

  return (
    <div className={cn("relative", containerClassName)}>
      <Input
        ref={ref}
        id={id}
        variant={computedVariant}
        className={cn("peer pt-6 pb-2 placeholder-transparent", className)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder=" "
        {...props}
      />
      <label
        htmlFor={id}
        className={cn(
          "absolute left-3 transition-all duration-200 pointer-events-none select-none",
          "peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-500",
          "peer-focus:top-1.5 peer-focus:text-xs",
          isLabelFloated && "top-1.5 text-xs",
          focused && !error && "text-primary-600",
          error && "text-error-600",
          success && "text-success-600",
          !focused && !error && !success && isLabelFloated && "text-gray-600",
          required && "after:content-['*'] after:ml-0.5 after:text-error-500"
        )}
      >
        {label}
      </label>
    </div>
  )
})
FloatingInput.displayName = "FloatingInput"

// TextArea Component
const TextArea = React.forwardRef(({
  className,
  variant = "default",
  error,
  success,
  ...props
}, ref) => {
  const computedVariant = error ? "error" : success ? "success" : variant

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical",
        computedVariant === "default" && "border-gray-300 focus-visible:border-primary-500 focus-visible:ring-primary-500",
        computedVariant === "error" && "border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500",
        computedVariant === "success" && "border-success-500 focus-visible:border-success-500 focus-visible:ring-success-500",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
TextArea.displayName = "TextArea"

// Search Input Component
const SearchInput = React.forwardRef(({
  className,
  onClear,
  showClearButton = true,
  ...props
}, ref) => {
  const [value, setValue] = React.useState(props.value || props.defaultValue || "")

  const handleChange = (e) => {
    setValue(e.target.value)
    if (props.onChange) props.onChange(e)
  }

  const handleClear = () => {
    setValue("")
    if (onClear) onClear()
    if (props.onChange) {
      const event = { target: { value: "" } }
      props.onChange(event)
    }
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <Input
        ref={ref}
        type="search"
        className={cn("pl-10", showClearButton && value && "pr-10", className)}
        value={value}
        onChange={handleChange}
        {...props}
      />
      {showClearButton && value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Clear search"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
})
SearchInput.displayName = "SearchInput"

// Form Field Wrapper for consistent spacing and layout
const FormField = React.forwardRef(({
  children,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn("space-y-2", className)}
      {...props}
    >
      {children}
    </div>
  )
})
FormField.displayName = "FormField"

export { 
  Input, 
  FormInput, 
  FloatingInput, 
  TextArea, 
  SearchInput, 
  FormField,
  inputVariants 
}
