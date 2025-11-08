import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Home, Search, User, Menu } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'

const MobileGestureNavigation = ({ 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  children,
  className 
}) => {
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isGesturing, setIsGesturing] = useState(false)
  const [gestureDirection, setGestureDirection] = useState(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Minimum swipe distance
  const minSwipeDistance = 50

  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchMove = (e) => {
    if (!touchStart) return
    
    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }
    
    setTouchEnd(currentTouch)
    
    // Calculate gesture direction for visual feedback
    const deltaX = touchStart.x - currentTouch.x
    const deltaY = touchStart.y - currentTouch.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal gesture
      if (Math.abs(deltaX) > 20) {
        setIsGesturing(true)
        setGestureDirection(deltaX > 0 ? 'left' : 'right')
      }
    } else {
      // Vertical gesture
      if (Math.abs(deltaY) > 20) {
        setIsGesturing(true)
        setGestureDirection(deltaY > 0 ? 'up' : 'down')
      }
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsGesturing(false)
      setGestureDirection(null)
      return
    }

    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y

    const isLeftSwipe = deltaX > minSwipeDistance
    const isRightSwipe = deltaX < -minSwipeDistance
    const isUpSwipe = deltaY > minSwipeDistance
    const isDownSwipe = deltaY < -minSwipeDistance

    // Haptic feedback for successful gestures
    if (isLeftSwipe || isRightSwipe || isUpSwipe || isDownSwipe) {
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
    }

    // Execute gesture callbacks
    if (isLeftSwipe) {
      onSwipeLeft?.()
    } else if (isRightSwipe) {
      onSwipeRight?.()
    } else if (isUpSwipe) {
      onSwipeUp?.()
    } else if (isDownSwipe) {
      onSwipeDown?.()
    }

    setIsGesturing(false)
    setGestureDirection(null)
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gesture Visual Feedback */}
      {isGesturing && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-black/50 text-white p-4 rounded-full animate-in zoom-in duration-200">
            {gestureDirection === 'left' && <ChevronLeft className="h-8 w-8" />}
            {gestureDirection === 'right' && <ChevronRight className="h-8 w-8" />}
            {gestureDirection === 'up' && <div className="h-8 w-8 flex items-center justify-center">↑</div>}
            {gestureDirection === 'down' && <div className="h-8 w-8 flex items-center justify-center">↓</div>}
          </div>
        </div>
      )}

      {children}
    </div>
  )
}

// Bottom Navigation Bar with Gesture Support
const MobileBottomNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.pathname)

  const navigationItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/properties', icon: Search, label: 'Properties' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/menu', icon: Menu, label: 'Menu' }
  ]

  const handleTabPress = (path) => {
    setActiveTab(path)
    navigate(path)
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  useEffect(() => {
    setActiveTab(location.pathname)
  }, [location.pathname])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.path
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={cn(
                'flex flex-col items-center gap-1 p-2 min-h-[60px] min-w-[60px]',
                'active:scale-95 transition-all duration-150',
                isActive && 'text-primary-600'
              )}
              onClick={() => handleTabPress(item.path)}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary-600')} />
              <span className={cn('text-xs', isActive && 'text-primary-600 font-medium')}>
                {item.label}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// Swipe Navigation Hook
export const useSwipeNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSwipeLeft = () => {
    // Navigate forward in history or to next logical page
    switch (location.pathname) {
      case '/':
        navigate('/properties')
        break
      case '/properties':
        navigate('/tenants')
        break
      case '/tenants':
        navigate('/leases')
        break
      default:
        // Try to go forward in browser history
        window.history.forward()
    }
  }

  const handleSwipeRight = () => {
    // Navigate back in history or to previous logical page
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      // Fallback navigation
      switch (location.pathname) {
        case '/properties':
          navigate('/')
          break
        case '/tenants':
          navigate('/properties')
          break
        case '/leases':
          navigate('/tenants')
          break
        default:
          navigate('/')
      }
    }
  }

  const handleSwipeUp = () => {
    // Scroll to top or show quick actions
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSwipeDown = () => {
    // Refresh page or show notifications
    window.location.reload()
  }

  return {
    handleSwipeLeft,
    handleSwipeRight,
    handleSwipeUp,
    handleSwipeDown
  }
}

export { MobileBottomNavigation }
export default MobileGestureNavigation