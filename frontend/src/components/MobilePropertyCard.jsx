import React, { useState, useRef, useEffect } from 'react'
import { MapPin, Bed, Bath, Square, Star, Heart, ChevronLeft, ChevronRight, Share2, Phone } from 'lucide-react'
import { Card, CardContent, CardMedia, CardBadge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTouch } from '@/hooks/useResponsive'

const MobilePropertyCard = ({ 
  property, 
  onSelect, 
  onFavorite,
  onShare,
  onCall,
  loading = false,
  className,
  ...props 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isFavorited, setIsFavorited] = useState(property?.isFavorited || false)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isPressed, setIsPressed] = useState(false)
  const cardRef = useRef(null)
  const isTouch = useTouch()

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  if (loading) {
    return (
      <Card 
        loading={true} 
        skeleton="media" 
        className={cn('w-full', className)}
      />
    )
  }

  if (!property) return null

  const {
    id,
    name,
    location,
    address,
    price,
    currency = 'KSh',
    images = [],
    amenities = [],
    bedrooms,
    bathrooms,
    area,
    type,
    status,
    rating,
    featured = false,
    phone
  } = property

  const displayImages = images.length > 0 ? images : ['/api/placeholder/320/200']
  const hasMultipleImages = displayImages.length > 1

  // Touch handlers for swipe gestures
  const onTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (hasMultipleImages) {
      if (isLeftSwipe) {
        handleNextImage()
      } else if (isRightSwipe) {
        handlePrevImage()
      }
    }
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    )
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    )
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    setIsFavorited(!isFavorited)
    onFavorite?.(id, !isFavorited)
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const handleShareClick = (e) => {
    e.stopPropagation()
    onShare?.(property)
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  const handleCallClick = (e) => {
    e.stopPropagation()
    if (phone) {
      window.location.href = `tel:${phone}`
    } else {
      onCall?.(property)
    }
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const handleCardPress = () => {
    setIsPressed(true)
    // Haptic feedback for press
    if (navigator.vibrate) {
      navigator.vibrate(20)
    }
  }

  const handleCardRelease = () => {
    setIsPressed(false)
  }

  const handleCardClick = () => {
    onSelect?.(id)
  }

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'success'
      case 'occupied':
        return 'default'
      case 'maintenance':
        return 'warning'
      case 'unavailable':
        return 'error'
      default:
        return 'default'
    }
  }

  const formatPrice = (price) => {
    if (!price) return 'Price on request'
    return `${currency} ${parseFloat(price).toLocaleString()}`
  }

  return (
    <Card
      ref={cardRef}
      variant="interactive"
      className={cn(
        'overflow-hidden cursor-pointer group transition-all duration-200',
        'active:scale-[0.98] touch-manipulation',
        isPressed && 'scale-[0.98] shadow-sm',
        className
      )}
      onClick={handleCardClick}
      onTouchStart={handleCardPress}
      onTouchEnd={handleCardRelease}
      onMouseDown={handleCardPress}
      onMouseUp={handleCardRelease}
      onMouseLeave={handleCardRelease}
      {...props}
    >
      {/* Image Section with Swipe Support */}
      <div 
        className="relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CardMedia
          src={displayImages[currentImageIndex]}
          alt={name}
          aspectRatio="16/10"
          className="w-full"
        />
        
        {/* Swipe Indicator for Multiple Images */}
        {hasMultipleImages && (
          <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
            {currentImageIndex + 1}/{displayImages.length}
          </div>
        )}

        {/* Image Navigation Buttons (fallback for non-touch) */}
        {hasMultipleImages && !isTouch && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.stopPropagation()
                handlePrevImage()
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.stopPropagation()
                handleNextImage()
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {/* Image Indicators */}
        {hasMultipleImages && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {displayImages.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                )}
              />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {featured && (
            <CardBadge variant="primary" className="text-xs font-semibold">
              Featured
            </CardBadge>
          )}
          {status && (
            <CardBadge variant={getStatusBadgeVariant(status)} className="text-xs">
              {status}
            </CardBadge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="bg-white/80 hover:bg-white/90 min-h-[44px] min-w-[44px] rounded-full"
            onClick={handleFavoriteClick}
          >
            <Heart 
              className={cn(
                'h-4 w-4 transition-colors',
                isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
              )} 
            />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="bg-white/80 hover:bg-white/90 min-h-[44px] min-w-[44px] rounded-full"
            onClick={handleShareClick}
          >
            <Share2 className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                {name}
              </h3>
              <div className="flex items-center text-gray-600 mt-1">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-sm truncate">{location || address}</span>
              </div>
            </div>
            {rating && (
              <div className="flex items-center gap-1 ml-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{rating}</span>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {bedrooms && (
              <div className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                <span>{bedrooms}</span>
              </div>
            )}
            {bathrooms && (
              <div className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                <span>{bathrooms}</span>
              </div>
            )}
            {area && (
              <div className="flex items-center gap-1">
                <Square className="h-4 w-4" />
                <span>{area} sqft</span>
              </div>
            )}
          </div>

          {/* Type and Amenities */}
          <div className="space-y-2">
            {type && (
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                {type}
              </span>
            )}
            
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {amenities.slice(0, 3).map((amenity, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                  >
                    {amenity}
                  </span>
                ))}
                {amenities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    +{amenities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Price and Call Button */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <div className="text-xl font-bold text-gray-900">
                {formatPrice(price)}
              </div>
              <div className="text-xs text-gray-600">per month</div>
            </div>
            
            {phone && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] px-4"
                onClick={handleCallClick}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MobilePropertyCard