import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode.react';
import api from '../../services/api';
import showToast from '../../utils/toast';
import OTPInput from './OTPInput';

const TwoFactorSetup = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1); // 1: QR Code, 2: Verify, 3: Backup Codes
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    setupTwoFactor();
  }, []);

  const setupTwoFactor = async () => {
    try {
      const response = await api.twoFactor.setup();
      setSecret(response.data.secret);
      setOtpauthUrl(response.data.otpauthUrl);
    } catch (error) {
      showToast.error('Failed to initialize 2FA setup');
      console.error(error);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    showToast.success('Secret copied to clipboard');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    showToast.success('Backup codes copied');
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      showToast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.twoFactor.enable(verificationCode);
      setBackupCodes(response.data.backupCodes);
      setStep(3);
      showToast.success('2FA enabled successfully!');
    } catch (error) {
      showToast.error(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (!copiedCodes) {
      const confirmed = window.confirm(
        'Have you saved your backup codes? You will not be able to see them again.'
      );
      if (!confirmed) return;
    }
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-16 h-1 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Scan QR Code */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Scan QR Code
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Use an authenticator app like Google Authenticator, Authy, or 1Password
          </p>

          {/* QR Code */}
          <div className="flex justify-center mb-6 p-6 bg-white rounded-lg">
            {otpauthUrl && (
              <QRCode value={otpauthUrl} size={200} level="H" />
            )}
          </div>

          {/* Manual Entry */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Can't scan? Enter this code manually:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm break-all">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copiedSecret ? '✓' : 'Copy'}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Continue
          </button>
        </motion.div>
      )}

      {/* Step 2: Verify Code */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Setup
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter the 6-digit code from your authenticator app
          </p>

          <div className="mb-6">
            <OTPInput
              length={6}
              value={verificationCode}
              onChange={setVerificationCode}
              onComplete={handleVerify}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Backup Codes */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Save Your Backup Codes
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Keep these codes safe. You can use them to access your account if you lose your authenticator device.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Important!
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  These codes will only be shown once. Each code can only be used once.
                </p>
              </div>
            </div>
          </div>

          {/* Backup Codes */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg font-mono text-center"
                >
                  {code}
                </div>
              ))}
            </div>
            <button
              onClick={copyBackupCodes}
              className="w-full py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              {copiedCodes ? '✓ Copied' : '📋 Copy All Codes'}
            </button>
          </div>

          <button
            onClick={handleComplete}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </motion.div>
      )}

      {/* Cancel Button */}
      {step < 3 && (
        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Cancel Setup
        </button>
      )}
    </div>
  );
};

export default TwoFactorSetup;
