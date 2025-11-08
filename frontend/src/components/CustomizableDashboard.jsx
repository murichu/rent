import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Plus, Layout, Save } from 'lucide-react'
import DashboardWidget from './DashboardWidget'
import { Card, CardContent } from '@/components/ui/card'

const CustomizableDashboard = ({ 
  widgets = [], 
  onLayoutChange, 
  onWidgetAdd, 
  onWidgetRemove,
  onWidgetSettings,
  className = '' 
}) => {
  const [dashboardWidgets, setDashboardWidgets] = useState(widgets)
  const [expandedWidget, setExpandedWidget] = useState(null)
  const [showAddWidget, setShowAddWidget] = useState(false)

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout')
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout)
        setDashboardWidgets(parsedLayout)
      } catch (error) {
        console.error('Failed to load saved dashboard layout:', error)
      }
    }
  }, [])

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    if (dashboardWidgets.length > 0) {
      localStorage.setItem('dashboard-layout', JSON.stringify(dashboardWidgets))
      if (onLayoutChange) {
        onLayoutChange(dashboardWidgets)
      }
    }
  }, [dashboardWidgets, onLayoutChange])

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(dashboardWidgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setDashboardWidgets(items)
  }

  const handleWidgetExpand = (widgetId) => {
    setExpandedWidget(widgetId)
  }

  const handleWidgetCollapse = () => {
    setExpandedWidget(null)
  }

  const handleWidgetRemove = (widgetId) => {
    setDashboardWidgets(prev => prev.filter(widget => widget.id !== widgetId))
    if (onWidgetRemove) {
      onWidgetRemove(widgetId)
    }
  }

  const handleWidgetSettings = (widgetId) => {
    if (onWidgetSettings) {
      onWidgetSettings(widgetId)
    }
  }

  const availableWidgets = [
    { id: 'metrics', name: 'Metric Cards', description: 'Key performance indicators' },
    { id: 'revenue-chart', name: 'Revenue Chart', description: 'Monthly revenue trends' },
    { id: 'occupancy-chart', name: 'Occupancy Chart', description: 'Property occupancy rates' },
    { id: 'property-status', name: 'Property Status', description: 'Property distribution' },
    { id: 'recent-activity', name: 'Recent Activity', description: 'Latest updates' },
    { id: 'quick-actions', name: 'Quick Actions', description: 'Common tasks' },
  ]

  const handleAddWidget = (widgetType) => {
    const newWidget = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      title: availableWidgets.find(w => w.id === widgetType)?.name || 'New Widget',
      order: dashboardWidgets.length
    }
    
    setDashboardWidgets(prev => [...prev, newWidget])
    setShowAddWidget(false)
    
    if (onWidgetAdd) {
      onWidgetAdd(newWidget)
    }
  }

  const resetLayout = () => {
    localStorage.removeItem('dashboard-layout')
    setDashboardWidgets(widgets)
    setExpandedWidget(null)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layout className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Dashboard Layout</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddWidget(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Widget</span>
          </button>
          
          <button
            onClick={resetLayout}
            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Layout className="h-4 w-4" />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Widget</h3>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableWidgets.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => handleAddWidget(widget.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{widget.name}</div>
                  <div className="text-sm text-gray-500">{widget.description}</div>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowAddWidget(false)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draggable Dashboard Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`
                grid gap-4 transition-all duration-200
                ${expandedWidget ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}
                ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''}
              `}
            >
              {dashboardWidgets.map((widget, index) => (
                <Draggable key={widget.id} draggableId={widget.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? 'z-50' : ''}
                    >
                      <DashboardWidget
                        id={widget.id}
                        title={widget.title}
                        isExpanded={expandedWidget === widget.id}
                        onExpand={handleWidgetExpand}
                        onCollapse={handleWidgetCollapse}
                        onRemove={handleWidgetRemove}
                        onSettings={handleWidgetSettings}
                        isDragging={snapshot.isDragging}
                      >
                        {/* Widget content would be rendered here based on widget.type */}
                        <div className="h-32 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded">
                          {widget.type} content
                        </div>
                      </DashboardWidget>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {/* Empty state */}
              {dashboardWidgets.length === 0 && (
                <div className="col-span-full">
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Layout className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No widgets added yet
                      </h3>
                      <p className="text-gray-500 text-center mb-4">
                        Add widgets to customize your dashboard layout
                      </p>
                      <button
                        onClick={() => setShowAddWidget(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Your First Widget</span>
                      </button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {/* Layout persistence indicator */}
      <div className="flex items-center justify-center text-xs text-gray-500">
        <Save className="h-3 w-3 mr-1" />
        Layout automatically saved
      </div>
    </div>
  )
}

export default CustomizableDashboard