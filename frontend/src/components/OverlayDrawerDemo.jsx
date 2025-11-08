import React, { useState } from 'react'
import { 
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerContent,
  DrawerFooter,
  MobileNavDrawer,
  FilterDrawer,
  NotificationDrawer
} from './ui/drawer'
import { 
  Overlay,
  ImageGalleryOverlay,
  VideoOverlay,
  ContentPreviewOverlay
} from './ui/overlay'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Input } from './ui/input'
import { 
  Menu, 
  Filter, 
  Bell, 
  Image, 
  Video, 
  FileText,
  Home,
  Building,
  Users,
  Settings,
  BarChart3
} from 'lucide-react'

const OverlayDrawerDemo = () => {
  // Drawer states
  const [basicDrawer, setBasicDrawer] = useState(false)
  const [mobileNavDrawer, setMobileNavDrawer] = useState(false)
  const [filterDrawer, setFilterDrawer] = useState(false)
  const [notificationDrawer, setNotificationDrawer] = useState(false)

  // Overlay states
  const [basicOverlay, setBasicOverlay] = useState(false)
  const [imageGallery, setImageGallery] = useState(false)
  const [videoOverlay, setVideoOverlay] = useState(false)
  const [contentPreview, setContentPreview] = useState(false)

  // Filter state
  const [filters, setFilters] = useState({
    priceRange: [0, 1000],
    propertyType: '',
    bedrooms: '',
    location: ''
  })

  // Sample data
  const navigationItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Properties', href: '/properties', icon: <Building className="w-5 h-5" /> },
    { label: 'Tenants', href: '/tenants', icon: <Users className="w-5 h-5" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
  ]

  const sampleImages = [
    {
      src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      alt: 'Modern apartment living room',
      thumbnail: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=150'
    },
    {
      src: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
      alt: 'Spacious kitchen',
      thumbnail: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=150'
    },
    {
      src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      alt: 'Comfortable bedroom',
      thumbnail: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150'
    }
  ]

  const sampleNotifications = [
    {
      id: 1,
      title: 'New Tenant Application',
      message: 'John Doe has submitted an application for Unit 2A',
      timestamp: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      title: 'Rent Payment Received',
      message: 'Payment of $1,200 received from Jane Smith',
      timestamp: '1 hour ago',
      read: false
    },
    {
      id: 3,
      title: 'Maintenance Request',
      message: 'Plumbing issue reported in Unit 3B',
      timestamp: '3 hours ago',
      read: true
    }
  ]

  const userInfo = {
    name: 'John Manager',
    email: 'john@example.com'
  }

  const handleApplyFilters = () => {
    console.log('Applying filters:', filters)
    setFilterDrawer(false)
  }

  const handleClearFilters = () => {
    setFilters({
      priceRange: [0, 1000],
      propertyType: '',
      bedrooms: '',
      location: ''
    })
  }

  const activeFiltersCount = Object.values(filters).filter(value => 
    Array.isArray(value) ? value[0] !== 0 || value[1] !== 1000 : value !== ''
  ).length

  return (
    <div className="p-8 space-y-8">
      {/* Drawer Demos */}
      <Card>
        <CardHeader>
          <CardTitle>Drawer Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => setBasicDrawer(true)}
              leftIcon={<Menu className="w-4 h-4" />}
            >
              Basic Drawer
            </Button>
            
            <Button 
              onClick={() => setMobileNavDrawer(true)} 
              variant="secondary"
              leftIcon={<Menu className="w-4 h-4" />}
            >
              Mobile Navigation
            </Button>
            
            <Button 
              onClick={() => setFilterDrawer(true)} 
              variant="outline"
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filter Drawer
              {activeFiltersCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            
            <Button 
              onClick={() => setNotificationDrawer(true)} 
              variant="ghost"
              leftIcon={<Bell className="w-4 h-4" />}
            >
              Notifications
              <span className="ml-2 px-2 py-1 bg-error-100 text-error-800 text-xs rounded-full">
                2
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overlay Demos */}
      <Card>
        <CardHeader>
          <CardTitle>Overlay Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={() => setBasicOverlay(true)}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Basic Overlay
            </Button>
            
            <Button 
              onClick={() => setImageGallery(true)} 
              variant="secondary"
              leftIcon={<Image className="w-4 h-4" />}
            >
              Image Gallery
            </Button>
            
            <Button 
              onClick={() => setVideoOverlay(true)} 
              variant="outline"
              leftIcon={<Video className="w-4 h-4" />}
            >
              Video Overlay
            </Button>
            
            <Button 
              onClick={() => setContentPreview(true)} 
              variant="ghost"
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Content Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Drawer */}
      <Drawer
        isOpen={basicDrawer}
        onClose={() => setBasicDrawer(false)}
        position="right"
        size="md"
      >
        <DrawerHeader>
          <DrawerTitle>Basic Drawer</DrawerTitle>
          <DrawerDescription>
            This is a basic drawer with smooth slide animations and proper focus management.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              This drawer demonstrates:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Smooth slide-in animations</li>
              <li>• Backdrop blur effects</li>
              <li>• Focus trap and keyboard navigation</li>
              <li>• Escape key to close</li>
              <li>• Click outside to close</li>
              <li>• Scrollable content area</li>
            </ul>
            
            <div className="space-y-3 pt-4">
              <Input placeholder="Sample input field" />
              <Input placeholder="Another input field" />
              <textarea 
                placeholder="Sample textarea"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </DrawerContent>
        <DrawerFooter>
          <Button variant="outline" onClick={() => setBasicDrawer(false)}>
            Cancel
          </Button>
          <Button onClick={() => setBasicDrawer(false)}>
            Save Changes
          </Button>
        </DrawerFooter>
      </Drawer>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={mobileNavDrawer}
        onClose={() => setMobileNavDrawer(false)}
        navigationItems={navigationItems}
        userInfo={userInfo}
        onLogout={() => console.log('Logout clicked')}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawer}
        onClose={() => setFilterDrawer(false)}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        activeFiltersCount={activeFiltersCount}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.priceRange[0]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priceRange: [parseInt(e.target.value) || 0, prev.priceRange[1]]
                }))}
              />
              <span className="text-gray-500">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.priceRange[1]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priceRange: [prev.priceRange[0], parseInt(e.target.value) || 1000]
                }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Type
            </label>
            <select
              value={filters.propertyType}
              onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="condo">Condo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bedrooms
            </label>
            <select
              value={filters.bedrooms}
              onChange={(e) => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Any</option>
              <option value="1">1 Bedroom</option>
              <option value="2">2 Bedrooms</option>
              <option value="3">3+ Bedrooms</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <Input
              placeholder="Enter location"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
        </div>
      </FilterDrawer>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationDrawer}
        onClose={() => setNotificationDrawer(false)}
        notifications={sampleNotifications}
        onMarkAllRead={() => console.log('Mark all read')}
        onNotificationClick={(notification) => console.log('Clicked notification:', notification)}
      />

      {/* Basic Overlay */}
      <Overlay isOpen={basicOverlay} onClose={() => setBasicOverlay(false)}>
        <div className="bg-white rounded-lg p-8 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4">Basic Overlay</h3>
          <p className="text-gray-600 mb-6">
            This is a basic overlay component with backdrop blur and smooth animations.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setBasicOverlay(false)}>
              Cancel
            </Button>
            <Button onClick={() => setBasicOverlay(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Overlay>

      {/* Image Gallery Overlay */}
      <ImageGalleryOverlay
        isOpen={imageGallery}
        onClose={() => setImageGallery(false)}
        images={sampleImages}
        initialIndex={0}
        showThumbnails={true}
        showControls={true}
        allowDownload={true}
      />

      {/* Video Overlay */}
      <VideoOverlay
        isOpen={videoOverlay}
        onClose={() => setVideoOverlay(false)}
        videoSrc="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        title="Sample Video"
        autoPlay={false}
        controls={true}
      />

      {/* Content Preview Overlay */}
      <ContentPreviewOverlay
        isOpen={contentPreview}
        onClose={() => setContentPreview(false)}
        content="<h1>Sample Document</h1><p>This is a sample document preview in an overlay. You can display HTML content, PDFs, or embed other content types.</p><p>The overlay provides a full-screen experience while maintaining proper focus management and accessibility.</p>"
        title="Document Preview"
        type="html"
      />
    </div>
  )
}

export default OverlayDrawerDemo