import React, { useState, useRef, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 80,
  resistance = 2.5,
  className,
  disabled = false
}) => {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)
  const [touchStart, setTouchStart] = useState(null)
  const containerRef = useRef(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return
    
    // Only allow pull-to-refresh when at the top of the page
    if (window.scrollY > 0) return
    
    startY.current = e.touches[0].clientY
    setTouchStart(startY.current)
  }

  const handleTouchMove = (e) => {
    if (disabled || isRefreshing || !touchStart) return
    
    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current

    // Only allow pulling down
    if (deltaY > 0 && window.scrollY === 0) {
      e.preventDefault()
      
      // Apply resistance to make pulling feel natural
      const distance = Math.min(deltaY / resistance, threshold * 1.5)
      setPullDistance(distance)
      setCanRefresh(distance >= threshold)
    }
  }

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || !touchStart) return
    
    setTouchStart(null)
    
    if (canRefresh && pullDistance >= threshold) {
      setIsRefreshing(true)
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      
      try {
        await onRefresh?.()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
        setCanRefresh(false)
      }
    } else {
      // Animate back to original position
      setPullDistance(0)
      setCanRefresh(false)
    }
  }

  // Reset state when refreshing completes
  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0)
      setCanRefresh(false)
    }
  }, [isRefreshing])

  const getRefreshIndicatorStyle = () => {
    const opacity = Math.min(pullDistance / threshold, 1)
    const scale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1)
    const rotation = isRefreshing ? 360 : (pullDistance / threshold) * 180
    
    return {
      opacity,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      transition: isRefreshing ? 'transform 1s linear' : 'none'
    }
  }

  const getContainerStyle = () => {
    return {
      transform: `translateY(${pullDistance}px)`,
      transition: touchStart ? 'none' : 'transform 0.3s ease-out'
    }
  }

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Refresh Indicator */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full flex items-center justify-center w-12 h-12 z-10"
        style={{ 
          transform: `translateX(-50%) translateY(${Math.max(-48 + pullDistance, -48)}px)` 
        }}
      >
        <div 
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full',
            'bg-primary-500 text-white shadow-lg',
            canRefresh && 'bg-green-500',
            isRefreshing && 'animate-spin'
          )}
          style={getRefreshIndicatorStyle()}
        >
          <RefreshCw 
            className={cn(
              'h-4 w-4 transition-colors',
              isRefreshing && 'animate-spin'
            )} 
          />
        </div>
      </div>

      {/* Pull instruction text */}
      {pullDistance > 10 && !isRefreshing && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 text-center z-10"
          style={{ 
            transform: `translateX(-50%) translateY(${Math.max(-20 + pullDistance, -20)}px)` 
          }}
        >
          <div className="text-xs text-gray-600 font-medium mt-14">
            {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}

      {/* Content Container */}
      <div style={getContainerStyle()}>
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh