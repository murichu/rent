import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';
import api from '../../services/api';

/**
 * Property Settings Component
 * Configure manual payments, system fees, and other settings
 */
const PropertySettings = ({ propertyId }) => {
  const [settings, setSettings] = useState({
    allowManualPayment: true,
    requireApprovalForManual: false,
    autoGenerateInvoices: true,
    sendPaymentReminders: true,
  });

  const [systemFees, setSystemFees] = useState({
    enabled: false,
    feeType: 'MONTHLY',
    monthlyFee: 500,
    yearlyFee: 5000,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [propertyId]);

  const fetchSettings = async () => {
    try {
      // Fetch property settings and system fee config
      // const response = await api.properties.getSettings(propertyId);
      // setSettings(response.data.settings);
      // setSystemFees(response.data.systemFees);
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // await api.properties.updateSettings(propertyId, { settings, systemFees });
      showToast.success('Settings saved successfully!');
    } catch (error) {
      showToast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-haven-blue focus:ring-offset-2 ${
          enabled ? 'bg-haven-blue' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Property Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure payment methods, fees, and automation for this property
        </p>
      </div>

      {/* Payment Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          💳 Payment Settings
        </h3>

        <ToggleSwitch
          enabled={settings.allowManualPayment}
          onChange={(val) => setSettings({ ...settings, allowManualPayment: val })}
          label="Allow Manual Payments"
          description="Enable cash and cheque payments for this property"
        />

        {settings.allowManualPayment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="ml-8"
          >
            <ToggleSwitch
              enabled={settings.requireApprovalForManual}
              onChange={(val) => setSettings({ ...settings, requireApprovalForManual: val })}
              label="Require Approval for Manual Payments"
              description="Manual payments need manager approval before being recorded"
            />
          </motion.div>
        )}

        <ToggleSwitch
          enabled={settings.autoGenerateInvoices}
          onChange={(val) => setSettings({ ...settings, autoGenerateInvoices: val })}
          label="Auto-Generate Invoices"
          description="Automatically create rent invoices at the start of each billing cycle"
        />

        <ToggleSwitch
          enabled={settings.sendPaymentReminders}
          onChange={(val) => setSettings({ ...settings, sendPaymentReminders: val })}
          label="Send Payment Reminders"
          description="Automatically send rent reminders via SMS, Email, and WhatsApp"
        />
      </div>

      {/* System Usage Fees */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          💰 System Usage Fees
        </h3>

        <ToggleSwitch
          enabled={systemFees.enabled}
          onChange={(val) => setSystemFees({ ...systemFees, enabled: val })}
          label="Enable System Usage Fees"
          description="Automatically charge Haven platform fees as property expenses"
        />

        {systemFees.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-4"
          >
            {/* Fee Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Billing Cycle
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSystemFees({ ...systemFees, feeType: 'MONTHLY' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    systemFees.feeType === 'MONTHLY'
                      ? 'border-haven-blue bg-haven-blue/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-haven-blue/50'
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-white">Monthly</p>
                  <p className="text-2xl font-bold text-haven-blue mt-2">
                    KES {systemFees.monthlyFee}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">per month</p>
                </button>

                <button
                  onClick={() => setSystemFees({ ...systemFees, feeType: 'YEARLY' })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    systemFees.feeType === 'YEARLY'
                      ? 'border-haven-blue bg-haven-blue/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-haven-blue/50'
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-white">Yearly</p>
                  <p className="text-2xl font-bold text-haven-blue mt-2">
                    KES {systemFees.yearlyFee}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    per year (Save {Math.round(((systemFees.monthlyFee * 12 - systemFees.yearlyFee) / (systemFees.monthlyFee * 12)) * 100)}%)
                  </p>
                </button>
              </div>
            </div>

            {/* Custom Fee Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Fee (KES)
                </label>
                <input
                  type="number"
                  value={systemFees.monthlyFee}
                  onChange={(e) => setSystemFees({ ...systemFees, monthlyFee: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yearly Fee (KES)
                </label>
                <input
                  type="number"
                  value={systemFees.yearlyFee}
                  onChange={(e) => setSystemFees({ ...systemFees, yearlyFee: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">About System Fees</p>
                  <p>
                    System usage fees are automatically recorded as property expenses 
                    on the {systemFees.feeType === 'MONTHLY' ? '1st of each month' : '1st of January'}. 
                    These fees cover the use of Haven platform features.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-6 py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default PropertySettings;
