import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  trendValue, 
  color = 'text-blue-600',
  loading = false,
  onClick,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Determine trend icon and color
  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return Minus
    return trend === 'up' ? TrendingUp : TrendingDown
  }

  const getTrendColor = () => {
    if (!trend || trend === 'neutral') return 'text-gray-500'
    return trend === 'up' ? 'text-green-600' : 'text-red-600'
  }

  const TrendIcon = getTrendIcon()
  const trendColor = getTrendColor()

  if (loading) {
    return (
      <Card className={`transition-all duration-300 ${className}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={`
        transition-all duration-300 cursor-pointer
        ${isHovered ? 'shadow-lg scale-105 border-primary/20' : 'shadow-sm hover:shadow-md'}
        ${onClick ? 'hover:bg-gray-50/50' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-sm font-medium text-gray-600 tracking-wide">
          {title}
        </h3>
        <div className={`
          p-2 rounded-lg transition-all duration-300
          ${isHovered ? 'bg-primary/10 scale-110' : 'bg-gray-100'}
        `}>
          <Icon className={`h-4 w-4 ${color} transition-colors duration-300`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {value}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {description}
            </p>
            
            {trend && trendValue && (
              <div className={`flex items-center space-x-1 ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {trendValue}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MetricCard