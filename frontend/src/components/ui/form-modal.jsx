import React, { useState, useEffect, useCallback } from 'react'
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription, 
  ModalContent, 
  ModalFooter 
} from './modal'
import { Button } from './button'
import { Input } from './input'
import { cn } from '@/lib/utils'
import { AlertCircle, Save, Clock } from 'lucide-react'

// Hook for auto-save functionality
const useAutoSave = (data, onSave, delay = 2000) => {
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  const debouncedSave = useCallback(
    debounce(async (dataToSave) => {
      if (!isDirty) return
      
      setIsSaving(true)
      try {
        await onSave(dataToSave)
        setLastSaved(new Date())
        setIsDirty(false)
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setIsSaving(false)
      }
    }, delay),
    [onSave, delay, isDirty]
  )

  useEffect(() => {
    if (isDirty) {
      debouncedSave(data)
    }
  }, [data, debouncedSave, isDirty])

  const markDirty = () => setIsDirty(true)

  return { isSaving, lastSaved, markDirty }
}

// Debounce utility function
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Enhanced Form Field component with validation
const FormField = React.forwardRef(({
  label,
  error,
  required = false,
  children,
  className,
  ...props
}, ref) => (
  <div className={cn("space-y-1", className)} {...props}>
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>
    )}
    {children}
    {error && (
      <div className="flex items-center gap-1 text-sm text-error-600">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </div>
))
FormField.displayName = "FormField"

// Enhanced Select component
const Select = React.forwardRef(({
  options = [],
  placeholder = "Select an option...",
  className,
  error,
  ...props
}, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
      error && "border-error-500 focus:ring-error-500 focus:border-error-500",
      className
    )}
    {...props}
  >
    {placeholder && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
))
Select.displayName = "Select"

// Enhanced Textarea component
const Textarea = React.forwardRef(({
  className,
  error,
  ...props
}, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-vertical",
      error && "border-error-500 focus:ring-error-500 focus:border-error-500",
      className
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

// Auto-save indicator component
const AutoSaveIndicator = ({ isSaving, lastSaved }) => {
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Save className="h-4 w-4 animate-pulse" />
        <span>Saving...</span>
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>
          Saved {formatRelativeTime(lastSaved)}
        </span>
      </div>
    )
  }

  return null
}

// Format relative time utility
const formatRelativeTime = (date) => {
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

// Main Enhanced Form Modal component
const FormModal = React.forwardRef(({
  isOpen,
  onClose,
  onSubmit,
  onAutoSave,
  title,
  description,
  size = "lg",
  loading = false,
  submitText = "Save",
  cancelText = "Cancel",
  enableAutoSave = false,
  autoSaveDelay = 2000,
  closeOnBackdropClick = false,
  children,
  className,
  ...props
}, ref) => {
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Auto-save functionality
  const { isSaving, lastSaved, markDirty } = useAutoSave(
    formData,
    onAutoSave || (() => {}),
    autoSaveDelay
  )

  // Handle form data changes
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    if (enableAutoSave) {
      markDirty()
    }
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await onSubmit?.(formData)
      setHasUnsavedChanges(false)
      setErrors({})
    } catch (error) {
      if (error.validationErrors) {
        setErrors(error.validationErrors)
      }
    }
  }

  // Handle modal close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges && !enableAutoSave) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirmClose) return
    }
    
    setFormData({})
    setErrors({})
    setHasUnsavedChanges(false)
    onClose?.()
  }

  // Provide form context to children
  const formContext = {
    formData,
    errors,
    updateFormData,
    setErrors
  }

  return (
    <Modal
      ref={ref}
      isOpen={isOpen}
      onClose={handleClose}
      size={size}
      closeOnBackdropClick={closeOnBackdropClick}
      className={className}
      {...props}
    >
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center justify-between">
            <div>
              <ModalTitle>{title}</ModalTitle>
              {description && (
                <ModalDescription>{description}</ModalDescription>
              )}
            </div>
            {enableAutoSave && (
              <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
            )}
          </div>
        </ModalHeader>

        <ModalContent scrollable>
          {typeof children === 'function' ? children(formContext) : children}
        </ModalContent>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={isSaving}
          >
            {submitText}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
})
FormModal.displayName = "FormModal"

// Property Form Modal - specific implementation for properties
const PropertyFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  property = null,
  loading = false
}) => {
  const isEditing = !!property

  const propertyTypes = [
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'HOUSE', label: 'House' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'LAND', label: 'Land' },
    { value: 'OTHER', label: 'Other' }
  ]

  const handleSubmit = async (formData) => {
    // Validate required fields
    const errors = {}
    if (!formData.name?.trim()) errors.name = 'Property name is required'
    if (!formData.address?.trim()) errors.address = 'Address is required'
    if (!formData.type) errors.type = 'Property type is required'

    if (Object.keys(errors).length > 0) {
      throw { validationErrors: errors }
    }

    await onSubmit(formData)
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? 'Edit Property' : 'Add New Property'}
      description={isEditing ? 'Update property information' : 'Create a new property in your portfolio'}
      loading={loading}
      submitText={isEditing ? 'Update Property' : 'Create Property'}
      enableAutoSave={true}
      size="xl"
    >
      {({ formData, errors, updateFormData }) => {
        // Initialize form data with property values if editing
        React.useEffect(() => {
          if (property && isEditing) {
            updateFormData('name', property.name || '')
            updateFormData('address', property.address || '')
            updateFormData('type', property.type || '')
            updateFormData('totalUnits', property.totalUnits || '')
            updateFormData('description', property.description || '')
          }
        }, [property, isEditing])

        return (
          <div className="space-y-6">
            <FormField
              label="Property Name"
              required
              error={errors.name}
            >
              <Input
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="e.g., Sunset Apartments"
                error={!!errors.name}
              />
            </FormField>

            <FormField
              label="Address"
              required
              error={errors.address}
            >
              <Input
                value={formData.address || ''}
                onChange={(e) => updateFormData('address', e.target.value)}
                placeholder="e.g., 123 Main Street, Nairobi"
                error={!!errors.address}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Property Type"
                required
                error={errors.type}
              >
                <Select
                  value={formData.type || ''}
                  onChange={(e) => updateFormData('type', e.target.value)}
                  options={propertyTypes}
                  placeholder="Select property type"
                  error={!!errors.type}
                />
              </FormField>

              <FormField
                label="Total Units"
                error={errors.totalUnits}
              >
                <Input
                  type="number"
                  min="1"
                  value={formData.totalUnits || ''}
                  onChange={(e) => updateFormData('totalUnits', e.target.value)}
                  placeholder="e.g., 20"
                  error={!!errors.totalUnits}
                />
              </FormField>
            </div>

            <FormField
              label="Description"
              error={errors.description}
            >
              <Textarea
                value={formData.description || ''}
                onChange={(e) => updateFormData('description', e.target.value)}
                placeholder="Additional details about the property..."
                rows={4}
                error={!!errors.description}
              />
            </FormField>
          </div>
        )
      }}
    </FormModal>
  )
}

export {
  FormModal,
  FormField,
  Select,
  Textarea,
  AutoSaveIndicator,
  PropertyFormModal
}