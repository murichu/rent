import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGestures } from '@/hooks/useGestures'
import { cn } from '@/lib/utils'
import { 
  Home, 
  Search, 
  Plus, 
  Settings, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown,
  Zap
} from 'lucide-react'

const GestureShortcuts = ({ children, className, ...props }) => {
  const [showGestureHint, setShowGestureHint] = useState(false)
  const [gestureAction, setGestureAction] = useState(null)
  const [isEnabled, setIsEnabled] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Gesture actions mapping
  const gestureActions = {
    swipeLeft: {
      icon: ArrowLeft,
      label: 'Go Back',
      action: () => {
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate('/')
        }
      }
    },
    swipeRight: {
      icon: ArrowRight,
      label: 'Go Forward',
      action: () => {
        // Navigate to next logical page based on current location
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
            window.history.forward()
        }
      }
    },
    swipeUp: {
      icon: ArrowUp,
      label: 'Scroll to Top',
      action: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    swipeDown: {
      icon: ArrowDown,
      label: 'Refresh',
      action: () => {
        window.location.reload()
      }
    },
    doubleTap: {
      icon: Zap,
      label: 'Quick Action',
      action: () => {
        // Context-sensitive quick action
        switch (location.pathname) {
          case '/':
            navigate('/properties')
            break
          case '/properties':
            // Trigger add property modal
            document.dispatchEvent(new CustomEvent('openAddPropertyModal'))
            break
          case '/tenants':
            // Trigger add tenant modal
            document.dispatchEvent(new CustomEvent('openAddTenantModal'))
            break
          default:
            navigate('/')
        }
      }
    },
    longPress: {
      icon: Settings,
      label: 'Quick Settings',
      action: () => {
        // Show quick settings or context menu
        document.dispatchEvent(new CustomEvent('showQuickSettings'))
      }
    }
  }

  const showGesturePreview = (actionKey) => {
    setGestureAction(gestureActions[actionKey])
    setShowGestureHint(true)
    
    setTimeout(() => {
      setShowGestureHint(false)
      setGestureAction(null)
    }, 1500)
  }

  const { onTouchStart, onTouchMove, onTouchEnd } = useGestures({
    onSwipeLeft: (e, data) => {
      if (!isEnabled) return
      showGesturePreview('swipeLeft')
      setTimeout(() => gestureActions.swipeLeft.action(), 300)
    },
    onSwipeRight: (e, data) => {
      if (!isEnabled) return
      showGesturePreview('swipeRight')
      setTimeout(() => gestureActions.swipeRight.action(), 300)
    },
    onSwipeUp: (e, data) => {
      if (!isEnabled) return
      showGesturePreview('swipeUp')
      setTimeout(() => gestureActions.swipeUp.action(), 300)
    },
    onSwipeDown: (e, data) => {
      if (!isEnabled) return
      showGesturePreview('swipeDown')
      setTimeout(() => gestureActions.swipeDown.action(), 300)
    },
    onDoubleTap: (e) => {
      if (!isEnabled) return
      showGesturePreview('doubleTap')
      setTimeout(() => gestureActions.doubleTap.action(), 300)
    },
    onLongPress: (e) => {
      if (!isEnabled) return
      showGesturePreview('longPress')
      setTimeout(() => gestureActions.longPress.action(), 300)
    },
    threshold: 60,
    longPressDelay: 800,
    doubleTapDelay: 300
  })

  // Listen for gesture enable/disable events
  useEffect(() => {
    const handleToggleGestures = (e) => {
      setIsEnabled(e.detail?.enabled ?? !isEnabled)
    }

    document.addEventListener('toggleGestures', handleToggleGestures)
    return () => document.removeEventListener('toggleGestures', handleToggleGestures)
  }, [isEnabled])

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      {children}
      
      {/* Gesture Hint Overlay */}
      {showGestureHint && gestureAction && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-black/80 text-white px-6 py-4 rounded-2xl flex items-center space-x-3 animate-in zoom-in duration-200">
            <gestureAction.icon className="h-6 w-6" />
            <span className="font-medium">{gestureAction.label}</span>
          </div>
        </div>
      )}
      
      {/* Gesture Status Indicator */}
      {isEnabled && (
        <div className="fixed bottom-4 left-4 z-40 opacity-30 hover:opacity-100 transition-opacity">
          <div className="bg-black/50 text-white p-2 rounded-full">
            <Zap className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  )
}

// Gesture Tutorial Component
const GestureTutorial = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const tutorialSteps = [
    {
      gesture: 'Swipe Left',
      icon: ArrowLeft,
      description: 'Swipe left to go back to the previous page',
      demo: 'Try swiping left on this card'
    },
    {
      gesture: 'Swipe Right',
      icon: ArrowRight,
      description: 'Swipe right to navigate forward or to the next section',
      demo: 'Swipe right to continue'
    },
    {
      gesture: 'Swipe Up',
      icon: ArrowUp,
      description: 'Swipe up to scroll to the top of the page',
      demo: 'Swipe up to go to top'
    },
    {
      gesture: 'Double Tap',
      icon: Zap,
      description: 'Double tap for quick actions like adding new items',
      demo: 'Double tap this card'
    },
    {
      gesture: 'Long Press',
      icon: Settings,
      description: 'Long press to access context menus and settings',
      demo: 'Press and hold for 1 second'
    }
  ]

  const currentTutorial = tutorialSteps[currentStep]

  const { onTouchStart, onTouchMove, onTouchEnd } = useGestures({
    onSwipeLeft: () => {
      if (currentStep === 0) nextStep()
    },
    onSwipeRight: () => {
      if (currentStep === 1) nextStep()
    },
    onSwipeUp: () => {
      if (currentStep === 2) nextStep()
    },
    onDoubleTap: () => {
      if (currentStep === 3) nextStep()
    },
    onLongPress: () => {
      if (currentStep === 4) nextStep()
    }
  })

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTutorial()
    }
  }

  const completeTutorial = () => {
    setIsVisible(false)
    onComplete?.()
  }

  const skipTutorial = () => {
    setIsVisible(false)
    onSkip?.()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl p-6 max-w-sm w-full animate-in zoom-in duration-300"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Gesture Tutorial
          </h2>
          <p className="text-sm text-gray-600">
            Step {currentStep + 1} of {tutorialSteps.length}
          </p>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <currentTutorial.icon className="h-8 w-8 text-primary-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentTutorial.gesture}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {currentTutorial.description}
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">
              {currentTutorial.demo}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={skipTutorial}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={nextStep}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex space-x-2 mt-4 justify-center">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                index <= currentStep ? 'bg-primary-600' : 'bg-gray-300'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Hook to manage gesture shortcuts
export const useGestureShortcuts = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem('gestureShortcutsEnabled')
    return saved !== null ? JSON.parse(saved) : true
  })

  const toggleGestures = (enabled) => {
    const newState = enabled !== undefined ? enabled : !isEnabled
    setIsEnabled(newState)
    localStorage.setItem('gestureShortcutsEnabled', JSON.stringify(newState))
    
    // Dispatch event to notify components
    document.dispatchEvent(new CustomEvent('toggleGestures', {
      detail: { enabled: newState }
    }))
  }

  const showTutorial = () => {
    document.dispatchEvent(new CustomEvent('showGestureTutorial'))
  }

  return {
    isEnabled,
    toggleGestures,
    showTutorial
  }
}

export { GestureTutorial }
export default GestureShortcuts