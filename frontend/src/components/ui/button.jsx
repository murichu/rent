import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 relative overflow-hidden",
  {
    variants: {
      variant: {
        primary: "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-500 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-500 shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-primary-500 shadow-sm hover:shadow-md hover:border-primary-300",
        ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500 hover:shadow-sm",
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 focus-visible:ring-primary-500 p-0 h-auto shadow-none",
        destructive: "bg-error-500 text-white hover:bg-error-600 active:bg-error-700 focus-visible:ring-error-500 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        success: "bg-success-500 text-white hover:bg-success-600 active:bg-success-700 focus-visible:ring-success-500 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        warning: "bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 focus-visible:ring-warning-500 shadow-sm hover:shadow-md hover:-translate-y-0.5",
      },
      size: {
        sm: "h-11 px-3 text-sm rounded-md gap-1.5 min-h-[44px]", // Increased to meet 44px requirement
        default: "h-11 px-4 py-2 text-sm rounded-lg gap-2 min-h-[44px]", // Increased to meet 44px requirement
        lg: "h-12 px-6 text-base rounded-lg gap-2 min-h-[44px]",
        icon: "h-11 w-11 rounded-lg min-h-[44px] min-w-[44px]", // Increased to meet 44px requirement
        "icon-sm": "h-11 w-11 rounded-md min-h-[44px] min-w-[44px]", // Increased to meet 44px requirement
        "icon-lg": "h-12 w-12 rounded-lg min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

const LoadingSpinner = ({ size = "sm" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  }
  
  return (
    <svg
      className={cn("animate-spin", sizeClasses[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  loading = false,
  loadingText,
  children,
  disabled,
  leftIcon,
  rightIcon,
  ...props 
}, ref) => {
  const isDisabled = disabled || loading
  const spinnerSize = size === "sm" ? "sm" : size === "lg" ? "md" : "sm"

  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading && <LoadingSpinner size={spinnerSize} />}
      {!loading && leftIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className={cn(loading && "opacity-0")}>
        {loading && loadingText ? loadingText : children}
      </span>
      {!loading && rightIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
})
Button.displayName = "Button"

// Button Group Component for related actions
const ButtonGroup = React.forwardRef(({ 
  className, 
  orientation = "horizontal",
  children,
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex",
        orientation === "horizontal" ? "flex-row" : "flex-col",
        "[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg",
        orientation === "vertical" && "[&>button:first-child]:rounded-t-lg [&>button:first-child]:rounded-l-none [&>button:last-child]:rounded-b-lg [&>button:last-child]:rounded-r-none",
        "[&>button:not(:first-child)]:border-l-0",
        orientation === "vertical" && "[&>button:not(:first-child)]:border-l [&>button:not(:first-child)]:border-t-0",
        className
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  )
})
ButtonGroup.displayName = "ButtonGroup"

// Icon Button Component
const IconButton = React.forwardRef(({ 
  className,
  variant = "ghost",
  size = "icon",
  children,
  "aria-label": ariaLabel,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={className}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </Button>
  )
})
IconButton.displayName = "IconButton"

export { Button, ButtonGroup, IconButton, LoadingSpinner, buttonVariants }
