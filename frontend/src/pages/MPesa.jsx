import { useState, useEffect } from 'react'
import { Smartphone, Send, RefreshCw, Wallet, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'

const MPesa = () => {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [balance, setBalance] = useState(null)

  useEffect(() => {
    fetchTransactions()
    fetchBalance()
  }, [])

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/mpesa/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTransactions(response.data.data || response.data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchBalance = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/mpesa/balance/latest', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBalance(response.data.data || response.data)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const handleSTKPush = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        '/mpesa/stk-push',
        {
          phone_number: phoneNumber,
          amount: parseFloat(amount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      alert('STK Push sent! Check your phone to complete the payment.')
      setPhoneNumber('')
      setAmount('')
      
      // Poll for status
      const checkoutRequestId = response.data.data?.CheckoutRequestID
      if (checkoutRequestId) {
        pollPaymentStatus(checkoutRequestId)
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send STK Push')
    } finally {
      setLoading(false)
    }
  }

  const pollPaymentStatus = async (checkoutRequestId) => {
    let attempts = 0
    const maxAttempts = 30 // 90 seconds (3s intervals)

    const interval = setInterval(async () => {
      attempts++
      
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(
          `/mpesa/status-detailed/${checkoutRequestId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        const status = response.data.data?.status

        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          clearInterval(interval)
          fetchTransactions()
          alert(`Payment ${status}!`)
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Error polling status:', error)
      }
    }, 3000)
  }

  const handleCheckBalance = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        '/mpesa/balance',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert('Balance check initiated. Results will be available shortly.')
      setTimeout(fetchBalance, 5000)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to check balance')
    }
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
      case 'processing':
        return <Clock className="h-5 w-5 text-orange-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'default'
      case 'failed':
      case 'cancelled':
        return 'destructive'
      case 'pending':
      case 'processing':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">M-Pesa Integration</h1>
          <p className="text-muted-foreground">
            Accept payments via M-Pesa STK Push
          </p>
        </div>
        <Button variant="outline" onClick={handleCheckBalance}>
          <Wallet className="mr-2 h-4 w-4" />
          Check Balance
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send STK Push</CardTitle>
            <CardDescription>
              Request payment from customer's M-Pesa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSTKPush} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format: 254XXXXXXXXX (without +)
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (KSh)</label>
                <Input
                  type="number"
                  placeholder="1000"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send STK Push
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Balance</CardTitle>
            <CardDescription>M-Pesa paybill balance</CardDescription>
          </CardHeader>
          <CardContent>
            {balance ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/10 p-6 text-center">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold">
                    KSh {parseFloat(balance.working_balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Working Balance:</span>
                    <span className="font-medium">
                      KSh {parseFloat(balance.working_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utility Balance:</span>
                    <span className="font-medium">
                      KSh {parseFloat(balance.utility_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-medium">
                      {balance.created_at ? new Date(balance.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Wallet className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No balance data available</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleCheckBalance}>
                    Check Balance
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent M-Pesa transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(transaction.status)}
                  <div className="space-y-1">
                    <p className="font-medium">{transaction.phone_number || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.created_at
                        ? new Date(transaction.created_at).toLocaleString()
                        : 'N/A'}
                    </p>
                    {transaction.mpesa_receipt_number && (
                      <p className="text-xs text-muted-foreground">
                        Receipt: {transaction.mpesa_receipt_number}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      KSh {parseFloat(transaction.amount || 0).toLocaleString()}
                    </p>
                    <Badge variant={getStatusColor(transaction.status)}>
                      {transaction.status || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <div className="flex h-32 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Smartphone className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MPesa
