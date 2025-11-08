import React from 'react'
import { cn } from '@/lib/utils'
import { useResponsive } from '@/hooks/useResponsive'

const ResponsiveLayout = ({ 
  children, 
  className,
  mobileLayout = 'stack',
  tabletLayout = 'sidebar',
  desktopLayout = 'sidebar',
  ...props 
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive()

  const getLayoutClasses = () => {
    if (isMobile) {
      switch (mobileLayout) {
        case 'stack':
          return 'flex flex-col'
        case 'full':
          return 'w-full'
        case 'grid':
          return 'grid grid-cols-1 gap-4'
        default:
          return 'flex flex-col'
      }
    }
    
    if (isTablet) {
      switch (tabletLayout) {
        case 'sidebar':
          return 'flex flex-row'
        case 'grid':
          return 'grid grid-cols-2 gap-6'
        case 'stack':
          return 'flex flex-col'
        default:
          return 'flex flex-row'
      }
    }
    
    if (isDesktop) {
      switch (desktopLayout) {
        case 'sidebar':
          return 'flex flex-row'
        case 'grid':
          return 'grid grid-cols-3 gap-8'
        case 'wide-grid':
          return 'grid grid-cols-4 gap-8'
        default:
          return 'flex flex-row'
      }
    }
    
    return 'flex flex-col'
  }

  return (
    <div 
      className={cn(getLayoutClasses(), className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Responsive Grid Component
const ResponsiveGrid = ({ 
  children, 
  className,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = 'gap-4',
  ...props 
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive()

  const getGridClasses = () => {
    let classes = 'grid '
    
    if (isMobile) {
      classes += `grid-cols-${mobileColumns} `
    } else if (isTablet) {
      classes += `grid-cols-${tabletColumns} `
    } else if (isDesktop) {
      classes += `grid-cols-${desktopColumns} `
    }
    
    classes += gap
    return classes
  }

  return (
    <div 
      className={cn(getGridClasses(), className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Responsive Container Component
const ResponsiveContainer = ({ 
  children, 
  className,
  maxWidth = 'max-w-7xl',
  padding = true,
  ...props 
}) => {
  const { isMobile, isTablet } = useResponsive()

  const getPaddingClasses = () => {
    if (!padding) return ''
    
    if (isMobile) {
      return 'px-4 py-4'
    } else if (isTablet) {
      return 'px-6 py-6'
    } else {
      return 'px-8 py-8'
    }
  }

  return (
    <div 
      className={cn(
        'mx-auto w-full',
        maxWidth,
        getPaddingClasses(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Responsive Sidebar Layout
const ResponsiveSidebarLayout = ({ 
  sidebar, 
  children, 
  className,
  sidebarWidth = 'w-64',
  collapsible = true,
  ...props 
}) => {
  const { isMobile, isTablet } = useResponsive()

  if (isMobile) {
    // On mobile, sidebar becomes a drawer or bottom sheet
    return (
      <div className={cn('flex flex-col min-h-screen', className)} {...props}>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        {/* Sidebar content can be rendered in a drawer component */}
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-screen', className)} {...props}>
      {/* Sidebar */}
      <aside className={cn(
        'flex-shrink-0 bg-white border-r border-gray-200',
        isTablet && collapsible ? 'w-16 hover:w-64 transition-all duration-300' : sidebarWidth
      )}>
        {sidebar}
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

// Responsive Card Layout
const ResponsiveCardLayout = ({ 
  children, 
  className,
  cardMinWidth = '280px',
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'grid gap-4',
        'grid-cols-1',
        'sm:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}, 1fr))`
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// Responsive Stack Component
const ResponsiveStack = ({ 
  children, 
  className,
  spacing = 'space-y-4',
  direction = 'vertical',
  breakpoint = 'md',
  ...props 
}) => {
  const getStackClasses = () => {
    if (direction === 'horizontal') {
      return `flex flex-col ${breakpoint}:flex-row ${breakpoint}:space-x-4 ${breakpoint}:space-y-0 ${spacing}`
    }
    return `flex flex-col ${spacing}`
  }

  return (
    <div 
      className={cn(getStackClasses(), className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Collapsible Section for Mobile
const CollapsibleSection = ({ 
  title, 
  children, 
  defaultOpen = false,
  className,
  ...props 
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const { isMobile } = useResponsive()

  // On desktop, always show content
  if (!isMobile) {
    return (
      <div className={cn('space-y-4', className)} {...props}>
        <h3 className="text-lg font-semibold">{title}</h3>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('border border-gray-200 rounded-lg', className)} {...props}>
      <button
        className="w-full px-4 py-3 text-left font-medium flex items-center justify-between bg-gray-50 rounded-t-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <svg
          className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}

// Responsive Text Component
const ResponsiveText = ({ 
  children, 
  className,
  mobileSize = 'text-sm',
  tabletSize = 'text-base',
  desktopSize = 'text-lg',
  ...props 
}) => {
  return (
    <div 
      className={cn(
        mobileSize,
        `md:${tabletSize}`,
        `lg:${desktopSize}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  ResponsiveLayout,
  ResponsiveGrid,
  ResponsiveContainer,
  ResponsiveSidebarLayout,
  ResponsiveCardLayout,
  ResponsiveStack,
  CollapsibleSection,
  ResponsiveText
}

export default ResponsiveLayout