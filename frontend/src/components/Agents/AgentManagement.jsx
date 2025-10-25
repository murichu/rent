import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import showToast from '../../utils/toast';
import api from '../../services/api';
import AgentForm from './AgentForm';
import AgentDetails from './AgentDetails';
import ConfirmDialog from '../Dialogs/ConfirmDialog';

const AgentManagement = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchAgents();
  }, [pagination.page, searchTerm]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await api.get('/agents', { params });
      setAgents(response.data.agents);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        pages: response.data.pagination.pages
      }));
    } catch (error) {
      console.error('Error fetching agents:', error);
      showToast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setShowForm(true);
  };

  const handleEditAgent = (agent) => {
    setSelectedAgent(agent);
    setShowForm(true);
  };

  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setShowDetails(true);
  };

  const handleDeleteAgent = (agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/agents/${agentToDelete.id}`);
      showToast.success('Agent deleted successfully');
      fetchAgents();
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Error deleting agent:', error);
      showToast.error(error.response?.data?.error || 'Failed to delete agent');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAgent(null);
    fetchAgents();
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getStatusColor = (agent) => {
    if (!agent.isActive) return 'bg-red-100 text-red-800';
    if (agent.leases && agent.leases.length > 0) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = (agent) => {
    if (!agent.isActive) return 'Inactive';
    if (agent.leases && agent.leases.length > 0) return 'Active';
    return 'Available';
  };

  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Agent Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage your property agents and their assignments
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateAgent}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Agents
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {pagination.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Agents
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {agents.filter(a => a.isActive && a.leases?.length > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Properties Managed
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {agents.reduce((sum, agent) => {
                    const uniqueProperties = new Set(
                      agent.leases?.map(al => al.lease?.propertyId || al.lease?.unit?.propertyId) || []
                    );
                    return sum + uniqueProperties.size;
                  }, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Commission Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {agents.length > 0 
                    ? (agents.reduce((sum, agent) => sum + agent.commissionRate, 0) / agents.length).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search agents by name, phone, or email..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agents List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Agents ({pagination.total})
            </h3>
          </div>

          {loading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : agents.length === 0 ? (
            <div className="p-6 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No agents found matching your search.' : 'No agents found. Create your first agent to get started.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreateAgent}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add First Agent
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Commission Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Properties
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <AnimatePresence>
                      {agents.map((agent) => (
                        <motion.tr
                          key={agent.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    {agent.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {agent.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  ID: {agent.id.slice(-8)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              <div className="flex items-center mb-1">
                                <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                                {agent.phone}
                              </div>
                              {agent.email && (
                                <div className="flex items-center">
                                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-2" />
                                  {agent.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {agent.commissionRate}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {agent.leases ? (
                                <>
                                  <div className="font-medium">
                                    {new Set(agent.leases.map(al => al.lease?.propertyId || al.lease?.unit?.propertyId)).size} Properties
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400">
                                    {agent.leases.length} Leases
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">No assignments</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(agent)}`}>
                              {getStatusText(agent)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewAgent(agent)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditAgent(agent)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title="Edit Agent"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Agent"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <AgentForm
            agent={selectedAgent}
            onClose={() => {
              setShowForm(false);
              setSelectedAgent(null);
            }}
            onSuccess={handleFormSuccess}
          />
        )}

        {showDetails && selectedAgent && (
          <AgentDetails
            agent={selectedAgent}
            onClose={() => {
              setShowDetails(false);
              setSelectedAgent(null);
            }}
            onEdit={() => {
              setShowDetails(false);
              setShowForm(true);
            }}
          />
        )}

        {showDeleteDialog && (
          <ConfirmDialog
            isOpen={showDeleteDialog}
            title="Delete Agent"
            message={`Are you sure you want to delete ${agentToDelete?.name}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDelete}
            onCancel={() => {
              setShowDeleteDialog(false);
              setAgentToDelete(null);
            }}
            type="danger"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentManagement;