import React from 'react';
import { Mail, MessageSquare, Smartphone, Bell, AlertCircle } from 'lucide-react';

const NotificationSettings = ({ settings, updateSetting }) => {
  const notificationChannels = [
    {
      key: 'emailNotifications',
      label: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: Mail,
    },
    {
      key: 'smsNotifications',
      label: 'SMS Notifications',
      description: 'Receive notifications via SMS',
      icon: Smartphone,
    },
    {
      key: 'whatsappNotifications',
      label: 'WhatsApp Notifications',
      description: 'Receive notifications via WhatsApp',
      icon: MessageSquare,
    },
    {
      key: 'pushNotifications',
      label: 'Push Notifications',
      description: 'Receive browser push notifications',
      icon: Bell,
    },
  ];

  const notificationTypes = [
    {
      key: 'rentReminders',
      label: 'Rent Reminders',
      description: 'Notifications about upcoming and overdue rent payments',
    },
    {
      key: 'paymentConfirmations',
      label: 'Payment Confirmations',
      description: 'Confirmations when payments are received',
    },
    {
      key: 'maintenanceUpdates',
      label: 'Maintenance Updates',
      description: 'Updates on maintenance request status',
    },
    {
      key: 'leaseExpirations',
      label: 'Lease Expirations',
      description: 'Alerts about expiring leases',
    },
    {
      key: 'systemAlerts',
      label: 'System Alerts',
      description: 'Important system notifications and updates',
    },
  ];

  const contactMethods = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: Smartphone },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Notification Preferences
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Choose how and when you want to receive notifications.
        </p>
      </div>

      {/* Notification Channels */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Notification Channels
        </h4>
        <div className="space-y-4">
          {notificationChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.key}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <div className="flex items-center">
                  <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {channel.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {channel.description}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[channel.key] !== false}
                    onChange={(e) => updateSetting(channel.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferred Contact Method */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Preferred Contact Method
        </h4>
        <div className="space-y-3">
          {contactMethods.map((method) => {
            const Icon = method.icon;
            return (
              <label
                key={method.value}
                className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <input
                  type="radio"
                  name="preferredContactMethod"
                  value={method.value}
                  checked={settings.preferredContactMethod === method.value}
                  onChange={(e) => updateSetting('preferredContactMethod', e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                />
                <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400 ml-3 mr-3" />
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {method.label}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Notification Types */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Notification Types
        </h4>
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div
              key={type.key}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {type.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {type.description}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings[type.key] !== false}
                onChange={(e) => updateSetting(type.key, e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Important Notice
            </h5>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Some notifications are critical for system operation and cannot be disabled. 
              You will always receive security alerts and account-related notifications via email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;