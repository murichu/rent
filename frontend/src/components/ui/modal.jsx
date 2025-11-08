import * as React from "react"
import { createPortal } from "react-dom"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "./button"

// Modal variants for different sizes and behaviors
const modalVariants = cva(
  "relative bg-white rounded-lg shadow-xl transform transition-all duration-300 ease-out max-h-[90vh] flex flex-col",
  {
    variants: {
      size: {
        xs: "w-full max-w-xs",
        sm: "w-full max-w-sm", 
        md: "w-full max-w-md",
        lg: "w-full max-w-lg",
        xl: "w-full max-w-xl",
        "2xl": "w-full max-w-2xl",
        "3xl": "w-full max-w-3xl",
        "4xl": "w-full max-w-4xl",
        "5xl": "w-full max-w-5xl",
        "6xl": "w-full max-w-6xl",
        "7xl": "w-full max-w-7xl",
        full: "w-full h-full max-w-none max-h-none rounded-none",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

// Backdrop variants for different blur effects
const backdropVariants = cva(
  "fixed inset-0 transition-all duration-300 ease-out",
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

// Hook for managing focus trap and keyboard navigation
const useFocusTrap = (isOpen, containerRef) => {
  const previousActiveElement = React.useRef(null)

  React.useEffect(() => {
    if (!isOpen) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement

    const container = containerRef.current
    if (!container) return

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus the first element
    if (firstElement) {
      firstElement.focus()
    }

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, containerRef])
}

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

// Main Modal component
const Modal = React.forwardRef(({
  children,
  isOpen = false,
  onClose,
  size = "md",
  blur = "md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  backdropClassName,
  ...props
}, ref) => {
  const modalRef = React.useRef(null)
  const [isAnimating, setIsAnimating] = React.useState(false)

  // Combine refs
  const combinedRef = React.useCallback((node) => {
    modalRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [ref])

  // Use custom hooks
  useFocusTrap(isOpen, modalRef)
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

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 z-modal flex items-center justify-center p-4",
        backdropVariants({ blur }),
        backdropClassName,
        isOpen ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
      onTransitionEnd={() => {
        if (!isOpen) setIsAnimating(false)
      }}
    >
      <div
        ref={combinedRef}
        className={cn(
          modalVariants({ size }),
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
          className
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-4 right-4 z-10"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
})
Modal.displayName = "Modal"

// Modal Header component
const ModalHeader = React.forwardRef(({
  className,
  children,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 pb-4 border-b border-gray-200",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
ModalHeader.displayName = "ModalHeader"

// Modal Title component
const ModalTitle = React.forwardRef(({
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
ModalTitle.displayName = "ModalTitle"

// Modal Description component
const ModalDescription = React.forwardRef(({
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
ModalDescription.displayName = "ModalDescription"

// Modal Content component with scrolling support
const ModalContent = React.forwardRef(({
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
ModalContent.displayName = "ModalContent"

// Modal Footer component
const ModalFooter = React.forwardRef(({
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
        "flex items-center gap-3 p-6 pt-4 border-t border-gray-200",
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
ModalFooter.displayName = "ModalFooter"

// Confirmation Modal component
const ConfirmationModal = React.forwardRef(({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  ...props
}, ref) => {
  const handleConfirm = async () => {
    await onConfirm?.()
  }

  return (
    <Modal
      ref={ref}
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      {...props}
    >
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        {description && (
          <ModalDescription>{description}</ModalDescription>
        )}
      </ModalHeader>
      <ModalFooter justify="end">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "primary"}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  )
})
ConfirmationModal.displayName = "ConfirmationModal"

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ConfirmationModal,
  modalVariants,
  backdropVariants
}