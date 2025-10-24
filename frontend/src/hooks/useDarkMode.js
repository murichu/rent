import { useEffect } from 'react';
import { useUIStore } from '../store/index.js';

/**
 * Dark Mode Hook
 * Provides dark mode functionality with system preference detection
 */
export const useDarkMode = () => {
  const { theme, setTheme } = useUIStore();

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Detect system preference on mount
  useEffect(() => {
    if (theme === 'system' || !theme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        const root = document.documentElement;
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      // Set initial theme based on system preference
      handleChange(mediaQuery);
      
      // Listen for changes
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const setSystemTheme = () => {
    setTheme('system');
  };

  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme,
    setSystemTheme,
  };
};

export default useDarkMode;