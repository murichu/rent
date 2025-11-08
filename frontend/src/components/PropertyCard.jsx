import React, { useState } from 'react'
import { MapPin, Bed, Bath, Square, Star, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardMedia, CardBadge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useResponsive } from '@/hooks/useResponsive'
import MobilePropertyCard from './MobilePropertyCard'

const PropertyCard = ({ 
  property, 
  viewMode = 'grid', 
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
  const { isMobile } = useResponsive()

  // Use mobile-optimized card on mobile devices
  if (isMobile) {
    return (
      <MobilePropertyCard
        property={property}
        onSelect={onSelect}
        onFavorite={onFavorite}
        onShare={onShare}
        onCall={onCall}
        loading={loading}
        className={className}
        {...props}
      />
    )
  }

  if (loading) {
    return (
      <Card 
        loading={true} 
        skeleton="media" 
        className={cn(
          viewMode === 'grid' ? 'w-full' : 'flex-row',
          className
        )}
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
    featured = false
  } = property

  const displayImages = images.length > 0 ? images : ['/api/placeholder/320/200']
  const hasMultipleImages = displayImages.length > 1

  const handlePrevImage = (e) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    )
  }

  const handleNextImage = (e) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    )
  }

  const handleFavoriteClick = (e) => {
    e.stopPropagation()
    setIsFavorited(!isFavorited)
    onFavorite?.(id, !isFavorited)
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

  if (viewMode === 'list') {
    return (
      <Card
        variant="interactive"
        className={cn(
          'flex flex-row overflow-hidden cursor-pointer group',
          'hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
          className
        )}
        onClick={handleCardClick}
        {...props}
      >
        {/* Image Section */}
        <div className="relative w-80 h-48 flex-shrink-0">
          <CardMedia
            src={displayImages[currentImageIndex]}
            alt={name}
            className="w-full h-full"
          />
          
          {/* Image Navigation */}
          {hasMultipleImages && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handlePrevImage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleNextImage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Image Indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
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
            </>
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

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 bg-white/80 hover:bg-white/90"
            onClick={handleFavoriteClick}
          >
            <Heart 
              className={cn(
                'h-4 w-4 transition-colors',
                isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
              )} 
            />
          </Button>
        </div>

        {/* Content Section */}
        <CardContent className="flex-1 p-6">
          <div className="flex flex-col h-full justify-between">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {name}
                  </h3>
                  <div className="flex items-center text-gray-600 mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">{location || address}</span>
                  </div>
                </div>
                {rating && (
                  <div className="flex items-center gap-1">
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
                    <span>{bedrooms} bed{bedrooms !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {bathrooms && (
                  <div className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    <span>{bathrooms} bath{bathrooms !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {area && (
                  <div className="flex items-center gap-1">
                    <Square className="h-4 w-4" />
                    <span>{area} sqft</span>
                  </div>
                )}
                {type && (
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                    {type}
                  </span>
                )}
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {amenities.slice(0, 4).map((amenity, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                  {amenities.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      +{amenities.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(price)}
                </div>
                <div className="text-sm text-gray-600">per month</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Grid view (default)
  return (
    <Card
      variant="interactive"
      className={cn(
        'overflow-hidden cursor-pointer group',
        'hover:shadow-lg hover:-translate-y-1 transition-all duration-300',
        className
      )}
      onClick={handleCardClick}
      {...props}
    >
      {/* Image Section */}
      <div className="relative">
        <CardMedia
          src={displayImages[currentImageIndex]}
          alt={name}
          aspectRatio="16/10"
          className="w-full"
        />
        
        {/* Image Navigation */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePrevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleNextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {/* Image Indicators */}
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
          </>
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

        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 bg-white/80 hover:bg-white/90"
          onClick={handleFavoriteClick}
        >
          <Heart 
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'
            )} 
          />
        </Button>
      </div>

      {/* Content Section */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
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
          <div className="flex items-center gap-3 text-sm text-gray-600">
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

          {/* Type */}
          {type && (
            <div>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                {type}
              </span>
            </div>
          )}

          {/* Amenities */}
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

          {/* Price */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xl font-bold text-gray-900">
                  {formatPrice(price)}
                </div>
                <div className="text-xs text-gray-600">per month</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PropertyCard