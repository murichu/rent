import { useEffect, useState } from 'react'
import { Plus, Search, Calendar, Edit, Trash2, X, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'

const Leases = () => {
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingLease, setEditingLease] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [formData, setFormData] = useState({
    propertyId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    rentAmount: '',
    paymentDayOfMonth: '1'
  })

  useEffect(() => {
    fetchLeases()
    fetchProperties()
    fetchTenants()
  }, [])

  const fetchLeases = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/leases', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = response.data.data || response.data.items || response.data
      setLeases(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching leases:', error)
      setLeases([])
      setError('Failed to load leases')
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/properties', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = response.data.data || response.data
      setProperties(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
    }
  }

  const fetchTenants = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = response.data.data || response.data.items || response.data
      setTenants(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
      setTenants([])
    }
  }

  const handleOpenModal = (lease = null) => {
    if (lease) {
      setEditingLease(lease)
      setFormData({
        propertyId: lease.propertyId || '',
        tenantId: lease.tenantId || '',
        startDate: lease.startDate ? new Date(lease.startDate).toISOString().split('T')[0] : '',
        endDate: lease.endDate ? new Date(lease.endDate).toISOString().split('T')[0] : '',
        rentAmount: lease.rentAmount || '',
        paymentDayOfMonth: lease.paymentDayOfMonth || '1'
      })
    } else {
      setEditingLease(null)
      setFormData({
        propertyId: '',
        tenantId: '',
        startDate: '',
        endDate: '',
        rentAmount: '',
        paymentDayOfMonth: '1'
      })
    }
    setError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingLease(null)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const token = localStorage.getItem('token')
      const payload = {
        propertyId: formData.propertyId,
        tenantId: formData.tenantId,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        rentAmount: parseInt(formData.rentAmount),
        paymentDayOfMonth: parseInt(formData.paymentDayOfMonth)
      }

      if (editingLease) {
        await axios.put(`/leases/${editingLease.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Lease updated successfully')
      } else {
        await axios.post('/leases', payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Lease created successfully')
      }

      handleCloseModal()
      fetchLeases()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving lease:', error)
      setError(error.response?.data?.error || 'Failed to save lease')
    }
  }

  const handleDelete = async (lease) => {
    const tenantName = lease.tenant?.name || 'this lease'
    if (!window.confirm(`Are you sure you want to delete the lease for "${tenantName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/leases/${lease.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Lease deleted successfully')
      fetchLeases()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting lease:', error)
      setError(error.response?.data?.error || 'Failed to delete lease')
      setTimeout(() => setError(''), 3000)
    }
  }

  const filteredLeases = leases.filter((lease) =>
    lease.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lease.unit_number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default'
      case 'expired':
        return 'destructive'
      case 'pending':
        return 'secondary'
      case 'terminated':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getExpiryWarning = (endDate) => {
    const today = new Date()
    const end = new Date(endDate)
    const daysUntilExpiry = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) return { show: true, text: 'Expired', color: 'text-red-600' }
    if (daysUntilExpiry <= 30) return { show: true, text: `${daysUntilExpiry} days left`, color: 'text-orange-600' }
    return { show: false }
  }

  const activeLeases = leases.filter(l => l.status?.toLowerCase() === 'active').length
  const expiringLeases = leases.filter(l => {
    const warning = getExpiryWarning(l.end_date)
    return warning.show && warning.text !== 'Expired'
  }).length

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading leases...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leases</h1>
          <p className="text-muted-foreground">
            Manage tenant lease agreements
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lease
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeases}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringLeases}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leases.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredLeases.map((lease) => {
          const expiryWarning = getExpiryWarning(lease.end_date)
          return (
            <Card key={lease.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{lease.tenant_name || 'Unknown Tenant'}</CardTitle>
                    <CardDescription>
                      {lease.property_name} - Unit {lease.unit_number || 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusColor(lease.status)}>
                      {lease.status || 'N/A'}
                    </Badge>
                    {expiryWarning.show && (
                      <Badge variant="outline" className={expiryWarning.color}>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        {expiryWarning.text}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span className="font-medium">
                        {lease.start_date ? new Date(lease.start_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">
                        {lease.end_date ? new Date(lease.end_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Rent:</span>
                      <span className="font-medium">
                        KSh {parseFloat(lease.rent_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Security Deposit:</span>
                      <span className="font-medium">
                        KSh {parseFloat(lease.security_deposit || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Day:</span>
                      <span className="font-medium">{lease.payment_day || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">
                        {lease.duration_months || 'N/A'} months
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenModal(lease)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(lease)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredLeases.length === 0 && (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">No leases found</p>
            <Button className="mt-4" onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Lease
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingLease ? 'Edit Lease' : 'Create New Lease'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCloseModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Property *</label>
                    <select
                      required
                      value={formData.propertyId}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tenant *</label>
                    <select
                      required
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date *</label>
                    <Input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Monthly Rent (KSh) *</label>
                    <Input
                      type="number"
                      required
                      min="1"
                      value={formData.rentAmount}
                      onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
                      placeholder="e.g., 25000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Day of Month *</label>
                    <Input
                      type="number"
                      required
                      min="1"
                      max="28"
                      value={formData.paymentDayOfMonth}
                      onChange={(e) => setFormData({ ...formData, paymentDayOfMonth: e.target.value })}
                      placeholder="1-28"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingLease ? 'Update Lease' : 'Create Lease'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
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

export default Leases
