import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
  Home, 
  Building2, 
  Users, 
  CreditCard, 
  FileText, 
  Receipt, 
  BarChart3, 
  Settings as SettingsIcon, 
  Smartphone, 
  UserCog, 
  Shield, 
  MessageCircle, 
  DoorOpen, 
  Bell, 
  AlertTriangle, 
  Building, 
  Landmark,
  X,
  ChevronRight,
  User,
  LogOut
} from 'lucide-react'
import { Button } from './ui/button'

const MobileSidebar = ({ isOpen, onClose }) => {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/properties', label: 'Properties', icon: Building2 },
    { path: '/units', label: 'Units', icon: DoorOpen },
    { path: '/tenants', label: 'Tenants', icon: Users },
    { path: '/leases', label: 'Leases', icon: FileText },
    { path: '/invoices', label: 'Invoices', icon: Receipt },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/mpesa', label: 'M-Pesa', icon: Smartphone },
    { path: '/pesapal', label: 'PesaPal', icon: CreditCard },
    { path: '/kcb', label: 'KCB Buni', icon: Landmark },
    { path: '/agents', label: 'Agents', icon: UserCog },
    { path: '/caretakers', label: 'Caretakers', icon: Shield },
    { path: '/notices', label: 'Notices', icon: Bell },
    { path: '/penalties', label: 'Penalties', icon: AlertTriangle },
    { path: '/users', label: 'Users', icon: Users },
    { path: '/agencies', label: 'Agencies', icon: Building },
    { path: '/messages', label: 'Messages', icon: MessageCircle },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ]

  // Enhanced touch events for swipe gestures with improved feedback
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setTouchStart(touch.clientX)
    setTouchEnd(null)
    setIsDragging(false)
    setDragOffset(0)
  }

  const handleTouchMove = (e) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    const currentX = touch.clientX
    const diffX = touchStart - currentX
    
    setTouchEnd(currentX)
    
    // Start dragging if moved more than 10px
    if (Math.abs(diffX) > 10) {
      setIsDragging(true)
    }
    
    // Provide visual feedback during swipe (only for left swipe to close)
    if (diffX > 0 && diffX < 200) {
      setDragOffset(Math.min(diffX, 100))
    } else if (diffX <= 0) {
      setDragOffset(0)
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50 // Minimum swipe distance
    const isRightSwipe = distance < -50
    
    // Close sidebar on left swipe
    if (isLeftSwipe) {
      onClose()
    }
    
    // Reset touch state
    setTouchStart(null)
    setTouchEnd(null)
    setIsDragging(false)
    setDragOffset(0)
  }

  // Reset drag offset when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0)
      setIsDragging(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <div 
        className="fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-background border-r shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden"
        style={{
          transform: `translateX(-${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 300ms ease-in-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mobile-sidebar"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="ml-2 text-xl font-bold">Haven</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="text-xs text-muted-foreground text-center">
              Haven Property Management
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default MobileSidebar