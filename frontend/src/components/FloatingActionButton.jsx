import { useState, useEffect } from 'react'
import { Plus, Building2, Users, FileText, X, Home, Receipt } from 'lucide-react'
import { Button } from './ui/button'
import { useLocation, useNavigate } from 'react-router-dom'
import { useResponsive } from '../hooks/useResponsive'

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()

  // Hide/show FAB based on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide FAB
        setIsVisible(false)
        setIsOpen(false)
      } else {
        // Scrolling up - show FAB
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Define quick actions based on current page with enhanced mobile functionality
  const getQuickActions = () => {
    const path = location.pathname
    
    const allActions = {
      addProperty: {
        icon: Building2,
        label: 'Add Property',
        action: () => {
          // In a real app, this would open a modal or navigate to add property page
          console.log('Add Property')
          // Provide haptic feedback on mobile
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          setIsOpen(false)
        }
      },
      addTenant: {
        icon: Users,
        label: 'Add Tenant',
        action: () => {
          console.log('Add Tenant')
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          setIsOpen(false)
        }
      },
      createLease: {
        icon: FileText,
        label: 'Create Lease',
        action: () => {
          console.log('Create Lease')
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          setIsOpen(false)
        }
      },
      goHome: {
        icon: Home,
        label: 'Dashboard',
        action: () => {
          navigate('/')
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          setIsOpen(false)
        }
      },
      createInvoice: {
        icon: Receipt,
        label: 'Create Invoice',
        action: () => {
          console.log('Create Invoice')
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          setIsOpen(false)
        }
      }
    }

    // Customize actions based on current page
    switch (path) {
      case '/':
        return [allActions.addProperty, allActions.addTenant, allActions.createLease]
      case '/properties':
        return [allActions.addProperty, allActions.goHome]
      case '/tenants':
        return [allActions.addTenant, allActions.createLease, allActions.goHome]
      case '/leases':
        return [allActions.createLease, allActions.addTenant, allActions.goHome]
      case '/invoices':
        return [allActions.createInvoice, allActions.goHome]
      default:
        return [allActions.addProperty, allActions.addTenant, allActions.goHome]
    }
  }

  const quickActions = getQuickActions()

  // Don't show FAB on desktop or if no actions available
  if (!isMobile && !isTablet) return null
  if (quickActions.length === 0) return null

  return (
    <div 
      className={`fixed bottom-6 right-6 z-40 transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0'
      }`}
    >
      {/* Action buttons */}
      {isOpen && (
        <div className="mb-4 space-y-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <div
                key={index}
                className="flex items-center justify-end animate-in slide-in-from-bottom-2 duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="mr-3 bg-background border rounded-lg px-3 py-2 shadow-lg">
                  <span className="text-sm font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                </div>
                <Button
                  size="icon-lg"
                  className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 min-h-[44px] min-w-[44px]"
                  onClick={action.action}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Main FAB with enhanced touch feedback */}
      <Button
        size="icon-lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 min-h-[56px] min-w-[56px] active:scale-95 touch-manipulation"
        onClick={() => {
          setIsOpen(!isOpen)
          // Provide haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(30)
          }
        }}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-200 rotate-90" />
        ) : (
          <Plus className="h-6 w-6 transition-transform duration-200" />
        )}
      </Button>
    </div>
  )
}

export default FloatingActionButton