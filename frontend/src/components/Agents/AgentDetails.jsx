import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  PencilIcon,
  BanknotesIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import showToast from '../../utils/toast';
import api from '../../services/api';

const AgentDetails = ({ agent, onClose, onEdit }) => {
  const [agentDetails, setAgentDetails] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (agent) {
      fetchAgentDetails();
      fetchCommissions();
    }
  }, [agent]);

  const fetchAgentDetails = async () => {
    try {
      const response = await api.get(`/agents/${agent.id}`);
      setAgentDetails(response.data);
    } catch (error) {
      console.error('Error fetching agent details:', error);
      showToast.error('Failed to load agent details');
    }
  };

  const fetchCommissions = async () => {
    try {
      const response = await api.get(`/agents/${agent.id}/commissions`);
      setCommissions(response.data.commissions);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      showToast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentAgent = agentDetails || agent;
  const uniqueProperties = new Set(
    currentAgent.leases?.map(al => al.lease?.propertyId || al.lease?.unit?.propertyId) || []
  );
  const totalCommissions = commissions.reduce((sum, comm) => sum + (comm.commission || 0), 0);
  const paidCommissions = commissions.filter(comm => comm.paid).reduce((sum, comm) => sum + (comm.commission || 0), 0);
  const pendingCommissions = totalCommissions - paidCommissions;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: UserGroupIcon },
    { id: 'properties', name: 'Properties', icon: BuildingOfficeIcon },
    { id: 'commissions', name: 'Commissions', icon: CurrencyDollarIcon },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-12 w-12">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-lg font-medium text-blue-800 dark:text-blue-200">
                  {currentAgent.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentAgent.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Agent ID: {currentAgent.id.slice(-8)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Properties
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {uniqueProperties.size}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tenants
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {currentAgent.leases?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Commission Rate
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {currentAgent.commissionRate}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Earned
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    KES {(currentAgent.totalEarned || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900 dark:text-white">{currentAgent.phone}</span>
                  </div>
                  {currentAgent.email && (
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900 dark:text-white">{currentAgent.email}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-gray-900 dark:text-white">
                      Joined {new Date(currentAgent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Performance Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Commissions
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        KES {totalCommissions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Paid Commissions
                      </span>
                      <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                        KES {paidCommissions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Pending Commissions
                      </span>
                      <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        KES {pendingCommissions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Average per Tenant
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        KES {currentAgent.leases?.length > 0 
                          ? Math.round(totalCommissions / currentAgent.leases.length).toLocaleString()
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'properties' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Assigned Properties & Tenants
              </h4>
              {currentAgent.leases && currentAgent.leases.length > 0 ? (
                <div className="space-y-4">
                  {currentAgent.leases.map((agentLease) => (
                    <div key={agentLease.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {agentLease.lease?.property?.title || 'Property'}
                            {agentLease.lease?.unit?.unitNumber && ` - Unit ${agentLease.lease.unit.unitNumber}`}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tenant: {agentLease.lease?.tenant?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Commission: KES {(agentLease.commission || 0).toLocaleString()}
                            {agentLease.paid && (
                              <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Paid
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {currentAgent.commissionRate}% Commission
                          </p>
                          {agentLease.paidAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Paid: {new Date(agentLease.paidAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No properties assigned to this agent yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'commissions' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Commission History
              </h4>
              {commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Property
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {commissions.map((commission) => (
                        <tr key={commission.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {commission.lease?.property?.title || 'N/A'}
                            {commission.lease?.unit?.unitNumber && ` - Unit ${commission.lease.unit.unitNumber}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {commission.lease?.tenant?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            KES {(commission.commission || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              commission.paid 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {commission.paid ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {commission.paidAt 
                              ? new Date(commission.paidAt).toLocaleDateString()
                              : new Date(commission.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No commission history available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AgentDetails;