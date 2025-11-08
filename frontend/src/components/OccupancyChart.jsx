import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const OccupancyChart = ({ data = [], loading = false, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(null)

  // Generate sample data if none provided
  const chartData = useMemo(() => {
    if (data.length > 0) return data

    // Sample data for the last 6 months
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return months.map((month, index) => ({
      month,
      occupancy: Math.floor(Math.random() * 30) + 70, // 70-100%
      available: Math.floor(Math.random() * 10) + 5,   // 5-15 units
      occupied: Math.floor(Math.random() * 40) + 30,   // 30-70 units
    }))
  }, [data])

  const getBarColor = (occupancy) => {
    if (occupancy >= 90) return '#10b981' // Green
    if (occupancy >= 75) return '#f59e0b' // Yellow
    return '#ef4444' // Red
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Occupancy Rate:</span>
              <span className="font-medium text-gray-900">{data.occupancy}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Occupied Units:</span>
              <span className="font-medium text-gray-900">{data.occupied}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Available Units:</span>
              <span className="font-medium text-gray-900">{data.available}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Occupancy Trends
        </CardTitle>
        <CardDescription>
          Property occupancy rates over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
              onMouseMove={(state) => {
                if (state.isTooltipActive) {
                  setActiveIndex(state.activeTooltipIndex)
                } else {
                  setActiveIndex(null)
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Bar 
                dataKey="occupancy" 
                radius={[4, 4, 0, 0]}
                stroke="#ffffff"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.occupancy)}
                    style={{
                      filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">90%+ (Excellent)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">75-89% (Good)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">&lt;75% (Needs Attention)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OccupancyChart