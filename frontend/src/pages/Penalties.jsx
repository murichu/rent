import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { AlertTriangle, Plus, Search, DollarSign, Calendar, CheckCircle, XCircle } from 'lucide-react'

export default function Penalties() {
  const [penalties, setPenalties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    tenantId: '',
    leaseId: '',
    type: 'late_payment',
    amount: '',
    reason: '',
    dueDate: ''
  })

  useEffect(() => {
    fetchPenalties()
  }, [])

  const fetchPenalties = async () => {
    try {
      const response = await axios.get('/penalties')
      const data = response.data.data || response.data.penalties || response.data
      setPenalties(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching penalties:', error)
      setPenalties([])
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/penalties', formData)
      setShowAddModal(false)
      fetchPenalties()
      setFormData({
        tenantId: '',
        leaseId: '',
        type: 'late_payment',
        amount: '',
        reason: '',
        dueDate: ''
      })
    } catch (error) {
      console.error('Error creating penalty:', error)
    }
  }

  const handleWaive = async (id) => {
    if (window.confirm('Are you sure you want to waive this penalty?')) {
      try {
        await axios.patch(`/penalties/${id}/waive`)
        fetchPenalties()
      } catch (error) {
        console.error('Error waiving penalty:', error)
      }
    }
  }

  const handleMarkPaid = async (id) => {
    try {
      await axios.patch(`/penalties/${id}/pay`)
      fetchPenalties()
    } catch (error) {
      console.error('Error marking penalty as paid:', error)
    }
  }

  const filteredPenalties = penalties.filter(penalty => {
    const matchesSearch = penalty.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         penalty.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || penalty.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'waived': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type) => {
    const types = {
      late_payment: 'Late Payment',
      damage: 'Property Damage',
      noise_complaint: 'Noise Complaint',
      lease_violation: 'Lease Violation',
      other: 'Other'
    }
    return types[type] || type
  }

  const stats = {
    total: penalties.length,
    pending: penalties.filter(p => p.status === 'pending').length,
    paid: penalties.filter(p => p.status === 'paid').length,
    totalAmount: penalties
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Penalties & Late Fees</h1>
          <p className="text-gray-500">Manage tenant penalties and late payment fees</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Penalty
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Penalties</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  ${stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search penalties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Penalties List */}
      <div className="space-y-4">
        {filteredPenalties.map(penalty => (
          <Card key={penalty.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{penalty.tenant?.name || 'Unknown Tenant'}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {getTypeLabel(penalty.type)} • 
                    {penalty.dueDate && ` Due: ${new Date(penalty.dueDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(penalty.status)}>
                    {penalty.status}
                  </Badge>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      ${penalty.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{penalty.reason}</p>
              <div className="flex gap-2">
                {penalty.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleMarkPaid(penalty.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Paid
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWaive(penalty.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Waive Penalty
                    </Button>
                  </>
                )}
                {penalty.status === 'paid' && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      Paid on {new Date(penalty.paidDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {penalty.status === 'waived' && (
                  <div className="flex items-center text-blue-600">
                    <XCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      Waived on {new Date(penalty.waivedDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPenalties.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No penalties found</p>
          </CardContent>
        </Card>
      )}

      {/* Add Penalty Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add New Penalty</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tenant</label>
                  <Input
                    required
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    placeholder="Select tenant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="late_payment">Late Payment</option>
                    <option value="damage">Property Damage</option>
                    <option value="noise_complaint">Noise Complaint</option>
                    <option value="lease_violation">Lease Violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <Input
                    required
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for penalty"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <Input
                    required
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Add Penalty</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
