import React from 'react';
import { Link } from 'react-router-dom';
import HavenLogo from './Logo/HavenLogo';

const Footer = () => (
  <footer 
    className="bg-gray-800 dark:bg-gray-900 text-white mt-auto border-t border-gray-700"
    role="contentinfo"
    aria-label="Site footer"
  >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Company Info */}
        <div>
          <div className="mb-4">
            <HavenLogo size="md" showText={true} />
          </div>
          <p className="text-gray-400 text-sm">
            Comprehensive property rental management solution for modern property managers.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/properties" className="text-gray-400 hover:text-white transition-colors">
                Properties
              </Link>
            </li>
            <li>
              <Link to="/settings" className="text-gray-400 hover:text-white transition-colors">
                Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Support</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>Email: support@propertymanager.com</li>
            <li>Phone: +1 (555) 123-4567</li>
            <li>Hours: Mon-Fri 9AM-5PM</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} Haven - Property Management System. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
