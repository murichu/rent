import React, { useState } from 'react';
import { motion } from 'framer-motion';
import showToast from '../../utils/toast';

/**
 * Agent Settings Component
 * Configure what agents can do (add caretakers, manual payments, etc.)
 */
const AgentSettings = ({ agentId }) => {
  const [settings, setSettings] = useState({
    canAddCaretakers: true,
    canRecordManualPayments: true,
    requireApproval: true,
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // await api.agents.updateSettings(agentId, settings);
      showToast.success('Agent settings saved!');
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
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Agent Permissions
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure what this agent can do in the system
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md space-y-1">
        <ToggleSwitch
          enabled={settings.canAddCaretakers}
          onChange={(val) => setSettings({ ...settings, canAddCaretakers: val })}
          label="Can Add Caretakers"
          description="Allow this agent to add and manage caretakers for properties"
        />

        <ToggleSwitch
          enabled={settings.canRecordManualPayments}
          onChange={(val) => setSettings({ ...settings, canRecordManualPayments: val })}
          label="Can Record Manual Payments"
          description="Allow this agent to record cash and cheque payments"
        />

        {settings.canRecordManualPayments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="ml-8"
          >
            <ToggleSwitch
              enabled={settings.requireApproval}
              onChange={(val) => setSettings({ ...settings, requireApproval: val })}
              label="Require Approval"
              description="Manual payments by this agent need manager approval"
            />
          </motion.div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-haven-blue text-white rounded-lg font-semibold hover:bg-haven-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Agent Settings'}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Important</p>
            <p>
              These settings control what this specific agent can do. Changes take effect immediately.
              Agents will only see features they have permission to use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings;
