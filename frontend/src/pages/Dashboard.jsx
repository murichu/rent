import { useEffect, useState } from 'react'
import { Building2, Users, DollarSign, TrendingUp, Activity, Home, Plus, Bell, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import MetricCard from '../components/MetricCard'
import MetricCardSkeleton from '../components/MetricCardSkeleton'
import RevenueChart from '../components/RevenueChart'
import OccupancyChart from '../components/OccupancyChart'
import PropertyPerformanceChart from '../components/PropertyPerformanceChart'
import CustomizableDashboard from '../components/CustomizableDashboard'
import apiClient from '../lib/axios'
import loggingService from '../services/loggingService'
import toastService from '../services/toastService'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    occupancyRate: 0,
    previousMonthRevenue: 0,
    previousOccupancyRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showCustomLayout, setShowCustomLayout] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])
  const [quickActions] = useState([
    { id: 1, title: 'Add New Property', icon: Building2, action: 'add-property' },
    { id: 2, title: 'Register New Tenant', icon: Users, action: 'add-tenant' },
    { id: 3, title: 'Record Payment', icon: DollarSign, action: 'record-payment' },
    { id: 4, title: 'Schedule Maintenance', icon: Calendar, action: 'schedule-maintenance' },
  ])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const startTime = performance.now();
    
    // Log dashboard data fetch attempt
    const correlationId = loggingService.logUserAction('fetch_dashboard_data', 'Dashboard', {
      timestamp: new Date().toISOString()
    });

    try {
      const [propertiesRes, tenantsRes, paymentsRes] = await Promise.all([
        apiClient.get('/properties'),
        apiClient.get('/tenants'),
        apiClient.get('/payments'),
      ])

      const properties = propertiesRes.data
      const tenants = tenantsRes.data
      const payments = paymentsRes.data

      // Log successful data fetch
      const fetchTime = performance.now() - startTime;
      loggingService.logPerformance('dashboard_data_fetch', fetchTime, 'Dashboard');

      // Calculate stats
      const totalProperties = properties.length
      const totalTenants = tenants.length
      const occupiedUnits = properties.filter(p => p.status === 'occupied').length
      const occupancyRate = totalProperties > 0 ? (occupiedUnits / totalProperties) * 100 : 0

      // Calculate current month revenue
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = payments
        .filter(p => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear &&
                 p.status === 'completed'
        })
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)

      // Calculate previous month revenue for trend
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const previousMonthRevenue = payments
        .filter(p => {
          const paymentDate = new Date(p.payment_date)
          return paymentDate.getMonth() === previousMonth && 
                 paymentDate.getFullYear() === previousYear &&
                 p.status === 'completed'
        })
        .reduce((sum, p) => sum + parseFloat(p.amount), 0)

      const calculatedStats = {
        totalProperties,
        totalTenants,
        monthlyRevenue,
        occupancyRate: occupancyRate.toFixed(1),
        previousMonthRevenue,
        previousOccupancyRate: occupancyRate.toFixed(1), // For now, using same value
      };

      setStats(calculatedStats);

      // Generate recent activity (mock data for now)
      setRecentActivity([
        {
          id: 1,
          type: 'tenant_registered',
          message: 'New tenant registered for Property A-101',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          icon: Users,
          color: 'text-green-600'
        },
        {
          id: 2,
          type: 'payment_received',
          message: 'Payment received: KSh 25,000',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          icon: DollarSign,
          color: 'text-blue-600'
        },
        {
          id: 3,
          type: 'maintenance_scheduled',
          message: 'Maintenance scheduled for Property B-205',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          icon: Calendar,
          color: 'text-orange-600'
        },
        {
          id: 4,
          type: 'property_added',
          message: 'New property added: Sunset Apartments Unit 301',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          icon: Building2,
          color: 'text-purple-600'
        }
      ]);

      // Log business metrics
      loggingService.logBusiness('dashboard_metrics_calculated', {
        ...calculatedStats,
        correlationId,
        calculationTime: performance.now() - startTime
      });

      // Log successful dashboard load
      loggingService.info('Dashboard data loaded successfully', {
        category: loggingService.LogCategories.USER_ACTION,
        component: 'Dashboard',
        action: 'data_loaded',
        data: {
          propertiesCount: totalProperties,
          tenantsCount: totalTenants,
          loadTime: performance.now() - startTime
        },
        correlationId
      });

    } catch (error) {
      // Log dashboard fetch error
      loggingService.logComponentError(error, 'Dashboard', 'fetchDashboardData');
      
      // Log API errors for each failed request
      if (error.config?.url) {
        loggingService.logApiError(error, error.config.url, error.config.method?.toUpperCase());
      }

      // Show user-friendly error message
      toastService.error('Failed to load dashboard data', {
        title: 'Dashboard Error',
        correlationId,
        retryable: true,
        onRetry: fetchDashboardData,
        errorDetails: {
          message: error.message,
          status: error.response?.status
        }
      });

      // Log performance issue if it took too long
      const fetchTime = performance.now() - startTime;
      if (fetchTime > 5000) {
        loggingService.logPerformance('slow_dashboard_fetch', fetchTime, 'Dashboard');
      }
    } finally {
      setLoading(false)
    }
  }

  // Calculate trends
  const getRevenueTrend = () => {
    if (stats.previousMonthRevenue === 0) return { trend: 'neutral', value: '0%' }
    const change = ((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: `${Math.abs(change).toFixed(1)}%`
    }
  }

  const getOccupancyTrend = () => {
    // For demo purposes, showing a slight upward trend
    return {
      trend: 'up',
      value: '2.3%'
    }
  }

  const revenueTrend = getRevenueTrend()
  const occupancyTrend = getOccupancyTrend()

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building2,
      description: 'Active properties',
      color: 'text-blue-600',
      trend: 'neutral',
      trendValue: null,
    },
    {
      title: 'Total Tenants',
      value: stats.totalTenants,
      icon: Users,
      description: 'Active tenants',
      color: 'text-green-600',
      trend: 'up',
      trendValue: '5.2%',
    },
    {
      title: 'Monthly Revenue',
      value: `KSh ${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: 'This month',
      color: 'text-yellow-600',
      trend: revenueTrend.trend,
      trendValue: revenueTrend.value,
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate}%`,
      icon: Activity,
      description: 'Current occupancy',
      color: 'text-purple-600',
      trend: occupancyTrend.trend,
      trendValue: occupancyTrend.value,
    },
  ]

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const handleQuickAction = (action) => {
    loggingService.logUserAction('quick_action_clicked', 'Dashboard', { action });
    // Handle navigation or modal opening based on action
    switch (action) {
      case 'add-property':
        // Navigate to add property page
        break;
      case 'add-tenant':
        // Navigate to add tenant page
        break;
      case 'record-payment':
        // Open payment modal
        break;
      case 'schedule-maintenance':
        // Open maintenance modal
        break;
      default:
        break;
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your property management.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton count={4} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-6 w-28 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 w-full bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showCustomLayout) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Customize your dashboard layout by dragging and dropping widgets.
            </p>
          </div>
          <button
            onClick={() => setShowCustomLayout(false)}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Exit Customization
          </button>
        </div>
        
        <CustomizableDashboard
          widgets={[
            { id: 'metrics-1', type: 'metrics', title: 'Key Metrics', order: 0 },
            { id: 'revenue-1', type: 'revenue-chart', title: 'Revenue Trends', order: 1 },
            { id: 'occupancy-1', type: 'occupancy-chart', title: 'Occupancy Rates', order: 2 },
            { id: 'property-status-1', type: 'property-status', title: 'Property Status', order: 3 },
          ]}
          onLayoutChange={(layout) => {
            loggingService.logUserAction('dashboard_layout_changed', 'Dashboard', { layout });
          }}
          onWidgetAdd={(widget) => {
            loggingService.logUserAction('dashboard_widget_added', 'Dashboard', { widget });
          }}
          onWidgetRemove={(widgetId) => {
            loggingService.logUserAction('dashboard_widget_removed', 'Dashboard', { widgetId });
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your property management.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCustomLayout(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Activity className="h-4 w-4" />
            <span>Customize Layout</span>
          </button>
          
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Enhanced Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <MetricCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            color={stat.color}
            trend={stat.trend}
            trendValue={stat.trendValue}
            onClick={() => {
              // Log metric card interaction
              loggingService.logUserAction('metric_card_clicked', 'Dashboard', {
                metric: stat.title,
                value: stat.value
              });
            }}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart loading={loading} />
        <OccupancyChart loading={loading} />
      </div>

      {/* Property Performance and Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <PropertyPerformanceChart loading={loading} />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Latest updates from your properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const Icon = activity.icon
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-100 ${activity.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-tight">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5 text-green-600" />
              <span>Quick Actions</span>
            </CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.action)}
                    className="w-full flex items-center space-x-3 p-3 text-left text-sm border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                  >
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{action.title}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
