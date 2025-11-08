import { useEffect, useState } from 'react'
import { Plus, Search, MapPin, Edit, Trash2, X, Filter, SlidersHorizontal, Grid, List } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PropertyGrid from '@/components/PropertyGrid'
import PropertyCard from '@/components/PropertyCard'
import { PropertyFormModal } from '@/components/ui/form-modal'
import axios from 'axios'

const Properties = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/properties', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProperties(response.data.data || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
      setProperties([])
      setError('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (property = null) => {
    setEditingProperty(property)
    setError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingProperty(null)
    setError('')
  }

  const handleSubmit = async (formData) => {
    setError('')
    setSubmitLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      const payload = {
        ...formData,
        totalUnits: formData.totalUnits ? parseInt(formData.totalUnits) : undefined
      }

      if (editingProperty) {
        await axios.put(`/properties/${editingProperty.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Property updated successfully')
      } else {
        await axios.post('/properties', payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSuccess('Property created successfully')
      }

      handleCloseModal()
      fetchProperties()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving property:', error)
      setError(error.response?.data?.error || 'Failed to save property')
      throw error // Re-throw to let the modal handle it
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (property) => {
    if (!window.confirm(`Are you sure you want to delete "${property.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/properties/${property.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuccess('Property deleted successfully')
      fetchProperties()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error deleting property:', error)
      setError(error.response?.data?.error || 'Failed to delete property')
      setTimeout(() => setError(''), 3000)
    }
  }

  // Transform properties data to match PropertyCard expectations
  const transformedProperties = properties.map(property => ({
    ...property,
    location: property.location || property.address,
    price: property.rent || property.price,
    currency: 'KSh',
    images: property.images || [],
    amenities: property.amenities || [],
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    rating: property.rating,
    featured: property.featured || false,
    isFavorited: property.isFavorited || false
  }))

  // Filter and sort properties
  const filteredAndSortedProperties = transformedProperties
    .filter((property) => {
      const matchesSearch = property.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filterType === 'all' || property.type?.toLowerCase() === filterType.toLowerCase()
      const matchesStatus = filterStatus === 'all' || property.status?.toLowerCase() === filterStatus.toLowerCase()
      
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      // Handle different data types
      if (sortBy === 'price' || sortBy === 'rent') {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue?.toLowerCase() || ''
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handlePropertySelect = (propertyId) => {
    console.log('Selected property:', propertyId)
    // Navigate to property details or open modal
  }

  const handlePropertyFavorite = (propertyId, isFavorited) => {
    console.log('Favorite toggled:', propertyId, isFavorited)
    // Update property favorite status
    setProperties(prev => prev.map(prop => 
      prop.id === propertyId 
        ? { ...prop, isFavorited } 
        : prop
    ))
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'occupied':
        return 'default'
      case 'vacant':
        return 'secondary'
      case 'maintenance':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading properties...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Properties
          </h1>
          <p className="text-lg text-gray-600">
            Manage your property portfolio with modern tools
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{filteredAndSortedProperties.length} properties</span>
            <span>•</span>
            <span>Updated {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search properties by name, location, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 text-base border-gray-300 focus:border-primary-500 focus:ring-primary-500"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="p-6 border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="commercial">Commercial</option>
                  <option value="office">Office</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="land">Land</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="type">Type</option>
                  <option value="location">Location</option>
                  <option value="createdAt">Date Added</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Search: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm('')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterType !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Type: {filterType}
                      <button
                        onClick={() => setFilterType('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterStatus !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Status: {filterStatus}
                      <button
                        onClick={() => setFilterStatus('all')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterType('all')
                      setFilterStatus('all')
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Results Summary and View Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedProperties.length} of {properties.length} properties
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 px-3 ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-200'
              }`}
            >
              <Grid className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-200'
              }`}
            >
              <List className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">List</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Properties Grid/List */}
      <PropertyGrid
        properties={filteredAndSortedProperties}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPropertySelect={handlePropertySelect}
        onPropertyFavorite={handlePropertyFavorite}
        loading={loading}
        loadingCount={6}
      />

      {/* Empty State */}
      {!loading && filteredAndSortedProperties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <MapPin className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'No properties match your criteria' 
              : 'No properties yet'
            }
          </h3>
          <p className="text-gray-600 mb-8 max-w-md">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
              : 'Get started by adding your first property to the system.'
            }
          </p>
          <div className="flex gap-3">
            {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterType('all')
                  setFilterStatus('all')
                }}
              >
                Clear Filters
              </Button>
            )}
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Property Form Modal */}
      <PropertyFormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        property={editingProperty}
        loading={submitLoading}
      />
    </div>
  )
}

export default Properties
