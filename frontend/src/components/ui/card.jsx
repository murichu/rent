import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-white text-gray-900 transition-all duration-200 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-gray-200 shadow-sm hover:shadow-md",
        elevated: "border-gray-200 shadow-md hover:shadow-lg hover:-translate-y-1",
        outlined: "border-gray-300 shadow-none hover:shadow-sm hover:border-gray-400",
        ghost: "border-transparent shadow-none hover:bg-gray-50",
        interactive: "border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:-translate-y-1",
        feature: "border-primary-200 bg-primary-50 shadow-sm hover:shadow-md hover:bg-primary-100",
        success: "border-success-200 bg-success-50 shadow-sm hover:shadow-md",
        warning: "border-warning-200 bg-warning-50 shadow-sm hover:shadow-md",
        error: "border-error-200 bg-error-50 shadow-sm hover:shadow-md",
      },
      padding: {
        none: "",
        xs: "p-2",
        sm: "p-4", 
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

const Card = React.forwardRef(({ 
  className, 
  variant, 
  padding,
  loading = false,
  skeleton = "default",
  hoverable = false,
  selected = false,
  disabled = false,
  ...props 
}, ref) => {
  if (loading) {
    return <CardSkeleton variant={variant} padding={padding} skeleton={skeleton} className={className} />
  }

  return (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, padding }),
        hoverable && "hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        selected && "ring-2 ring-primary-500 border-primary-500",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

// Card Skeleton Component
const CardSkeleton = React.forwardRef(({ 
  className, 
  variant = "default", 
  padding = "default",
  skeleton = "default",
  ...props 
}, ref) => {
  const skeletonLayouts = {
    default: (
      <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    ),
    media: (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-gray-200 rounded"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    ),
    profile: (
      <div className="flex items-center space-x-4 animate-pulse">
        <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    ),
    metric: (
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    >
      {skeletonLayouts[skeleton] || skeletonLayouts.default}
    </div>
  )
})
CardSkeleton.displayName = "CardSkeleton"

const CardHeader = React.forwardRef(({ 
  className, 
  noPadding = false,
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      !noPadding && "p-6",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ 
  className, 
  size = "default", 
  as: Component = "h3",
  ...props 
}, ref) => {
  const sizeClasses = {
    xs: "text-sm font-semibold leading-tight tracking-tight",
    sm: "text-base font-semibold leading-tight tracking-tight",
    default: "text-lg font-semibold leading-tight tracking-tight",
    lg: "text-xl font-semibold leading-tight tracking-tight",
    xl: "text-2xl font-bold leading-tight tracking-tight",
  }

  return (
    <Component
      ref={ref}
      className={cn(sizeClasses[size], className)}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ 
  className, 
  noPadding = false,
  ...props 
}, ref) => (
  <div 
    ref={ref} 
    className={cn(
      !noPadding && "p-6 pt-0", 
      className
    )} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ 
  className, 
  noPadding = false,
  justify = "start",
  ...props 
}, ref) => {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center", 
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2",
        !noPadding && "p-6 pt-0",
        justifyClasses[justify],
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

// Card Media Component for images/videos
const CardMedia = React.forwardRef(({ 
  className,
  src,
  alt,
  aspectRatio = "16/9",
  ...props 
}, ref) => (
  <div 
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    style={{ aspectRatio }}
    {...props}
  >
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 hover:scale-105"
    />
  </div>
))
CardMedia.displayName = "CardMedia"

// Card Badge Component
const CardBadge = React.forwardRef(({ 
  className,
  variant = "default",
  children,
  ...props 
}, ref) => {
  const badgeVariants = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-primary-100 text-primary-800",
    success: "bg-success-100 text-success-800",
    warning: "bg-warning-100 text-warning-800",
    error: "bg-error-100 text-error-800",
  }

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
})
CardBadge.displayName = "CardBadge"

// Interactive Card Component
const InteractiveCard = React.forwardRef(({ 
  className,
  onClick,
  onKeyDown,
  children,
  ...props 
}, ref) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(e)
    }
    onKeyDown?.(e)
  }

  return (
    <Card
      ref={ref}
      variant="interactive"
      className={cn("focus:outline-none focus:ring-2 focus:ring-primary-500", className)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      {...props}
    >
      {children}
    </Card>
  )
})
InteractiveCard.displayName = "InteractiveCard"

export { 
  Card, 
  CardSkeleton,
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardMedia,
  CardBadge,
  InteractiveCard,
  cardVariants 
}
