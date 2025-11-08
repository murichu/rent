import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useResponsive, useTouch } from '../hooks/useResponsive'

const ResponsiveLayoutTest = () => {
  const [testResults, setTestResults] = useState({})
  const { windowSize, breakpoint, isMobile, isTablet, isDesktop } = useResponsive()
  const isTouch = useTouch()

  const runTouchTargetTest = () => {
    const buttons = document.querySelectorAll('button')
    const inputs = document.querySelectorAll('input')
    const links = document.querySelectorAll('a')
    
    const results = {
      buttons: [],
      inputs: [],
      links: []
    }

    // Test buttons
    buttons.forEach((button, index) => {
      const rect = button.getBoundingClientRect()
      const meetsRequirement = rect.height >= 44 && rect.width >= 44
      results.buttons.push({
        index,
        height: rect.height,
        width: rect.width,
        passes: meetsRequirement
      })
    })

    // Test inputs
    inputs.forEach((input, index) => {
      const rect = input.getBoundingClientRect()
      const meetsRequirement = rect.height >= 44
      results.inputs.push({
        index,
        height: rect.height,
        width: rect.width,
        passes: meetsRequirement
      })
    })

    // Test links
    links.forEach((link, index) => {
      const rect = link.getBoundingClientRect()
      const meetsRequirement = rect.height >= 44 && rect.width >= 44
      results.links.push({
        index,
        height: rect.height,
        width: rect.width,
        passes: meetsRequirement
      })
    })

    setTestResults(results)
  }

  const testSwipeGesture = () => {
    // Simulate a swipe gesture on mobile sidebar
    const sidebar = document.querySelector('[data-testid="mobile-sidebar"]')
    if (sidebar) {
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 50, clientY: 100 }]
      })
      const touchEnd = new TouchEvent('touchend', {})

      sidebar.dispatchEvent(touchStart)
      setTimeout(() => sidebar.dispatchEvent(touchMove), 50)
      setTimeout(() => sidebar.dispatchEvent(touchEnd), 100)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-2xl font-bold mb-4">Mobile-First Responsive Layout Test</h2>
        
        {/* Responsive Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Screen Info</h3>
            <p>Width: {windowSize.width}px</p>
            <p>Height: {windowSize.height}px</p>
            <p>Breakpoint: {breakpoint}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Device Type</h3>
            <p>Mobile: {isMobile ? '✅' : '❌'}</p>
            <p>Tablet: {isTablet ? '✅' : '❌'}</p>
            <p>Desktop: {isDesktop ? '✅' : '❌'}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Touch Support</h3>
            <p>Touch Device: {isTouch ? '✅' : '❌'}</p>
          </div>
        </div>

        {/* Touch Target Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Touch Target Tests</h3>
          <Button onClick={runTouchTargetTest} className="mb-4">
            Run Touch Target Test
          </Button>
          
          {Object.keys(testResults).length > 0 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Buttons ({testResults.buttons?.length || 0})</h4>
                <p className="text-sm text-gray-600">
                  Passing: {testResults.buttons?.filter(b => b.passes).length || 0} / {testResults.buttons?.length || 0}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Inputs ({testResults.inputs?.length || 0})</h4>
                <p className="text-sm text-gray-600">
                  Passing: {testResults.inputs?.filter(i => i.passes).length || 0} / {testResults.inputs?.length || 0}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Links ({testResults.links?.length || 0})</h4>
                <p className="text-sm text-gray-600">
                  Passing: {testResults.links?.filter(l => l.passes).length || 0} / {testResults.links?.length || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sample Interactive Elements */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Sample Interactive Elements</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small Button</Button>
              <Button size="default">Default Button</Button>
              <Button size="lg">Large Button</Button>
              <Button size="icon">
                <span>🏠</span>
              </Button>
            </div>
            
            <div className="space-y-2">
              <Input placeholder="Small input" size="sm" />
              <Input placeholder="Default input" size="default" />
              <Input placeholder="Large input" size="lg" />
            </div>
          </div>
        </div>

        {/* Responsive Layout Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Responsive Layout Tests</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <p className="text-sm">Always visible</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center mobile-hidden">
              <p className="text-sm">Hidden on mobile</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-lg text-center tablet-hidden">
              <p className="text-sm">Hidden on tablet</p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg text-center desktop-hidden">
              <p className="text-sm">Hidden on desktop</p>
            </div>
          </div>
        </div>

        {/* Gesture Tests */}
        {(isMobile || isTablet) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Gesture Tests</h3>
            <div className="space-y-2">
              <Button onClick={testSwipeGesture}>
                Test Swipe Gesture
              </Button>
              <p className="text-sm text-gray-600">
                This will simulate a swipe gesture on the mobile sidebar
              </p>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Swipe Instructions:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Swipe right from left edge to open mobile menu</li>
                  <li>• Swipe left on mobile sidebar to close it</li>
                  <li>• Swipe down to hide floating action button</li>
                  <li>• Swipe up to show floating action button</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Height Test */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Viewport Height Test</h3>
          <div className="h-screen-mobile bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg p-4 flex items-center justify-center">
            <p className="text-center">
              This div uses mobile-safe viewport height<br />
              <span className="text-sm text-gray-600">
                Should fill the screen height properly on mobile browsers
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResponsiveLayoutTest