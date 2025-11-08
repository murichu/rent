import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Download, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import axios from 'axios'

const Reports = () => {
  const [stats, setStats] = useState({
    revenue: { current: 0, previous: 0, change: 0 },
    occupancy: { rate: 0, occupied: 0, total: 0 },
    collections: { collected: 0, pending: 0, rate: 0 },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }

      const [dashboardRes, propertiesRes, paymentsRes] = await Promise.all([
        axios.get('/dashboard/stats', config).catch(() => ({ data: {} })),
        axios.get('/properties', config).catch(() => ({ data: [] })),
        axios.get('/payments', config).catch(() => ({ data: [] })),
      ])

      const properties = Array.isArray(propertiesRes.data) ? propertiesRes.data : propertiesRes.data.data || []
      const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data.data || []

      // Calculate revenue
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const currentRevenue = payments
        .filter(p => {
          const date = new Date(p.payment_date || p.createdAt)
          return date.getMonth() === currentMonth && 
                 date.getFullYear() === currentYear &&
                 p.status === 'completed'
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const previousRevenue = payments
        .filter(p => {
          const date = new Date(p.payment_date || p.createdAt)
          return date.getMonth() === previousMonth && 
                 date.getFullYear() === previousYear &&
                 p.status === 'completed'
        })
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
        : 0

      // Calculate occupancy
      const totalUnits = properties.length
      const occupiedUnits = properties.filter(p => p.status === 'occupied').length
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits * 100).toFixed(1) : 0

      // Calculate collections
      const totalExpected = properties
        .filter(p => p.status === 'occupied')
        .reduce((sum, p) => sum + parseFloat(p.rent || 0), 0)
      const totalCollected = currentRevenue
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected * 100).toFixed(1) : 0

      setStats({
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          change: revenueChange,
        },
        occupancy: {
          rate: occupancyRate,
          occupied: occupiedUnits,
          total: totalUnits,
        },
        collections: {
          collected: totalCollected,
          pending: totalExpected - totalCollected,
          rate: collectionRate,
        },
      })
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const reportTypes = [
    { name: 'Revenue Report', description: 'Monthly revenue breakdown', icon: TrendingUp },
    { name: 'Occupancy Report', description: 'Property occupancy analysis', icon: BarChart3 },
    { name: 'Payment Report', description: 'Payment collection details', icon: Calendar },
    { name: 'Tenant Report', description: 'Tenant activity and history', icon: BarChart3 },
    { name: 'Property Report', description: 'Property performance metrics', icon: BarChart3 },
    { name: 'Financial Summary', description: 'Complete financial overview', icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading reports...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            View detailed reports and business insights
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {stats.revenue.current.toLocaleString()}
            </div>
            <p className={`text-xs ${stats.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.revenue.change >= 0 ? '+' : ''}{stats.revenue.change}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupancy.rate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.occupancy.occupied} of {stats.occupancy.total} units occupied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collections.rate}%</div>
            <p className="text-xs text-muted-foreground">
              KSh {stats.collections.pending.toLocaleString()} pending
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>
            Generate and download detailed reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((report) => {
              const Icon = report.icon
              return (
                <Card key={report.name} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{report.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {report.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chart placeholder - Integrate Chart.js or Recharts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
            <CardDescription>Current month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Chart placeholder - Integrate Chart.js or Recharts
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Reports
