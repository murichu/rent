import React, { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SmoothScrollContainer = ({ 
  children, 
  className,
  momentum = true,
  bounceBack = true,
  scrollbarHidden = false,
  onScroll,
  ...props 
}) => {
  const containerRef = useRef(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollVelocity, setScrollVelocity] = useState(0)
  const lastScrollTime = useRef(Date.now())
  const lastScrollTop = useRef(0)
  const momentumAnimation = useRef(null)
  const scrollTimeout = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isTouch = false
    let startY = 0
    let startScrollTop = 0

    const handleTouchStart = (e) => {
      isTouch = true
      startY = e.touches[0].clientY
      startScrollTop = container.scrollTop
      
      // Cancel any ongoing momentum animation
      if (momentumAnimation.current) {
        cancelAnimationFrame(momentumAnimation.current)
        momentumAnimation.current = null
      }
    }

    const handleTouchMove = (e) => {
      if (!isTouch) return
      
      const currentY = e.touches[0].clientY
      const deltaY = startY - currentY
      const newScrollTop = startScrollTop + deltaY

      // Apply bounce effect at boundaries
      if (bounceBack) {
        const maxScroll = container.scrollHeight - container.clientHeight
        
        if (newScrollTop < 0) {
          // Bounce at top
          const resistance = Math.abs(newScrollTop) * 0.3
          container.scrollTop = -resistance
        } else if (newScrollTop > maxScroll) {
          // Bounce at bottom
          const resistance = (newScrollTop - maxScroll) * 0.3
          container.scrollTop = maxScroll + resistance
        } else {
          container.scrollTop = newScrollTop
        }
      } else {
        container.scrollTop = newScrollTop
      }

      // Calculate velocity for momentum
      const now = Date.now()
      const timeDelta = now - lastScrollTime.current
      const scrollDelta = container.scrollTop - lastScrollTop.current
      
      if (timeDelta > 0) {
        setScrollVelocity(scrollDelta / timeDelta)
      }
      
      lastScrollTime.current = now
      lastScrollTop.current = container.scrollTop
    }

    const handleTouchEnd = () => {
      isTouch = false
      
      if (momentum && Math.abs(scrollVelocity) > 0.1) {
        // Apply momentum scrolling
        applyMomentum()
      } else if (bounceBack) {
        // Snap back if overscrolled
        snapBack()
      }
    }

    const applyMomentum = () => {
      let velocity = scrollVelocity * 16 // Convert to pixels per frame
      const friction = 0.95
      const minVelocity = 0.1
      
      const animate = () => {
        if (Math.abs(velocity) < minVelocity) {
          snapBack()
          return
        }
        
        const newScrollTop = container.scrollTop + velocity
        const maxScroll = container.scrollHeight - container.clientHeight
        
        if (bounceBack && (newScrollTop < 0 || newScrollTop > maxScroll)) {
          // Hit boundary, apply bounce
          velocity *= -0.3
          snapBack()
        } else {
          container.scrollTop = newScrollTop
          velocity *= friction
          momentumAnimation.current = requestAnimationFrame(animate)
        }
      }
      
      momentumAnimation.current = requestAnimationFrame(animate)
    }

    const snapBack = () => {
      const maxScroll = container.scrollHeight - container.clientHeight
      let targetScrollTop = container.scrollTop
      
      if (container.scrollTop < 0) {
        targetScrollTop = 0
      } else if (container.scrollTop > maxScroll) {
        targetScrollTop = maxScroll
      } else {
        return // No need to snap back
      }
      
      // Smooth animation back to bounds
      const startScrollTop = container.scrollTop
      const distance = targetScrollTop - startScrollTop
      const duration = 300
      const startTime = Date.now()
      
      const animateSnapBack = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        container.scrollTop = startScrollTop + (distance * easeOut)
        
        if (progress < 1) {
          requestAnimationFrame(animateSnapBack)
        }
      }
      
      requestAnimationFrame(animateSnapBack)
    }

    const handleScroll = (e) => {
      setIsScrolling(true)
      
      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
      
      // Set new timeout to detect scroll end
      scrollTimeout.current = setTimeout(() => {
        setIsScrolling(false)
      }, 150)
      
      onScroll?.(e)
    }

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('scroll', handleScroll)
      
      if (momentumAnimation.current) {
        cancelAnimationFrame(momentumAnimation.current)
      }
      
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [momentum, bounceBack, scrollVelocity, onScroll])

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-auto',
        scrollbarHidden && 'scrollbar-hide',
        'scroll-smooth',
        className
      )}
      style={{
        WebkitOverflowScrolling: 'touch', // Enable momentum scrolling on iOS
        scrollBehavior: 'smooth'
      }}
      {...props}
    >
      {children}
      
      {/* Scroll indicator */}
      {isScrolling && (
        <div className="fixed top-4 right-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs z-50 animate-in fade-in duration-200">
          Scrolling...
        </div>
      )}
    </div>
  )
}

export default SmoothScrollContainer