import React from 'react'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  FormInput,
  FloatingInput,
  ThemeToggle,
  ThemeSelector
} from './ui'

const DesignSystemDemo = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-display-lg text-gray-900">Haven Design System</h1>
          <p className="text-body-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive design system built for modern property management interfaces, 
            inspired by leading booking platforms.
          </p>
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>
              Our semantic color system with light and dark theme support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <h4 className="text-heading-sm">Primary</h4>
                <div className="space-y-1">
                  <div className="h-12 bg-primary-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">500</div>
                  <div className="h-8 bg-primary-400 rounded flex items-center justify-center text-white text-xs">400</div>
                  <div className="h-8 bg-primary-600 rounded flex items-center justify-center text-white text-xs">600</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-heading-sm">Success</h4>
                <div className="space-y-1">
                  <div className="h-12 bg-success-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">500</div>
                  <div className="h-8 bg-success-100 rounded flex items-center justify-center text-success-700 text-xs">100</div>
                  <div className="h-8 bg-success-600 rounded flex items-center justify-center text-white text-xs">600</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-heading-sm">Warning</h4>
                <div className="space-y-1">
                  <div className="h-12 bg-warning-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">500</div>
                  <div className="h-8 bg-warning-100 rounded flex items-center justify-center text-warning-700 text-xs">100</div>
                  <div className="h-8 bg-warning-600 rounded flex items-center justify-center text-white text-xs">600</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-heading-sm">Error</h4>
                <div className="space-y-1">
                  <div className="h-12 bg-error-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">500</div>
                  <div className="h-8 bg-error-100 rounded flex items-center justify-center text-error-700 text-xs">100</div>
                  <div className="h-8 bg-error-600 rounded flex items-center justify-center text-white text-xs">600</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>
              Consistent typography scale with semantic classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h2 className="text-display-2xl">Display 2XL</h2>
                <h2 className="text-display-xl">Display XL</h2>
                <h2 className="text-display-lg">Display Large</h2>
                <h3 className="text-heading-xl">Heading XL</h3>
                <h4 className="text-heading-lg">Heading Large</h4>
                <h5 className="text-heading-md">Heading Medium</h5>
                <h6 className="text-heading-sm">Heading Small</h6>
              </div>
              <div>
                <p className="text-body-lg">Body Large - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                <p className="text-body-md">Body Medium - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                <p className="text-body-sm">Body Small - Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                <p className="text-caption">Caption Text - Lorem ipsum dolor sit amet</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>
              Interactive button components with multiple variants and states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="text-heading-sm mb-4">Variants</h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="warning">Warning</Button>
                </div>
              </div>
              <div>
                <h4 className="text-heading-sm mb-4">Sizes</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>
              </div>
              <div>
                <h4 className="text-heading-sm mb-4">States</h4>
                <div className="flex flex-wrap gap-3">
                  <Button>Normal</Button>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Form Inputs</CardTitle>
            <CardDescription>
              Enhanced input components with validation states and floating labels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormInput
                  label="Standard Input"
                  placeholder="Enter your name"
                  helperText="This is a helper text"
                />
                <FormInput
                  label="Required Field"
                  placeholder="Required field"
                  required
                />
                <FormInput
                  label="Error State"
                  placeholder="Invalid input"
                  error="This field has an error"
                />
                <FormInput
                  label="Success State"
                  placeholder="Valid input"
                  success="This field is valid"
                />
              </div>
              <div className="space-y-4">
                <FloatingInput
                  label="Floating Label"
                  placeholder="Enter text"
                />
                <FloatingInput
                  label="Email Address"
                  type="email"
                  placeholder="Enter email"
                />
                <FormInput
                  label="Large Input"
                  size="lg"
                  placeholder="Large size input"
                />
                <FormInput
                  label="Small Input"
                  size="sm"
                  placeholder="Small size input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Card Components</CardTitle>
            <CardDescription>
              Flexible card components with different variants and states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <Card variant="default">
                <CardHeader>
                  <CardTitle size="sm">Default Card</CardTitle>
                  <CardDescription>
                    A standard card with subtle shadow and border.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm">Card content goes here.</p>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle size="sm">Elevated Card</CardTitle>
                  <CardDescription>
                    An elevated card with more prominent shadow.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm">Card content goes here.</p>
                </CardContent>
              </Card>

              <Card variant="interactive">
                <CardHeader>
                  <CardTitle size="sm">Interactive Card</CardTitle>
                  <CardDescription>
                    A card that responds to hover with scale animation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body-sm">Card content goes here.</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Theme Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Theme System</CardTitle>
            <CardDescription>
              Light, dark, and high contrast theme support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DesignSystemDemo