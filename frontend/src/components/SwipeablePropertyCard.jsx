import React, { useState, useRef } from 'react'
import { Heart, Share2, Phone, Eye, Trash2, Edit } from 'lucide-react'
import { Card, CardContent, CardMedia } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDragGesture } from '@/hooks/useGestures'

const SwipeablePropertyCard = ({
  property,
  onFavorite,
  onShare,
  onCall,
  onView,
  onEdit,
  onDelete,
  className,
  ...props
}) => {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [activeAction, setActiveAction] = useState(null)
  const cardRef = useRef(null)

  // Swipe thresholds
  const REVEAL_THRESHOLD = 80
  const ACTION_THRESHOLD = 120
  const MAX_SWIPE = 200

  // Action configurations
  const leftActions = [
    {
      id: 'favorite',
      icon: Heart,
      label: 'Favorite',
      color: 'bg-red-500',
      action: () => onFavorite?.(property.id, !property.isFavorited)
    },
    {
      id: 'share',
      icon: Share2,
      label: 'Share',
      color: 'bg-blue-500',
      action: () => onShare?.(property)
    }
  ]

  const rightActions = [
    {
      id: 'call',
      icon: Phone,
      label: 'Call',
      color: 'bg-green-500',
      action: () => onCall?.(property)
    },
    {
      id: 'edit',
      icon: Edit,
      label: 'Edit',
      color: 'bg-yellow-500',
      action: () => onEdit?.(property)
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      color: 'bg-red-600',
      action: () => onDelete?.(property)
    }
  ]

  const handleDrag = (offset) => {
    const clampedOffset = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, offset.x))
    setSwipeOffset(clampedOffset)

    // Determine active action based on swipe distance
    if (Math.abs(clampedOffset) > ACTION_THRESHOLD) {
      if (clampedOffset > 0) {
        // Swiping right - left actions
        const actionIndex = Math.min(
          Math.floor((clampedOffset - ACTION_THRESHOLD) / 40),
          leftActions.length - 1
        )
        setActiveAction(leftActions[actionIndex])
      } else {
        // Swiping left - right actions
        const actionIndex = Math.min(
          Math.floor((Math.abs(clampedOffset) - ACTION_THRESHOLD) / 40),
          rightActions.length - 1
        )
        setActiveAction(rightActions[actionIndex])
      }
    } else {
      setActiveAction(null)
    }

    setIsRevealed(Math.abs(clampedOffset) > REVEAL_THRESHOLD)
  }

  const handleDragEnd = (offset) => {
    const finalOffset = offset.x

    if (Math.abs(finalOffset) > ACTION_THRESHOLD && activeAction) {
      // Execute the active action
      activeAction.action()
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }

    // Reset position
    setSwipeOffset(0)
    setIsRevealed(false)
    setActiveAction(null)
  }

  const { onTouchStart, onTouchMove, onTouchEnd, isDragging } = useDragGesture(
    handleDrag,
    handleDragEnd
  )

  const handleCardClick = () => {
    if (!isDragging && Math.abs(swipeOffset) < 10) {
      onView?.(property.id)
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      {/* Left Actions (revealed when swiping right) */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center">
        {leftActions.map((action, index) => {
          const Icon = action.icon
          const isActive = activeAction?.id === action.id
          const opacity = Math.max(0, Math.min(1, (swipeOffset - REVEAL_THRESHOLD) / 40))
          
          return (
            <div
              key={action.id}
              className={cn(
                'h-full flex items-center justify-center w-16 transition-all duration-200',
                action.color,
                isActive && 'w-20 scale-110'
              )}
              style={{
                opacity,
                transform: `translateX(${Math.max(0, swipeOffset - REVEAL_THRESHOLD - (index * 64))}px)`
              }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
          )
        })}
      </div>

      {/* Right Actions (revealed when swiping left) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        {rightActions.map((action, index) => {
          const Icon = action.icon
          const isActive = activeAction?.id === action.id
          const opacity = Math.max(0, Math.min(1, (Math.abs(swipeOffset) - REVEAL_THRESHOLD) / 40))
          
          return (
            <div
              key={action.id}
              className={cn(
                'h-full flex items-center justify-center w-16 transition-all duration-200',
                action.color,
                isActive && 'w-20 scale-110'
              )}
              style={{
                opacity,
                transform: `translateX(${Math.min(0, swipeOffset + REVEAL_THRESHOLD + (index * 64))}px)`
              }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
          )
        })}
      </div>

      {/* Main Card */}
      <div
        ref={cardRef}
        className={cn(
          'relative z-10 transition-transform duration-200 ease-out',
          isDragging ? 'transition-none' : 'transition-transform'
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleCardClick}
      >
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardMedia
            src={property.images?.[0] || '/api/placeholder/320/200'}
            alt={property.name}
            aspectRatio="16/10"
            className="w-full"
          />
          
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg truncate">
                {property.name}
              </h3>
              
              <p className="text-gray-600 text-sm truncate">
                {property.location || property.address}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary-600">
                  {property.currency || 'KSh'} {property.price?.toLocaleString() || 'N/A'}
                </span>
                
                {property.isFavorited && (
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swipe Instruction Overlay */}
      {!isDragging && Math.abs(swipeOffset) === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
          <div className="bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
            Swipe for actions
          </div>
        </div>
      )}

      {/* Active Action Indicator */}
      {activeAction && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
          <div className={cn(
            'px-3 py-1 rounded-full text-white text-sm font-medium',
            activeAction.color,
            'animate-pulse'
          )}>
            {activeAction.label}
          </div>
        </div>
      )}
    </div>
  )
}

// Swipeable List Container
const SwipeableList = ({ 
  items, 
  renderItem, 
  onRefresh,
  className,
  ...props 
}) => {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    
    setRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-sm text-gray-600">Refreshing...</span>
        </div>
      )}
      
      {items.map((item, index) => (
        <div key={item.id || index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}

export { SwipeableList }
export default SwipeablePropertyCard