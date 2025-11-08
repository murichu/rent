import { useState, useEffect } from 'react'

// Custom hook for responsive breakpoints
export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  const [breakpoint, setBreakpoint] = useState('sm')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setWindowSize({ width, height })
      
      // Determine current breakpoint based on Tailwind defaults
      if (width >= 1536) {
        setBreakpoint('2xl')
      } else if (width >= 1280) {
        setBreakpoint('xl')
      } else if (width >= 1024) {
        setBreakpoint('lg')
      } else if (width >= 768) {
        setBreakpoint('md')
      } else if (width >= 640) {
        setBreakpoint('sm')
      } else {
        setBreakpoint('xs')
      }
    }

    // Set initial values
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    windowSize,
    breakpoint,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    isSmallScreen: windowSize.width < 640,
    isMediumScreen: windowSize.width >= 640 && windowSize.width < 1024,
    isLargeScreen: windowSize.width >= 1024,
  }
}

// Hook for detecting touch devices
export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()
    
    // Listen for touch events to detect touch capability
    const handleTouchStart = () => setIsTouch(true)
    window.addEventListener('touchstart', handleTouchStart, { once: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  return isTouch
}

// Hook for viewport height (useful for mobile browsers with dynamic viewport)
export const useViewportHeight = () => {
  const [vh, setVh] = useState(0)

  useEffect(() => {
    const updateVh = () => {
      const vh = window.innerHeight * 0.01
      setVh(vh)
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    updateVh()
    window.addEventListener('resize', updateVh)
    window.addEventListener('orientationchange', updateVh)

    return () => {
      window.removeEventListener('resize', updateVh)
      window.removeEventListener('orientationchange', updateVh)
    }
  }, [])

  return vh
}