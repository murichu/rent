import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  UserCheck, 
  TrendingUp, 
  DollarSign,
  MapPin,
  Phone,
  Mail,
  Settings,
  Plus
} from 'lucide-react';
import { ComponentErrorBoundary } from '../ErrorBoundary/ErrorBoundary';
import { useCurrency } from '../../hooks/useCurrency';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Agency Management Dashboard
 * Central hub for managing agency operations, agents, and property managers
 */
const AgencyDashboard = () => {
  const { formatCompact } = useCurrency();
  const [agencyData, setAgencyData] = useState(null);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalAgents: 0,
    totalCaretakers: 0,
    totalCommissions: 0,
    activeLeases: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgencyData();
  }, []);

  const loadAgencyData = async () => {
    setLoading(true);
    try {
      const [agencyResponse, statsResponse] = await Promise.all([
        api.agencies.getMe(),
        api.dashboard.getStats()
      ]);

      if (agencyResponse.success) {
        setAgencyData(agencyResponse.data);
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load agency data');
      console.error('Agency data load error:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Agency Management
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Manage your property management agency operations
                </p>
              </div>
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Settings className="h-4 w-4 mr-2" />
                Agency Settings
              </button>
            </div>
          </div>

          {/* Agency Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                    <Building className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {agencyData?.name || 'Your Agency'}
                    </h2>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 mr-1" />
                        Nairobi, Kenya
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="h-4 w-4 mr-1" />
                        agency@haven.co.ke
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="h-4 w-4 mr-1" />
                        +254 700 000 000
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Rent Due Day
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {agencyData?.dueDayOfMonth || 5}th
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Properties"
              value={stats.totalProperties}
              icon={Building}
              color="blue"
              change="+12%"
            />
            <StatCard
              title="Active Agents"
              value={stats.totalAgents}
              icon={Users}
              color="green"
              change="+5%"
            />
            <StatCard
              title="Property Caretakers"
              value={stats.totalCaretakers}
              icon={UserCheck}
              color="purple"
              change="+2%"
            />
            <StatCard
              title="Monthly Revenue"
              value={formatCompact(stats.monthlyRevenue)}
              icon={DollarSign}
              color="emerald"
              change="+18%"
              isCurrency={true}
            />
          </div>

          {/* Management Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Agents Management */}
            <ManagementSection
              title="Sales Agents"
              description="Manage agents who bring in tenants and earn commissions"
              icon={Users}
              color="blue"
              items={[
                { name: 'John Kamau', role: 'Senior Agent', commission: '15%', properties: 12 },
                { name: 'Mary Wanjiku', role: 'Agent', commission: '10%', properties: 8 },
                { name: 'Peter Ochieng', role: 'Junior Agent', commission: '8%', properties: 5 }
              ]}
              onAddNew={() => console.log('Add new agent')}
              onViewAll={() => console.log('View all agents')}
            />

            {/* Property Managers */}
            <ManagementSection
              title="Property Managers"
              description="Users assigned to manage specific properties"
              icon={UserCheck}
              color="green"
              items={[
                { name: 'Alice Muthoni', role: 'Property Manager', properties: 25 },
                { name: 'David Kiprop', role: 'Property Manager', properties: 18 },
                { name: 'Grace Akinyi', role: 'Property Manager', properties: 22 }
              ]}
              onAddNew={() => console.log('Add new property manager')}
              onViewAll={() => console.log('View all property managers')}
            />

            {/* Caretakers */}
            <ManagementSection
              title="Property Caretakers"
              description="On-site caretakers and watchmen for properties"
              icon={Building}
              color="purple"
              items={[
                { name: 'Samuel Mwangi', role: 'Caretaker', properties: 3, rating: 4.8 },
                { name: 'Jane Nyokabi', role: 'Caretaker', properties: 2, rating: 4.9 },
                { name: 'Joseph Kiprotich', role: 'Caretaker', properties: 4, rating: 4.6 }
              ]}
              onAddNew={() => console.log('Add new caretaker')}
              onViewAll={() => console.log('View all caretakers')}
            />

            {/* Commission Tracking */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-emerald-100 dark:bg-emerald-900 p-2 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Commission Tracking
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Agent commission overview
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Total Commissions Paid
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCompact(stats.totalCommissions)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Pending Commissions
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {formatCompact(25000)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    This Month
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {formatCompact(75000)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, change, isCurrency = false }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCurrency ? value : value.toLocaleString()}
          </p>
          {change && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              {change} from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

// Management Section Component
const ManagementSection = ({ title, description, icon: Icon, color, items, onAddNew, onViewAll }) => {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </div>
          </div>
          <button
            onClick={onAddNew}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add New
          </button>
        </div>

        <div className="space-y-3">
          {items.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {item.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {item.role}
                  {item.commission && ` • ${item.commission} commission`}
                  {item.rating && ` • ${item.rating}⭐ rating`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.properties} properties
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            View All {title}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgencyDashboard;