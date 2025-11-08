import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Menu, 
  X, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Search,
  ChevronDown,
  Home,
  MessageCircle,
  HelpCircle,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'
import { Button } from './ui/button'
import { useClickOutside } from '../hooks/useClickOutside'

const NavigationHeader = ({ setIsAuthenticated, onMobileMenuToggle, isMobileMenuOpen, onSidebarToggle, sidebarCollapsed }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Click outside handlers
  const profileDropdownRef = useClickOutside(() => setIsProfileDropdownOpen(false))
  const notificationRef = useClickOutside(() => setIsNotificationOpen(false))
  const searchRef = useClickOutside(() => setIsSearchFocused(false))

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    navigate('/login')
  }

  // Handle search functionality
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Mock search suggestions - in real app, this would be an API call
    if (value.length > 0) {
      const mockSuggestions = [
        'Sunset Apartments',
        'Ocean View Properties',
        'Downtown Lofts',
        'John Doe (Tenant)',
        'Jane Smith (Agent)',
        'Property Management Settings'
      ].filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5)
      
      setSearchSuggestions(mockSuggestions)
    } else {
      setSearchSuggestions([])
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search results or perform search
      console.log('Searching for:', searchQuery)
      setIsSearchFocused(false)
    }
  }

  // Keyboard navigation for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSearchFocused) {
        setIsSearchFocused(false)
        setSearchQuery('')
      }
      // Global search shortcut (Ctrl/Cmd + K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector('#global-search')?.focus()
        setIsSearchFocused(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchFocused])

  // Generate breadcrumb from current path with better labels
  const generateBreadcrumb = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Dashboard', path: '/', icon: Home }]
    
    // Page label mapping for better UX
    const pageLabels = {
      'properties': 'Properties',
      'units': 'Units',
      'tenants': 'Tenants',
      'leases': 'Leases',
      'invoices': 'Invoices',
      'payments': 'Payments',
      'mpesa': 'M-Pesa',
      'pesapal': 'PesaPal',
      'kcb': 'KCB Buni',
      'agents': 'Agents',
      'caretakers': 'Caretakers',
      'notices': 'Notices',
      'penalties': 'Penalties',
      'users': 'Users',
      'agencies': 'Agencies',
      'messages': 'Messages',
      'reports': 'Reports',
      'settings': 'Settings'
    }
    
    if (pathSegments.length > 0) {
      pathSegments.forEach((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/')
        const label = pageLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        breadcrumbs.push({ label, path })
      })
    }
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumb()

  // Mock notifications - in real app, this would come from API
  const notifications = [
    { 
      id: 1, 
      title: 'New tenant application', 
      description: 'John Doe applied for Unit 2A',
      time: '5 min ago', 
      unread: true,
      type: 'application',
      priority: 'high'
    },
    { 
      id: 2, 
      title: 'Payment received', 
      description: '$1,200 rent payment from Jane Smith',
      time: '1 hour ago', 
      unread: true,
      type: 'payment',
      priority: 'medium'
    },
    { 
      id: 3, 
      title: 'Maintenance request', 
      description: 'Leaky faucet in Unit 3B',
      time: '2 hours ago', 
      unread: false,
      type: 'maintenance',
      priority: 'low'
    },
    { 
      id: 4, 
      title: 'Lease expiring soon', 
      description: 'Unit 1C lease expires in 30 days',
      time: '1 day ago', 
      unread: false,
      type: 'reminder',
      priority: 'medium'
    },
  ]

  const unreadCount = notifications.filter(n => n.unread).length

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 lg:hidden hover:bg-accent transition-colors min-h-[44px] min-w-[44px]"
          onClick={onMobileMenuToggle}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        {/* Desktop sidebar toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 hidden lg:flex hover:bg-accent transition-colors min-h-[44px] min-w-[44px]"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
          aria-expanded={!sidebarCollapsed}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo - visible on mobile */}
        <div className="flex items-center lg:hidden">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="ml-2 text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Haven
          </span>
        </div>

        {/* Breadcrumb navigation - hidden on mobile */}
        <nav 
          className="hidden lg:flex items-center space-x-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb navigation"
        >
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-muted-foreground/50" aria-hidden="true">
                  /
                </span>
              )}
              {index === 0 && crumb.icon && (
                <crumb.icon className="h-4 w-4 mr-1" aria-hidden="true" />
              )}
              <Link
                to={crumb.path}
                className={`hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-1 py-0.5 ${
                  index === breadcrumbs.length - 1 
                    ? 'text-foreground font-medium' 
                    : 'hover:underline'
                }`}
                aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Enhanced search bar - hidden on mobile, shown on larger screens */}
        <div className="hidden md:flex items-center mr-4" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id="global-search"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search properties, tenants... (⌘K)"
              className="pl-10 pr-4 py-3 w-64 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 focus:w-80 min-h-[44px]"
              autoComplete="off"
            />
            
            {/* Search suggestions dropdown */}
            {isSearchFocused && (searchSuggestions.length > 0 || searchQuery.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                {searchSuggestions.length > 0 ? (
                  <>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-left px-3 py-3 text-sm hover:bg-accent transition-colors focus:outline-none focus:bg-accent min-h-[44px] flex items-center"
                        onClick={() => {
                          setSearchQuery(suggestion)
                          setIsSearchFocused(false)
                        }}
                      >
                        <Search className="h-3 w-3 inline mr-2 text-muted-foreground" />
                        {suggestion}
                      </button>
                    ))}
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                      Press Enter to search for "{searchQuery}"
                    </div>
                  </>
                ) : searchQuery.length > 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Press Enter to search for "{searchQuery}"
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Start typing to search...
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Enhanced notification center */}
        <div className="relative mr-2" ref={notificationRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-accent transition-colors min-h-[44px] min-w-[44px]"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            aria-expanded={isNotificationOpen}
          >
            <Bell className={`h-5 w-5 transition-transform ${isNotificationOpen ? 'scale-110' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          {/* Enhanced notification dropdown */}
          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-popover border rounded-md shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      // Mark all as read functionality
                      console.log('Mark all as read')
                    }}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-accent cursor-pointer transition-colors ${
                        notification.unread ? 'bg-accent/30' : ''
                      }`}
                      onClick={() => {
                        // Handle notification click
                        console.log('Notification clicked:', notification.id)
                        setIsNotificationOpen(false)
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.priority === 'high' ? 'bg-destructive' :
                          notification.priority === 'medium' ? 'bg-warning' :
                          'bg-muted-foreground'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium leading-tight">
                                {notification.title}
                              </p>
                              {notification.description && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {notification.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {notification.time}
                              </p>
                            </div>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-center"
                  onClick={() => {
                    navigate('/notifications')
                    setIsNotificationOpen(false)
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced user profile dropdown */}
        <div className="relative" ref={profileDropdownRef}>
          <Button
            variant="ghost"
            className="flex items-center space-x-2 hover:bg-accent transition-colors min-h-[44px] px-3"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            aria-label="User menu"
            aria-expanded={isProfileDropdownOpen}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center ring-2 ring-background shadow-sm">
              <User className="h-4 w-4" />
            </div>
            <span className="hidden md:inline text-sm font-medium">Admin User</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {/* Enhanced profile dropdown */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-popover border rounded-md shadow-lg z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Admin User</p>
                    <p className="text-sm text-muted-foreground truncate">admin@haven.com</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <Link
                  to="/settings"
                  className="flex items-center px-3 py-3 text-sm hover:bg-accent transition-colors focus:outline-none focus:bg-accent min-h-[44px]"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-3 text-muted-foreground" />
                  Account Settings
                </Link>
                <Link
                  to="/messages"
                  className="flex items-center px-3 py-3 text-sm hover:bg-accent transition-colors focus:outline-none focus:bg-accent min-h-[44px]"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <MessageCircle className="h-4 w-4 mr-3 text-muted-foreground" />
                  Messages
                </Link>
                <Link
                  to="/help"
                  className="flex items-center px-3 py-3 text-sm hover:bg-accent transition-colors focus:outline-none focus:bg-accent min-h-[44px]"
                  onClick={() => setIsProfileDropdownOpen(false)}
                >
                  <HelpCircle className="h-4 w-4 mr-3 text-muted-foreground" />
                  Help & Support
                </Link>
                <div className="border-t my-2" />
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-3 text-sm hover:bg-accent transition-colors text-left focus:outline-none focus:bg-accent text-destructive min-h-[44px]"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced mobile search bar - shown when menu is open */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t p-4 bg-accent/20">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search properties, tenants..."
              className="pl-10 pr-4 py-3 w-full text-sm border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 min-h-[44px]"
              autoComplete="off"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </form>
          
          {/* Mobile search suggestions */}
          {searchSuggestions.length > 0 && (
            <div className="mt-2 bg-background border rounded-lg shadow-sm">
              {searchSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-3 py-3 text-sm hover:bg-accent transition-colors focus:outline-none focus:bg-accent first:rounded-t-lg last:rounded-b-lg min-h-[44px] flex items-center"
                  onClick={() => {
                    setSearchQuery(suggestion)
                    // Perform search or navigation
                    console.log('Mobile search:', suggestion)
                  }}
                >
                  <Search className="h-3 w-3 inline mr-2 text-muted-foreground" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default NavigationHeader