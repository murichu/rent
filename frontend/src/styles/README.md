# Haven Design System

A comprehensive design system for the Haven property management platform, inspired by modern booking platforms like Airbnb and Booking.com.

## Overview

The Haven Design System provides a consistent, accessible, and modern foundation for building user interfaces. It includes design tokens, utility classes, and React components that work together to create cohesive user experiences.

## Features

- **Design Tokens**: Comprehensive color, typography, spacing, and animation systems
- **Theme Support**: Light, dark, and high-contrast themes with system preference detection
- **Responsive Design**: Mobile-first approach with consistent breakpoints
- **Accessibility**: WCAG AA compliant with proper focus management and screen reader support
- **Modern Components**: Enhanced UI components with smooth animations and interactions

## Getting Started

### 1. Theme Provider

Wrap your app with the `ThemeProvider` to enable theme switching:

```jsx
import { ThemeProvider } from './components/ThemeProvider'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="haven-ui-theme">
      {/* Your app content */}
    </ThemeProvider>
  )
}
```

### 2. Using Components

Import components from the UI library:

```jsx
import { Button, Card, FormInput } from './components/ui'

function MyComponent() {
  return (
    <Card>
      <FormInput 
        label="Property Name" 
        placeholder="Enter property name"
        required 
      />
      <Button variant="primary" size="lg">
        Save Property
      </Button>
    </Card>
  )
}
```

### 3. Using Design Tokens

Design tokens are available as CSS custom properties:

```css
.my-component {
  color: var(--text-primary);
  background: var(--surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### 4. Typography Classes

Use semantic typography classes:

```jsx
<div>
  <h1 className="text-display-xl">Page Title</h1>
  <h2 className="text-heading-lg">Section Heading</h2>
  <p className="text-body-md">Body content</p>
  <span className="text-caption">Caption text</span>
</div>
```

## Design Tokens

### Colors

- **Primary**: Blue palette for primary actions and branding
- **Secondary**: Slate palette for neutral elements
- **Semantic**: Success (green), Warning (yellow), Error (red), Info (cyan)
- **Gray**: Neutral grays for text and backgrounds

### Typography

- **Display**: Large headings (2xl, xl, lg, md, sm)
- **Heading**: Section headings (xl, lg, md, sm)
- **Body**: Content text (lg, md, sm)
- **Caption**: Small text and labels

### Spacing

Based on a 4px grid system:
- `--space-1` (4px) to `--space-32` (128px)
- Consistent spacing for margins, padding, and gaps

### Shadows

- `--shadow-xs` to `--shadow-2xl`
- Consistent elevation system for cards and overlays

## Components

### Button

Enhanced button component with multiple variants and states:

```jsx
<Button variant="default" size="lg" loading>
  Save Changes
</Button>
```

**Variants**: default, secondary, outline, ghost, link, destructive, success, warning
**Sizes**: xs, sm, default, lg, xl, icon, icon-sm, icon-lg

### Card

Flexible card component with variants:

```jsx
<Card variant="interactive">
  <CardHeader>
    <CardTitle>Property Details</CardTitle>
    <CardDescription>Manage your property information</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Variants**: default, elevated, outlined, ghost, interactive

### Form Inputs

Enhanced input components with validation:

```jsx
<FormInput
  label="Email Address"
  type="email"
  required
  error="Please enter a valid email"
/>

<FloatingInput
  label="Property Description"
  placeholder="Enter description"
/>
```

### Theme Components

```jsx
import { ThemeToggle, ThemeSelector } from './components/ui'

// Simple toggle button
<ThemeToggle />

// Full theme selector
<ThemeSelector />
```

## Utility Classes

### Layout

```css
.container          /* Responsive container */
.grid-cols-1        /* Grid columns */
.gap-4              /* Grid/flex gap */
```

### Spacing

```css
.p-4                /* Padding */
.m-6                /* Margin */
.space-y-2          /* Vertical spacing between children */
```

### Surfaces

```css
.surface-primary    /* Primary surface color */
.surface-secondary  /* Secondary surface color */
```

### Interactive

```css
.interactive-primary    /* Primary interactive element */
.interactive-secondary  /* Secondary interactive element */
```

### Animations

```css
.animate-fade-in    /* Fade in animation */
.animate-slide-up   /* Slide up animation */
.animate-scale-in   /* Scale in animation */
.transition-all     /* Smooth transitions */
```

## Theme System

The design system supports multiple themes:

- **Light**: Default light theme
- **Dark**: Dark theme for low-light environments
- **System**: Automatically follows system preference
- **High Contrast**: Enhanced contrast for accessibility

Themes are applied by adding classes to the root element:
- `.light`
- `.dark`
- `.high-contrast`

## Responsive Design

Mobile-first responsive design with consistent breakpoints:

- `sm`: 640px and up
- `md`: 768px and up
- `lg`: 1024px and up
- `xl`: 1280px and up
- `2xl`: 1536px and up

## Accessibility

The design system follows WCAG AA guidelines:

- Proper color contrast ratios
- Focus management and keyboard navigation
- Screen reader compatibility
- Touch target sizes (minimum 44px)
- Semantic HTML structure

## Best Practices

1. **Use semantic components**: Prefer `FormInput` over raw `Input` for better UX
2. **Consistent spacing**: Use design token spacing values
3. **Theme awareness**: Test components in both light and dark themes
4. **Mobile-first**: Design for mobile devices first, then enhance for larger screens
5. **Accessibility**: Always include proper labels, alt text, and ARIA attributes

## Demo

To see all components in action, import and use the `DesignSystemDemo` component:

```jsx
import DesignSystemDemo from './components/DesignSystemDemo'

// Render the demo page
<DesignSystemDemo />
```

This provides a comprehensive showcase of all design system components and patterns.