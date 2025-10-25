import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import showToast from '../../utils/toast';
import api from '../../services/api';

const AgentForm = ({ agent, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    commissionRate: 10,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        phone: agent.phone || '',
        email: agent.email || '',
        commissionRate: agent.commissionRate || 10,
      });
    }
  }, [agent]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.trim().length < 10) {
      newErrors.phone = 'Phone number must be at least 10 characters';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.commissionRate < 0 || formData.commissionRate > 100) {
      newErrors.commissionRate = 'Commission rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        commissionRate: parseFloat(formData.commissionRate),
      };

      if (agent) {
        await api.put(`/agents/${agent.id}`, payload);
        showToast.success('Agent updated successfully');
      } else {
        await api.post('/agents', payload);
        showToast.success('Agent created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving agent:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save agent';
      showToast.error(errorMessage);
      
      // Handle validation errors from server
      if (error.response?.data?.details) {
        setErrors(error.response.data.details.fieldErrors || {});
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {agent ? 'Edit Agent' : 'Add New Agent'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.name 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }`}
              placeholder="Enter agent's full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.phone 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }`}
              placeholder="+254700000000"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.email 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }`}
              placeholder="agent@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>

          {/* Commission Rate */}
          <div>
            <label htmlFor="commissionRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commission Rate (%)
            </label>
            <input
              type="number"
              id="commissionRate"
              name="commissionRate"
              value={formData.commissionRate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                errors.commissionRate 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }`}
              placeholder="10.0"
            />
            {errors.commissionRate && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.commissionRate}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Percentage of rent collected that the agent will earn as commission
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {agent ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                agent ? 'Update Agent' : 'Create Agent'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AgentForm;