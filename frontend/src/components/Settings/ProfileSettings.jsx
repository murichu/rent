import React from 'react';
import { Globe, Clock, Calendar, DollarSign } from 'lucide-react';
import CurrencySelector from '../CurrencySelector';

const ProfileSettings = ({ settings, updateSetting }) => {
  const timezones = [
    { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
    { value: 'Africa/Cairo', label: 'Cairo (EET)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'sw', label: 'Kiswahili' },
    { value: 'fr', label: 'Français' },
    { value: 'ar', label: 'العربية' },
  ];



  const dateFormats = [
    { value: 'DD/MM/YYYY', label: '31/12/2024' },
    { value: 'MM/DD/YYYY', label: '12/31/2024' },
    { value: 'YYYY-MM-DD', label: '2024-12-31' },
    { value: 'DD-MM-YYYY', label: '31-12-2024' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Profile & Localization
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure your personal preferences and regional settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Globe className="h-4 w-4 mr-2" />
            Language
          </label>
          <select
            value={settings.language || 'en'}
            onChange={(e) => updateSetting('language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Clock className="h-4 w-4 mr-2" />
            Timezone
          </label>
          <select
            value={settings.timezone || 'Africa/Nairobi'}
            onChange={(e) => updateSetting('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Format */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4 mr-2" />
            Date Format
          </label>
          <select
            value={settings.dateFormat || 'DD/MM/YYYY'}
            onChange={(e) => updateSetting('dateFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {dateFormats.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </div>

        {/* Time Format */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Clock className="h-4 w-4 mr-2" />
            Time Format
          </label>
          <select
            value={settings.timeFormat || '24h'}
            onChange={(e) => updateSetting('timeFormat', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="12h">12 Hour (2:30 PM)</option>
            <option value="24h">24 Hour (14:30)</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <DollarSign className="h-4 w-4 mr-2" />
            Currency
          </label>
          <CurrencySelector
            value={settings.currency || 'KES'}
            onChange={(currency) => updateSetting('currency', currency)}
            placeholder="Select your preferred currency"
            showPopular={true}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This will be used for displaying amounts throughout the application
          </p>
        </div>

        {/* Items Per Page */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Items Per Page
          </label>
          <select
            value={settings.itemsPerPage || 10}
            onChange={(e) => updateSetting('itemsPerPage', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value={5}>5 items</option>
            <option value={10}>10 items</option>
            <option value={25}>25 items</option>
            <option value={50}>50 items</option>
            <option value={100}>100 items</option>
          </select>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Contact Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Contact Email
            </label>
            <input
              type="email"
              value={settings.contactEmail || ''}
              onChange={(e) => updateSetting('contactEmail', e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Contact Phone
            </label>
            <input
              type="tel"
              value={settings.contactPhone || ''}
              onChange={(e) => updateSetting('contactPhone', e.target.value)}
              placeholder="+254 700 000 000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;