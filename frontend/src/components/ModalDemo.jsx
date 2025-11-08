import React, { useState } from 'react'
import { 
  Modal, 
  ModalHeader, 
  ModalTitle, 
  ModalDescription, 
  ModalContent, 
  ModalFooter,
  ConfirmationModal 
} from './ui/modal'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Input } from './ui/input'

const ModalDemo = () => {
  const [basicModal, setBasicModal] = useState(false)
  const [formModal, setFormModal] = useState(false)
  const [confirmModal, setConfirmModal] = useState(false)
  const [largeModal, setLargeModal] = useState(false)
  const [fullModal, setFullModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setLoading(false)
    setFormModal(false)
    setFormData({ name: '', email: '', message: '' })
  }

  const handleConfirm = async () => {
    setLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setLoading(false)
    setConfirmModal(false)
  }

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modal Component Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button onClick={() => setBasicModal(true)}>
              Basic Modal
            </Button>
            
            <Button onClick={() => setFormModal(true)} variant="secondary">
              Form Modal
            </Button>
            
            <Button onClick={() => setConfirmModal(true)} variant="outline">
              Confirmation Modal
            </Button>
            
            <Button onClick={() => setLargeModal(true)} variant="ghost">
              Large Modal
            </Button>
            
            <Button onClick={() => setFullModal(true)} variant="destructive">
              Full Screen Modal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Modal */}
      <Modal
        isOpen={basicModal}
        onClose={() => setBasicModal(false)}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Basic Modal</ModalTitle>
          <ModalDescription>
            This is a basic modal with smooth animations and proper focus management.
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <p className="text-gray-600">
            This modal demonstrates the basic functionality including:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>• Smooth entrance and exit animations</li>
            <li>• Backdrop blur effects</li>
            <li>• Focus trap and keyboard navigation</li>
            <li>• Escape key to close</li>
            <li>• Click outside to close</li>
            <li>• Proper z-index layering</li>
          </ul>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setBasicModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => setBasicModal(false)}>
            Got it
          </Button>
        </ModalFooter>
      </Modal>

      {/* Form Modal */}
      <Modal
        isOpen={formModal}
        onClose={() => setFormModal(false)}
        size="lg"
        closeOnBackdropClick={false}
      >
        <ModalHeader>
          <ModalTitle>Contact Form</ModalTitle>
          <ModalDescription>
            Fill out the form below to send us a message.
          </ModalDescription>
        </ModalHeader>
        <form onSubmit={handleFormSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setFormModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              loadingText="Sending..."
            >
              Send Message
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        onConfirm={handleConfirm}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={loading}
      />

      {/* Large Modal with Scrollable Content */}
      <Modal
        isOpen={largeModal}
        onClose={() => setLargeModal(false)}
        size="2xl"
      >
        <ModalHeader>
          <ModalTitle>Large Modal with Scrollable Content</ModalTitle>
          <ModalDescription>
            This modal demonstrates internal scrolling for long content.
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-6">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900">Section {i + 1}</h3>
                <p className="text-gray-600 mt-2">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
                  veniam, quis nostrud exercitation ullamco laboris.
                </p>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button onClick={() => setLargeModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Full Screen Modal */}
      <Modal
        isOpen={fullModal}
        onClose={() => setFullModal(false)}
        size="full"
        blur="lg"
      >
        <ModalHeader>
          <ModalTitle>Full Screen Modal</ModalTitle>
          <ModalDescription>
            This modal takes up the entire viewport.
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Full Screen Experience
              </h2>
              <p className="text-gray-600 max-w-md">
                This modal demonstrates how to create immersive full-screen experiences
                while maintaining proper focus management and accessibility.
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button onClick={() => setFullModal(false)}>
            Exit Full Screen
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

export default ModalDemo