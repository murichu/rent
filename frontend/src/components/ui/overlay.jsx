import * as React from "react"
import { createPortal } from "react-dom"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react"
import { Button } from "./button"

// Overlay variants
const overlayVariants = cva(
  "fixed inset-0 z-modal flex items-center justify-center transition-all duration-300 ease-out",
  {
    variants: {
      blur: {
        none: "bg-black/80",
        sm: "bg-black/80 backdrop-blur-sm",
        md: "bg-black/80 backdrop-blur-md",
        lg: "bg-black/80 backdrop-blur-lg",
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

// Main Overlay component
const Overlay = React.forwardRef(({
  children,
  isOpen = false,
  onClose,
  blur = "md",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  ...props
}, ref) => {
  const [isAnimating, setIsAnimating] = React.useState(false)

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

  const overlayContent = (
    <div
      ref={ref}
      className={cn(
        overlayVariants({ blur }),
        isOpen ? "opacity-100" : "opacity-0",
        className
      )}
      onClick={handleBackdropClick}
      onTransitionEnd={() => {
        if (!isOpen) setIsAnimating(false)
      }}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close overlay"
      >
        <X className="h-6 w-6" />
      </Button>
      {children}
    </div>
  )

  return createPortal(overlayContent, document.body)
})
Overlay.displayName = "Overlay"

// Image Gallery Overlay component
const ImageGalleryOverlay = ({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  showThumbnails = true,
  showControls = true,
  allowDownload = true
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
  const [position, setPosition] = React.useState({ x: 0, y: 0 })

  const currentImage = images[currentIndex]

  // Reset states when image changes
  React.useEffect(() => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }, [currentIndex])

  // Reset index when overlay opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoomIn()
          break
        case '-':
          e.preventDefault()
          handleZoomOut()
          break
        case 'r':
        case 'R':
          e.preventDefault()
          handleRotate()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, images.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = () => {
    if (currentImage?.src) {
      const link = document.createElement('a')
      link.href = currentImage.src
      link.download = currentImage.alt || `image-${currentIndex + 1}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  if (!currentImage) return null

  return (
    <Overlay
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdropClick={zoom === 1}
    >
      <div className="relative w-full h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Main Image Area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative">
            <img
              src={currentImage.src}
              alt={currentImage.alt || `Image ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-transform duration-200",
                zoom > 1 && "cursor-move"
              )}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              }}
              onMouseDown={handleMouseDown}
              draggable={false}
            />
          </div>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goToPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goToNext}
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Controls */}
        {showControls && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-lg p-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/20"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-white text-sm px-2">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/20"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-6 bg-white/30 mx-1" />
            
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-white hover:bg-white/20"
              onClick={handleRotate}
              aria-label="Rotate image"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            
            {allowDownload && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
                aria-label="Download image"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
            {currentIndex + 1} of {images.length}
          </div>
        )}

        {/* Thumbnails */}
        {showThumbnails && images.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2 max-w-full overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-all",
                  index === currentIndex
                    ? "border-white"
                    : "border-transparent hover:border-white/50"
                )}
                onClick={() => setCurrentIndex(index)}
              >
                <img
                  src={image.thumbnail || image.src}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  )
}

// Video Overlay component
const VideoOverlay = ({
  isOpen,
  onClose,
  videoSrc,
  title,
  autoPlay = true,
  controls = true
}) => {
  const videoRef = React.useRef(null)

  React.useEffect(() => {
    if (isOpen && videoRef.current) {
      if (autoPlay) {
        videoRef.current.play()
      }
    }
  }, [isOpen, autoPlay])

  return (
    <Overlay isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        {title && (
          <h3 className="text-white text-lg font-semibold mb-4 text-center">
            {title}
          </h3>
        )}
        <video
          ref={videoRef}
          src={videoSrc}
          controls={controls}
          className="w-full h-auto rounded-lg"
          onEnded={() => onClose?.()}
        />
      </div>
    </Overlay>
  )
}

// Content Preview Overlay - for documents, PDFs, etc.
const ContentPreviewOverlay = ({
  isOpen,
  onClose,
  content,
  title,
  type = "html" // html, pdf, iframe
}) => {
  const renderContent = () => {
    switch (type) {
      case 'pdf':
        return (
          <iframe
            src={content}
            className="w-full h-full border-0"
            title={title || "PDF Preview"}
          />
        )
      case 'iframe':
        return (
          <iframe
            src={content}
            className="w-full h-full border-0"
            title={title || "Content Preview"}
          />
        )
      case 'html':
      default:
        return (
          <div
            className="w-full h-full overflow-auto bg-white rounded-lg p-6"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-6xl h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
        {title && (
          <h3 className="text-white text-lg font-semibold mb-4 text-center">
            {title}
          </h3>
        )}
        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </Overlay>
  )
}

export {
  Overlay,
  ImageGalleryOverlay,
  VideoOverlay,
  ContentPreviewOverlay,
  overlayVariants
}