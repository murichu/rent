import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';
import NotificationCenter from './Notifications/NotificationCenter';
import CommandPalette from './Search/CommandPalette';
import LanguageSwitcher from './Settings/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊', auth: true },
    { to: '/properties', label: 'Properties', icon: '🏢', auth: true },
    { to: '/maintenance', label: 'Maintenance', icon: '🔧', auth: true },
    { to: '/settings', label: 'Settings', icon: '⚙️', auth: true },
  ];

  const publicLinks = [
    { to: '/login', label: 'Login', icon: '🔑' },
    { to: '/signup', label: 'Sign Up', icon: '✍️' },
  ];

  return (
    <nav 
      className="bg-gray-800 dark:bg-gray-900 text-white shadow-lg sticky top-0 z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-xl font-bold hover:text-blue-400 transition-colors"
            aria-label="Home"
          >
            <span className="text-2xl">🏠</span>
            <span className="hidden sm:inline">Property Manager</span>
            <span className="sm:hidden">PM</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Command Palette */}
            <CommandPalette />
            
            {isLoggedIn ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors flex items-center space-x-1"
                    aria-label={link.label}
                  >
                    <span aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center space-x-1"
                  aria-label="Logout"
                >
                  <span aria-hidden="true">🚪</span>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors flex items-center space-x-1"
                    aria-label={link.label}
                  >
                    <span aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}
              </>
            )}
            
            {/* Notifications */}
            {isLoggedIn && (
              <button
                onClick={() => setIsNotificationOpen(true)}
                className="relative p-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            
            <div className="ml-2">
              <DarkModeToggle />
            </div>
          </div>
          
          {/* Notification Center */}
          <NotificationCenter 
            isOpen={isNotificationOpen} 
            onClose={() => setIsNotificationOpen(false)} 
          />

          {/* Mobile menu button */}
          <div className="flex items-center space-x-2 md:hidden">
            <DarkModeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-700 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-700 dark:bg-gray-800" role="menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isLoggedIn ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                    role="menuitem"
                  >
                    <span aria-hidden="true">{link.icon}</span> {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium hover:bg-red-600 transition-colors"
                  role="menuitem"
                >
                  <span aria-hidden="true">🚪</span> Logout
                </button>
              </>
            ) : (
              <>
                {publicLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                    role="menuitem"
                  >
                    <span aria-hidden="true">{link.icon}</span> {link.label}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
