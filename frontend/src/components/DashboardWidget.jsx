import { useState } from 'react'
import { MoreVertical, Maximize2, Minimize2, X, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const DashboardWidget = ({ 
  id,
  title,
  children,
  isExpanded = false,
  onExpand,
  onCollapse,
  onRemove,
  onSettings,
  isDragging = false,
  className = '',
  ...props 
}) => {
  const [showMenu, setShowMenu] = useState(false)

  const handleExpand = () => {
    if (onExpand) onExpand(id)
  }

  const handleCollapse = () => {
    if (onCollapse) onCollapse(id)
  }

  const handleRemove = () => {
    if (onRemove) onRemove(id)
    setShowMenu(false)
  }

  const handleSettings = () => {
    if (onSettings) onSettings(id)
    setShowMenu(false)
  }

  return (
    <Card 
      className={`
        transition-all duration-200 
        ${isDragging ? 'shadow-lg rotate-2 scale-105' : 'shadow-sm hover:shadow-md'}
        ${isExpanded ? 'col-span-2 row-span-2' : ''}
        ${className}
      `}
      {...props}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-gray-700 tracking-wide">
          {title}
        </h3>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
                {!isExpanded ? (
                  <button
                    onClick={handleExpand}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span>Expand</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCollapse}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Minimize2 className="h-3 w-3" />
                    <span>Collapse</span>
                  </button>
                )}
                
                {onSettings && (
                  <button
                    onClick={handleSettings}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-3 w-3" />
                    <span>Settings</span>
                  </button>
                )}
                
                {onRemove && (
                  <button
                    onClick={handleRemove}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={isExpanded ? 'h-96' : ''}>
        {children}
      </CardContent>
    </Card>
  )
}

export default DashboardWidget