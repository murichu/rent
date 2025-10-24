import React from 'react';
import ThemeToggle from '../ThemeToggle';
import { Monitor, Layout, Eye } from 'lucide-react';

const AppearanceSettings = ({ settings, updateSetting }) => {
  const dashboardLayouts = [
    { value: 'default', label: 'Default', description: 'Standard layout with all widgets' },
    { value: 'compact', label: 'Compact', description: 'Condensed layout for smaller screens' },
    { value: 'detailed', label: 'Detailed', description: 'Expanded layout with more information' },
  ];

  const defaultViews = [
    { value: 'dashboard', label: 'Dashboard', description: 'Overview of all activities' },
    { value: 'properties', label: 'Properties', description: 'Property management view' },
    { value: 'tenants', label: 'Tenants', description: 'Tenant management view' },
    { value: 'payments', label: 'Payments', description: 'Payment tracking view' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Appearance & Display
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize how the application looks and feels.
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Monitor className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Theme
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred color scheme
              </p>
            </div>
          </div>
          <ThemeToggle showLabels={true} />
        </div>
      </div>

      {/* Dashboard Layout */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Layout className="h-4 w-4 mr-2" />
          Dashboard Layout
        </label>
        <div className="space-y-3">
          {dashboardLayouts.map((layout) => (
            <label
              key={layout.value}
              className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="radio"
                name="dashboardLayout"
                value={layout.value}
                checked={settings.dashboardLayout === layout.value}
                onChange={(e) => updateSetting('dashboardLayout', e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {layout.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {layout.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Default View */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          <Eye className="h-4 w-4 mr-2" />
          Default View on Login
        </label>
        <div className="space-y-3">
          {defaultViews.map((view) => (
            <label
              key={view.value}
              className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <input
                type="radio"
                name="defaultView"
                value={view.value}
                checked={settings.defaultView === view.value}
                onChange={(e) => updateSetting('defaultView', e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {view.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {view.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Display Options */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Display Options
        </h4>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Show Welcome Message
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Display welcome message on dashboard
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.showWelcomeMessage !== false}
              onChange={(e) => updateSetting('showWelcomeMessage', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;