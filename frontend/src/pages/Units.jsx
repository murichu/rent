import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Building2, Plus, Search, Edit, Trash2, DoorOpen, Users, X } from 'lucide-react'

export default function Units() {
  const [units, setUnits] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProperty, setSelectedProperty] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUnit, setEditingUnit] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    propertyId: '',
    unitNumber: '',
    floor: '',
    bedrooms: '',
    bathrooms: '',
    size: '',
    rent: '',
    status: 'vacant'
  })

  useEffect(() => {
    fetchUnits()
    fetchProperties()
  }, [])

  const fetchUnits = async () => {
    try {
      const response = await axios.get('/units')
      // Handle different response formats: paginated, nested data, or direct array
      const data = response.data.data || response.data.items || response.data.units || response.data
      setUnits(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching units:', error)
      setUnits([])
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await axios.get('/properties')
      // Handle different response formats: paginated, nested data, or direct array
      const data = response.data.data || response.data.properties || response.data
      setProperties(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
    }
  }

  const handleOpenModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit)
      setFormData({
        propertyId: unit.propertyId || '',
        unitNumber: unit.unitNumber || '',
        floor: unit.floor || '',
        bedrooms: unit.bedrooms || '',
        bathrooms: unit.bathrooms || '',
        size: unit.size || '',
        rent: unit.rent || '',
        status: unit.status || 'vacant'
      })
    } else {
      setEditingUnit(null)
      setFormData({
        propertyId: '',
        unitNumber: '',
        floor: '',
        bedrooms: '',
        bathrooms: '',
        size: '',
        rent: '',
        status: 'vacant'
      })
    }
    setError('')
    setShowAddModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingUnit) {
        await axios.put(`/units/${editingUnit.id}`, formData)
        setSuccess('Unit updated successfully')
      } else {
        await axios.post('/units', formData)
        setSuccess('Unit created successfully')
      }
      setShowAddModal(false)
      setEditingUnit(null)
      fetchUnits()
      setFormData({
        propertyId: '',
        unitNumber: '',
        floor: '',
        bedrooms: '',
        bathrooms: '',
        size: '',
        rent: '',
        status: 'vacant'
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving unit:', error)
      setError(error.response?.data?.error || 'Failed to save unit')
    }
  }

  const handleDelete = async (unit) => {
    if (window.confirm(`Are you sure you want to delete unit "${unit.unitNumber}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`/units/${unit.id}`)
        setSuccess('Unit deleted successfully')
        fetchUnits()
        setTimeout(() => setSuccess(''), 3000)
      } catch (error) {
        console.error('Error deleting unit:', error)
        setError(error.response?.data?.error || 'Failed to delete unit')
        setTimeout(() => setError(''), 3000)
      }
    }
  }

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.property?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProperty = selectedProperty === 'all' || unit.propertyId === selectedProperty
    return matchesSearch && matchesProperty
  })

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'vacant': return 'bg-green-100 text-green-800'
      case 'occupied': return 'bg-blue-100 text-blue-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'reserved': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const stats = {
    total: units.length,
    vacant: units.filter(u => u.status === 'vacant').length,
    occupied: units.filter(u => u.status === 'occupied').length,
    maintenance: units.filter(u => u.status === 'maintenance').length
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Units Management</h1>
          <p className="text-gray-500">Manage property units and availability</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Units</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vacant</p>
                <p className="text-2xl font-bold text-green-600">{stats.vacant}</p>
              </div>
              <DoorOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Occupied</p>
                <p className="text-2xl font-bold text-blue-600">{stats.occupied}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
              </div>
              <Building2 className="h-8 w-8 text-yellow-500" />
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
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="all">All Properties</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map(unit => (
          <Card key={unit.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{unit.unitNumber}</CardTitle>
                  <p className="text-sm text-gray-500">{unit.property?.name}</p>
                </div>
                <Badge className={getStatusColor(unit.status)}>
                  {unit.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Floor:</span>
                  <span className="font-medium">{unit.floor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bedrooms:</span>
                  <span className="font-medium">{unit.bedrooms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bathrooms:</span>
                  <span className="font-medium">{unit.bathrooms || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Size:</span>
                  <span className="font-medium">{unit.size ? `${unit.size} sqft` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rent:</span>
                  <span className="font-bold text-blue-600">
                    ${unit.rent?.toLocaleString() || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleOpenModal(unit)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(unit)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No units found</p>
          </CardContent>
        </Card>
      )}

      {/* Add Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowAddModal(false); setEditingUnit(null); setError(''); }}>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Property</label>
                  <select
                    required
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select Property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Number</label>
                  <Input
                    required
                    value={formData.unitNumber}
                    onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                    placeholder="e.g., A101"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Floor</label>
                    <Input
                      type="number"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bedrooms</label>
                    <Input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bathrooms</label>
                    <Input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Size (sqft)</label>
                    <Input
                      type="number"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Rent</label>
                  <Input
                    required
                    type="number"
                    value={formData.rent}
                    onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingUnit ? 'Update Unit' : 'Create Unit'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowAddModal(false); setEditingUnit(null); setError(''); }}
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
