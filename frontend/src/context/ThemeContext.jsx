import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('themeMode');
    return saved || 'system'; // 'light', 'dark', or 'system'
  });

  const [isDarkMode, setIsDarkMode] = useState(false);

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (themeMode === 'system') {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // Apply theme
  useEffect(() => {
    let shouldBeDark = false;

    if (themeMode === 'dark') {
      shouldBeDark = true;
    } else if (themeMode === 'light') {
      shouldBeDark = false;
    } else {
      // system
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDarkMode(shouldBeDark);

    // Update localStorage
    localStorage.setItem('themeMode', themeMode);
    
    // Update document class
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  const setTheme = (mode) => {
    setThemeMode(mode); // 'light', 'dark', or 'system'
  };

  const toggleDarkMode = () => {
    // Toggle between light and dark (skip system for toggle)
    setThemeMode(isDarkMode ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      themeMode, 
      setTheme, 
      toggleDarkMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
