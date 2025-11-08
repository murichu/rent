import React from 'react'
import { FormModal, FormField, Select } from './form-modal'
import { Input } from './input'

// Tenant Form Modal - specific implementation for tenants
const TenantFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  tenant = null,
  loading = false,
  properties = []
}) => {
  const isEditing = !!tenant

  const handleSubmit = async (formData) => {
    // Validate required fields
    const errors = {}
    if (!formData.name?.trim()) errors.name = 'Tenant name is required'
    if (!formData.email?.trim()) errors.email = 'Email is required'
    if (!formData.phone?.trim()) errors.phone = 'Phone number is required'
    if (!formData.propertyId) errors.propertyId = 'Property selection is required'

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (Object.keys(errors).length > 0) {
      throw { validationErrors: errors }
    }

    await onSubmit(formData)
  }

  const propertyOptions = properties.map(property => ({
    value: property.id,
    label: property.name
  }))

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? 'Edit Tenant' : 'Add New Tenant'}
      description={isEditing ? 'Update tenant information' : 'Add a new tenant to your property'}
      loading={loading}
      submitText={isEditing ? 'Update Tenant' : 'Add Tenant'}
      enableAutoSave={true}
      size="lg"
    >
      {({ formData, errors, updateFormData }) => {
        // Initialize form data with tenant values if editing
        React.useEffect(() => {
          if (tenant && isEditing) {
            updateFormData('name', tenant.name || '')
            updateFormData('email', tenant.email || '')
            updateFormData('phone', tenant.phone || '')
            updateFormData('propertyId', tenant.propertyId || '')
            updateFormData('unitNumber', tenant.unitNumber || '')
            updateFormData('leaseStart', tenant.leaseStart || '')
            updateFormData('leaseEnd', tenant.leaseEnd || '')
            updateFormData('rentAmount', tenant.rentAmount || '')
            updateFormData('depositAmount', tenant.depositAmount || '')
            updateFormData('emergencyContact', tenant.emergencyContact || '')
            updateFormData('notes', tenant.notes || '')
          }
        }, [tenant, isEditing])

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Full Name"
                required
                error={errors.name}
              >
                <Input
                  value={formData.name || ''}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  placeholder="Enter tenant's full name"
                  error={!!errors.name}
                />
              </FormField>

              <FormField
                label="Email Address"
                required
                error={errors.email}
              >
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="tenant@example.com"
                  error={!!errors.email}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Phone Number"
                required
                error={errors.phone}
              >
                <Input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="+254 700 000 000"
                  error={!!errors.phone}
                />
              </FormField>

              <FormField
                label="Property"
                required
                error={errors.propertyId}
              >
                <Select
                  value={formData.propertyId || ''}
                  onChange={(e) => updateFormData('propertyId', e.target.value)}
                  options={propertyOptions}
                  placeholder="Select a property"
                  error={!!errors.propertyId}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                label="Unit Number"
                error={errors.unitNumber}
              >
                <Input
                  value={formData.unitNumber || ''}
                  onChange={(e) => updateFormData('unitNumber', e.target.value)}
                  placeholder="e.g., A101"
                  error={!!errors.unitNumber}
                />
              </FormField>

              <FormField
                label="Lease Start Date"
                error={errors.leaseStart}
              >
                <Input
                  type="date"
                  value={formData.leaseStart || ''}
                  onChange={(e) => updateFormData('leaseStart', e.target.value)}
                  error={!!errors.leaseStart}
                />
              </FormField>

              <FormField
                label="Lease End Date"
                error={errors.leaseEnd}
              >
                <Input
                  type="date"
                  value={formData.leaseEnd || ''}
                  onChange={(e) => updateFormData('leaseEnd', e.target.value)}
                  error={!!errors.leaseEnd}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Monthly Rent Amount"
                error={errors.rentAmount}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rentAmount || ''}
                  onChange={(e) => updateFormData('rentAmount', e.target.value)}
                  placeholder="0.00"
                  error={!!errors.rentAmount}
                />
              </FormField>

              <FormField
                label="Security Deposit"
                error={errors.depositAmount}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.depositAmount || ''}
                  onChange={(e) => updateFormData('depositAmount', e.target.value)}
                  placeholder="0.00"
                  error={!!errors.depositAmount}
                />
              </FormField>
            </div>

            <FormField
              label="Emergency Contact"
              error={errors.emergencyContact}
            >
              <Input
                value={formData.emergencyContact || ''}
                onChange={(e) => updateFormData('emergencyContact', e.target.value)}
                placeholder="Emergency contact name and phone"
                error={!!errors.emergencyContact}
              />
            </FormField>

            <FormField
              label="Notes"
              error={errors.notes}
            >
              <textarea
                value={formData.notes || ''}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Additional notes about the tenant..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-vertical"
              />
            </FormField>
          </div>
        )
      }}
    </FormModal>
  )
}

export { TenantFormModal }