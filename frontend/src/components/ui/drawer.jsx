import * as React from "react"
import { createPortal } from "react-dom"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"

// Drawer variants for different positions and sizes
const drawerVariants = cva(
  "fixed bg-white shadow-xl transform transition-all duration-300 ease-out z-modal flex flex-col",
  {
    variants: {
      position: {
        left: "left-0 top-0 h-full",
        right: "right-0 top-0 h-full",
        top: "top-0 left-0 w-full",
        bottom: "bottom-0 left-0 w-full",
      },
      size: {
        xs: "",
        sm: "",
        md: "",
        lg: "",
        xl: "",
        full: "",
      },
    },
    compoundVariants: [
      // Left/Right drawer sizes
      {
        position: ["left", "right"],
        size: "xs",
        class: "w-64",
      },
      {
        position: ["left", "right"],
        size: "sm",
        class: "w-80",
      },
      {
        position: ["left", "right"],
        size: "md",
        class: "w-96",
      },
      {
        position: ["left", "right"],
        size: "lg",
        class: "w-[28rem]",
      },
      {
        position: ["left", "right"],
        size: "xl",
        class: "w-[32rem]",
      },
      {
        position: ["left", "right"],
        size: "full",
        class: "w-full",
      },
      // Top/Bottom drawer sizes
      {
        position: ["top", "bottom"],
        size: "xs",
        class: "h-32",
      },
      {
        position: ["top", "bottom"],
        size: "sm",
        class: "h-48",
      },
      {
        position: ["top", "bottom"],
        size: "md",
        class: "h-64",
      },
      {
        position: ["top", "bottom"],
        size: "lg",
        class: "h-80",
      },
      {
        position: ["top", "bottom"],
        size: "xl",
        class: "h-96",
      },
      {
        position: ["top", "bottom"],
        size: "full",
        class: "h-full",
      },
    ],
    defaultVariants: {
      position: "right",
      size: "md",
    },
  }
)

// Backdrop variants
const backdropVariants = cva(
  "fixed inset-0 transition-all duration-300 ease-out z-modal-backdrop",
  {
    variants: {
      blur: {
        none: "bg-black/50",
        sm: "bg-black/50 backdrop-blur-sm",
        md: "bg-black/50 backdrop-blur-md",
        lg: "bg-black/50 backdrop-blur-lg",
      },
    },
    defaultVariants: {
      blur: "md",
    },
  }
)

// Hook for preventing background scroll
const useScrollLock = (isOpen) => {
  React.useEffect(() => {
    if (!isOpen) return

    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [isOpen])
}

// Hook for managing focus trap
const useFocusTrap = (isOpen, containerRef) => {
  const previousActiveElement = React.useRef(null)

  React.useEffect(() => {
    if (!isOpen) return

    previousActiveElement.current = document.activeElement
    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (firstElement) {
      firstElement.focus()
    }

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, containerRef])
}

// Get transform classes for animation
const getTransformClasses = (position, isOpen) => {
  const transforms = {
    left: isOpen ? "translate-x-0" : "-translate-x-full",
    right: isOpen ? "translate-x-0" : "translate-x-full",
    top: isOpen ? "translate-y-0" : "-translate-y-full",
    bottom: isOpen ? "translate-y-0" : "translate-y-full",
  }
  return transforms[position] || transforms.right
}

// Main Drawer component
const Drawer = React.forwardRef(({
  children,
  isOpen = false,
  onClose,
  position = "right",
  size = "md",
  blur = "md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  backdropClassName,
  ...props
}, ref) => {
  const drawerRef = React.useRef(null)
  const [isAnimating, setIsAnimating] = React.useState(false)

  // Combine refs
  const combinedRef = React.useCallback((node) => {
    drawerRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [ref])

  // Use custom hooks
  useFocusTrap(isOpen, drawerRef)
  useScrollLock(isOpen)

  // Handle escape key
  React.useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose?.()
    }
  }

  // Animation states
  React.useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  if (!isOpen && !isAnimating) return null

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          backdropVariants({ blur }),
          isOpen ? "opacity-100" : "opacity-0",
          backdropClassName
        )}
        onClick={handleBackdropClick}
        onTransitionEnd={() => {
          if (!isOpen) setIsAnimating(false)
        }}
      />
      
      {/* Drawer */}
      <div
        ref={combinedRef}
        className={cn(
          drawerVariants({ position, size }),
          getTransformClasses(position, isOpen),
          className
        )}
        role="dialog"
        aria-modal="true"
        {...props}
      >
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 right-4 z-10"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {children}
      </div>
    </>
  )

  return createPortal(drawerContent, document.body)
})
Drawer.displayName = "Drawer"

// Drawer Header component
const DrawerHeader = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 pb-4 border-b border-gray-200 flex-shrink-0",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DrawerHeader.displayName = "DrawerHeader"

// Drawer Title component
const DrawerTitle = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight text-gray-900",
      className
    )}
    {...props}
  >
    {children}
  </h2>
))
DrawerTitle.displayName = "DrawerTitle"

// Drawer Description component
const DrawerDescription = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-gray-600 leading-relaxed",
      className
    )}
    {...props}
  >
    {children}
  </p>
))
DrawerDescription.displayName = "DrawerDescription"

// Drawer Content component with scrolling support
const DrawerContent = React.forwardRef(({
  className,
  children,
  scrollable = true,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex-1 p-6",
      scrollable && "overflow-y-auto",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DrawerContent.displayName = "DrawerContent"

// Drawer Footer component
const DrawerFooter = React.forwardRef(({
  className,
  children,
  justify = "end",
  ...props
}, ref) => {
  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0",
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DrawerFooter.displayName = "DrawerFooter"

// Mobile Navigation Drawer - specific implementation
const MobileNavDrawer = ({
  isOpen,
  onClose,
  navigationItems = [],
  userInfo = null,
  onLogout
}) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="left"
      size="sm"
    >
      <DrawerHeader>
        <DrawerTitle>Navigation</DrawerTitle>
        {userInfo && (
          <DrawerDescription>
            Welcome back, {userInfo.name}
          </DrawerDescription>
        )}
      </DrawerHeader>

      <DrawerContent>
        <nav className="space-y-2">
          {navigationItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => {
                item.onClick?.()
                onClose()
              }}
            >
              {item.icon && (
                <span className="flex-shrink-0 w-5 h-5">
                  {item.icon}
                </span>
              )}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </DrawerContent>

      {userInfo && (
        <DrawerFooter justify="start">
          <Button
            variant="outline"
            onClick={() => {
              onLogout?.()
              onClose()
            }}
            className="w-full"
          >
            Sign Out
          </Button>
        </DrawerFooter>
      )}
    </Drawer>
  )
}

// Filter Drawer - specific implementation for filters
const FilterDrawer = ({
  isOpen,
  onClose,
  onApplyFilters,
  onClearFilters,
  children,
  activeFiltersCount = 0
}) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      size="md"
    >
      <DrawerHeader>
        <DrawerTitle>Filters</DrawerTitle>
        <DrawerDescription>
          Refine your search results
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </DrawerDescription>
      </DrawerHeader>

      <DrawerContent>
        {children}
      </DrawerContent>

      <DrawerFooter justify="between">
        <Button
          variant="outline"
          onClick={onClearFilters}
          disabled={activeFiltersCount === 0}
        >
          Clear All
        </Button>
        <Button onClick={onApplyFilters}>
          Apply Filters
        </Button>
      </DrawerFooter>
    </Drawer>
  )
}

// Notification Drawer - specific implementation for notifications
const NotificationDrawer = ({
  isOpen,
  onClose,
  notifications = [],
  onMarkAllRead,
  onNotificationClick
}) => {
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      size="md"
    >
      <DrawerHeader>
        <div className="flex items-center justify-between">
          <div>
            <DrawerTitle>Notifications</DrawerTitle>
            <DrawerDescription>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </DrawerDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
      </DrawerHeader>

      <DrawerContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-colors",
                  notification.read 
                    ? "bg-gray-50 border-gray-200" 
                    : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                )}
                onClick={() => onNotificationClick?.(notification)}
              >
                <div className="flex items-start gap-3">
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerFooter,
  MobileNavDrawer,
  FilterDrawer,
  NotificationDrawer,
  drawerVariants,
  backdropVariants
}