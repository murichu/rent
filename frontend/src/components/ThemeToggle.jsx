import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Theme Toggle Component
 * Provides a user-friendly interface for switching between light, dark, and system themes
 */
const ThemeToggle = ({ className = '', showLabels = false, size = 'md' }) => {
  const { themeMode, setTheme, isDarkMode } = useTheme();

  const themes = [
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light theme'
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme'
    },
    {
      id: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference'
    }
  ];

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  if (showLabels) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = themeMode === theme.id;
          
          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              title={theme.description}
            >
              <Icon size={iconSizes[size]} />
              <span className="text-sm font-medium">{theme.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact toggle button
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => {
          const currentIndex = themes.findIndex(t => t.id === themeMode);
          const nextIndex = (currentIndex + 1) % themes.length;
          setTheme(themes[nextIndex].id);
        }}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center rounded-lg transition-all duration-200
          bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
          text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100
          border border-gray-200 dark:border-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        `}
        title={`Current: ${themes.find(t => t.id === themeMode)?.label}. Click to cycle themes.`}
      >
        {themeMode === 'light' && <Sun size={iconSizes[size]} />}
        {themeMode === 'dark' && <Moon size={iconSizes[size]} />}
        {themeMode === 'system' && <Monitor size={iconSizes[size]} />}
      </button>
    </div>
  );
};

/**
 * Simple Dark Mode Toggle (legacy compatibility)
 */
export const DarkModeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200
        bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
        text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100
        border border-gray-200 dark:border-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        ${className}
      `}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

/**
 * Theme Selector Dropdown
 */
export const ThemeSelector = ({ className = '' }) => {
  const { themeMode, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themes = [
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light theme'
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme'
    },
    {
      id: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference'
    }
  ];

  const currentTheme = themes.find(t => t.id === themeMode);
  const CurrentIcon = currentTheme?.icon || Monitor;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
          bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700
          text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        "
      >
        <CurrentIcon size={16} />
        <span className="text-sm font-medium">{currentTheme?.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="
            absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
            border border-gray-200 dark:border-gray-700 z-20
          ">
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isActive = themeMode === theme.id;
              
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                    ${theme.id === themes[0].id ? 'rounded-t-lg' : ''}
                    ${theme.id === themes[themes.length - 1].id ? 'rounded-b-lg' : ''}
                  `}
                >
                  <Icon size={16} />
                  <div>
                    <div className="font-medium">{theme.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {theme.description}
                    </div>
                  </div>
                  {isActive && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeToggle;