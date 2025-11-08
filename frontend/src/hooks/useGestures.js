import { useState, useRef, useEffect, useCallback } from 'react'

// Enhanced gesture detection hook
export const useGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onTap,
  onDoubleTap,
  onLongPress,
  onPinch,
  threshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300,
  preventScroll = false
} = {}) => {
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isPressed, setIsPressed] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  
  const longPressTimer = useRef(null)
  const doubleTapTimer = useRef(null)
  const initialDistance = useRef(0)
  const currentDistance = useRef(0)

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Provide haptic feedback if available
  const hapticFeedback = useCallback((intensity = 30) => {
    if (navigator.vibrate) {
      navigator.vibrate(intensity)
    }
  }, [])

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    
    if (e.touches.length === 1) {
      // Single touch
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      })
      setTouchEnd(null)
      setIsPressed(true)

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        onLongPress?.(e)
        hapticFeedback(50)
      }, longPressDelay)

    } else if (e.touches.length === 2) {
      // Multi-touch (pinch)
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      initialDistance.current = getDistance(touch1, touch2)
      
      // Clear long press timer for multi-touch
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    if (preventScroll) {
      e.preventDefault()
    }
  }, [onLongPress, longPressDelay, hapticFeedback, preventScroll])

  const handleTouchMove = useCallback((e) => {
    if (!touchStart) return

    const touch = e.touches[0]
    
    if (e.touches.length === 1) {
      // Single touch movement
      setTouchEnd({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      })

      // Cancel long press if moved too much
      const deltaX = Math.abs(touch.clientX - touchStart.x)
      const deltaY = Math.abs(touch.clientY - touchStart.y)
      
      if ((deltaX > 10 || deltaY > 10) && longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

    } else if (e.touches.length === 2) {
      // Multi-touch (pinch)
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      currentDistance.current = getDistance(touch1, touch2)
      
      const scale = currentDistance.current / initialDistance.current
      onPinch?.(scale, e)
    }

    if (preventScroll) {
      e.preventDefault()
    }
  }, [touchStart, onPinch, preventScroll])

  const handleTouchEnd = useCallback((e) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    setIsPressed(false)

    if (!touchStart || !touchEnd) {
      // Handle tap
      const now = Date.now()
      const timeSinceLastTap = now - lastTap

      if (timeSinceLastTap < doubleTapDelay && timeSinceLastTap > 0) {
        // Double tap
        if (doubleTapTimer.current) {
          clearTimeout(doubleTapTimer.current)
          doubleTapTimer.current = null
        }
        onDoubleTap?.(e)
        hapticFeedback(40)
        setLastTap(0)
      } else {
        // Single tap (with delay to check for double tap)
        setLastTap(now)
        doubleTapTimer.current = setTimeout(() => {
          onTap?.(e)
          hapticFeedback(20)
        }, doubleTapDelay)
      }
      return
    }

    // Handle swipe gestures
    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    const deltaTime = touchEnd.time - touchStart.time
    
    // Calculate velocity
    const velocityX = Math.abs(deltaX) / deltaTime
    const velocityY = Math.abs(deltaY) / deltaTime

    const isLeftSwipe = deltaX > threshold
    const isRightSwipe = deltaX < -threshold
    const isUpSwipe = deltaY > threshold
    const isDownSwipe = deltaY < -threshold

    // Prioritize the dominant direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (isLeftSwipe) {
        onSwipeLeft?.(e, { velocity: velocityX, distance: Math.abs(deltaX) })
        hapticFeedback(30)
      } else if (isRightSwipe) {
        onSwipeRight?.(e, { velocity: velocityX, distance: Math.abs(deltaX) })
        hapticFeedback(30)
      }
    } else {
      // Vertical swipe
      if (isUpSwipe) {
        onSwipeUp?.(e, { velocity: velocityY, distance: Math.abs(deltaY) })
        hapticFeedback(30)
      } else if (isDownSwipe) {
        onSwipeDown?.(e, { velocity: velocityY, distance: Math.abs(deltaY) })
        hapticFeedback(30)
      }
    }

    // Reset state
    setTouchStart(null)
    setTouchEnd(null)
  }, [touchStart, touchEnd, lastTap, doubleTapDelay, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, hapticFeedback])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current)
      }
    }
  }, [])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isPressed,
    hapticFeedback
  }
}

// Hook for swipe navigation between items
export const useSwipeNavigation = (items, currentIndex, onChange) => {
  const handleSwipeLeft = useCallback(() => {
    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    onChange(nextIndex)
  }, [currentIndex, items.length, onChange])

  const handleSwipeRight = useCallback(() => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    onChange(prevIndex)
  }, [currentIndex, items.length, onChange])

  return useGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight
  })
}

// Hook for pull-to-refresh gesture
export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)

  const handleTouchStart = useCallback((e) => {
    // Only allow pull-to-refresh at the top of the page
    if (window.scrollY > 0) return
    
    const touch = e.touches[0]
    setPullDistance(0)
    setCanRefresh(false)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 0) return
    
    const touch = e.touches[0]
    const startY = e.touches[0].clientY
    
    // Calculate pull distance with resistance
    const distance = Math.max(0, (touch.clientY - startY) / 2.5)
    setPullDistance(distance)
    setCanRefresh(distance >= threshold)
    
    if (distance > 0) {
      e.preventDefault()
    }
  }, [threshold])

  const handleTouchEnd = useCallback(async () => {
    if (canRefresh && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        setCanRefresh(false)
      }
    } else {
      setPullDistance(0)
      setCanRefresh(false)
    }
  }, [canRefresh, isRefreshing, onRefresh])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    pullDistance,
    isRefreshing,
    canRefresh
  }
}

// Hook for drag and drop gestures
export const useDragGesture = (onDrag, onDragEnd) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const startPosition = useRef({ x: 0, y: 0 })

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    startPosition.current = { x: touch.clientX, y: touch.clientY }
    setIsDragging(true)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const offset = {
      x: touch.clientX - startPosition.current.x,
      y: touch.clientY - startPosition.current.y
    }
    
    setDragOffset(offset)
    onDrag?.(offset, e)
    
    e.preventDefault()
  }, [isDragging, onDrag])

  const handleTouchEnd = useCallback((e) => {
    if (isDragging) {
      setIsDragging(false)
      onDragEnd?.(dragOffset, e)
      setDragOffset({ x: 0, y: 0 })
    }
  }, [isDragging, dragOffset, onDragEnd])

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    isDragging,
    dragOffset
  }
}

export default useGestures