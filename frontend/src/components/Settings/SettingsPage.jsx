import React, { useState, useEffect } from 'react';
import { ComponentErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';
import { 
  User, 
  Building, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Download, 
  Upload,
  Save,
  RotateCcw,
  Settings as SettingsIcon
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Comprehensive Settings Page
 * Allows users to configure all their preferences and system settings
 */
const SettingsPage = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [userSettings, setUserSettings] = useState({});
  const [agencySettings, setAgencySettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/preferences');
      if (response.success) {
        setUserSettings(response.data.user || {});
        setAgencySettings(response.data.agency || {});
      }
    } catch (error) {
      toast.error('Failed to load settings');
      console.error('Settings load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/settings/user', userSettings),
        api.put('/settings/agency', agencySettings)
      ]);
      
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Settings save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
    
    try {
      await api.post('/settings/reset-user');
      await loadSettings();
      setHasChanges(false);
      toast.success('Settings reset to defaults');
    } catch (error) {
      toast.error('Failed to reset settings');
    }
  };

  const exportSettings = async () => {
    try {
      const response = await api.get('/settings/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'haven-settings.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  const updateUserSetting = (key, value) => {
    setUserSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateAgencySetting = (key, value) => {
    setAgencySettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'agency', label: 'Agency', icon: Building },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ComponentErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your account preferences and system configuration
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'profile' && (
                    <ProfileSettings 
                      settings={userSettings}
                      updateSetting={updateUserSetting}
                    />
                  )}
                  
                  {activeTab === 'appearance' && (
                    <AppearanceSettings 
                      settings={userSettings}
                      updateSetting={updateUserSetting}
                    />
                  )}
                  
                  {activeTab === 'notifications' && (
                    <NotificationSettings 
                      settings={userSettings}
                      updateSetting={updateUserSetting}
                    />
                  )}
                  
                  {activeTab === 'agency' && (
                    <AgencySettings 
                      settings={agencySettings}
                      updateSetting={updateAgencySetting}
                    />
                  )}
                  
                  {activeTab === 'privacy' && (
                    <PrivacySettings 
                      settings={userSettings}
                      updateSetting={updateUserSetting}
                    />
                  )}
                  
                  {activeTab === 'advanced' && (
                    <AdvancedSettings 
                      userSettings={userSettings}
                      agencySettings={agencySettings}
                      updateUserSetting={updateUserSetting}
                      updateAgencySetting={updateAgencySetting}
                      onExport={exportSettings}
                      onReset={resetSettings}
                    />
                  )}
                </div>

                {/* Action Bar */}
                {hasChanges && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        You have unsaved changes
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            loadSettings();
                            setHasChanges(false);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveSettings}
                          disabled={saving}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
};

export default SettingsPage;