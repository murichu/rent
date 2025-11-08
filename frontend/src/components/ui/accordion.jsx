import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Accordion = ({ children, className, ...props }) => {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  )
}

const AccordionItem = ({ 
  children, 
  className,
  defaultOpen = false,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('border border-gray-200 rounded-lg overflow-hidden', className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isOpen, setIsOpen })
        }
        return child
      })}
    </div>
  )
}

const AccordionTrigger = ({ 
  children, 
  className,
  isOpen,
  setIsOpen,
  ...props 
}) => {
  return (
    <button
      className={cn(
        'w-full px-4 py-3 text-left font-medium flex items-center justify-between',
        'bg-gray-50 hover:bg-gray-100 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
        'min-h-[44px] touch-manipulation',
        className
      )}
      onClick={() => setIsOpen?.(!isOpen)}
      {...props}
    >
      <span className="flex-1">{children}</span>
      <ChevronDown 
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          isOpen && 'rotate-180'
        )} 
      />
    </button>
  )
}

const AccordionContent = ({ 
  children, 
  className,
  isOpen,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200',
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}
      {...props}
    >
      <div className={cn('p-4 bg-white', className)}>
        {children}
      </div>
    </div>
  )
}

// Controlled Accordion for more complex use cases
const ControlledAccordion = ({ 
  items, 
  multiple = false,
  className,
  ...props 
}) => {
  const [openItems, setOpenItems] = useState(new Set())

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems)
    
    if (multiple) {
      if (newOpenItems.has(index)) {
        newOpenItems.delete(index)
      } else {
        newOpenItems.add(index)
      }
    } else {
      if (newOpenItems.has(index)) {
        newOpenItems.clear()
      } else {
        newOpenItems.clear()
        newOpenItems.add(index)
      }
    }
    
    setOpenItems(newOpenItems)
  }

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {items.map((item, index) => (
        <div 
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            className="w-full px-4 py-3 text-left font-medium flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset min-h-[44px] touch-manipulation"
            onClick={() => toggleItem(index)}
          >
            <span className="flex-1">{item.title}</span>
            <ChevronDown 
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                openItems.has(index) && 'rotate-180'
              )} 
            />
          </button>
          
          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              openItems.has(index) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="p-4 bg-white">
              {item.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  ControlledAccordion
}