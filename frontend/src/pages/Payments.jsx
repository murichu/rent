import { useEffect, useState } from 'react'
import { Plus, Search, Calendar, DollarSign } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'

const Payments = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/payments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      // Handle both array and object responses
      const paymentsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.payments || response.data.data || [])
      setPayments(paymentsData)
    } catch (error) {
      console.error('Error fetching payments:', error)
      setPayments([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = Array.isArray(payments) ? payments.filter((payment) =>
    payment.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : []

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'overdue':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const pendingPayments = payments.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading payments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Track and manage rental payments
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KSh {totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Recent payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="space-y-1">
                  <p className="font-medium">{payment.tenant_name || 'Unknown Tenant'}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {payment.payment_date 
                        ? new Date(payment.payment_date).toLocaleDateString()
                        : 'N/A'}
                    </span>
                    {payment.reference && (
                      <>
                        <span>•</span>
                        <span>Ref: {payment.reference}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      KSh {parseFloat(payment.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.payment_method || 'N/A'}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(payment.status)}>
                    {payment.status || 'N/A'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {filteredPayments.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">No payments found</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Payments
