import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Enhanced State Management with Zustand
 * Provides centralized state management with persistence and dev tools
 */

// Auth Store
export const useAuthStore = create()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        
        // Actions
        login: async (credentials) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await fetch('/api/v1/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials),
            });
            
            const data = await response.json();
            
            if (data.success) {
              set((state) => {
                state.user = data.data.user;
                state.token = data.data.token;
                state.refreshToken = data.data.refreshToken;
                state.isAuthenticated = true;
                state.isLoading = false;
              });
              
              // Store token in localStorage for API client
              localStorage.setItem('token', data.data.token);
              if (data.data.refreshToken) {
                localStorage.setItem('refreshToken', data.data.refreshToken);
              }
              
              return { success: true };
            } else {
              set((state) => {
                state.error = data.message || 'Login failed';
                state.isLoading = false;
              });
              return { success: false, error: data.message };
            }
          } catch (error) {
            set((state) => {
              state.error = 'Network error';
              state.isLoading = false;
            });
            return { success: false, error: 'Network error' };
          }
        },
        
        logout: () => {
          set((state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.error = null;
          });
          
          // Clear tokens from localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        },
        
        refreshAuth: async () => {
          const refreshToken = get().refreshToken;
          if (!refreshToken) return false;
          
          try {
            const response = await fetch('/api/v1/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            
            const data = await response.json();
            
            if (data.success) {
              set((state) => {
                state.token = data.data.accessToken;
                state.user = data.data.user;
              });
              
              localStorage.setItem('token', data.data.accessToken);
              return true;
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
          }
          
          // Refresh failed, logout user
          get().logout();
          return false;
        },
        
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
        
        updateUser: (userData) => {
          set((state) => {
            state.user = { ...state.user, ...userData };
          });
        },
      })),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
);

// Properties Store
export const usePropertiesStore = create()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // State
        properties: [],
        currentProperty: null,
        filters: {
          city: '',
          type: '',
          status: '',
          minRent: '',
          maxRent: '',
          bedrooms: '',
          search: '',
        },
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
        isLoading: false,
        error: null,
        
        // Actions
        setProperties: (properties, pagination) => {
          set((state) => {
            state.properties = properties;
            if (pagination) {
              state.pagination = pagination;
            }
          });
        },
        
        addProperty: (property) => {
          set((state) => {
            state.properties.unshift(property);
            state.pagination.total += 1;
          });
        },
        
        updateProperty: (propertyId, updates) => {
          set((state) => {
            const index = state.properties.findIndex(p => p.id === propertyId);
            if (index !== -1) {
              state.properties[index] = { ...state.properties[index], ...updates };
            }
            if (state.currentProperty?.id === propertyId) {
              state.currentProperty = { ...state.currentProperty, ...updates };
            }
          });
        },
        
        removeProperty: (propertyId) => {
          set((state) => {
            state.properties = state.properties.filter(p => p.id !== propertyId);
            state.pagination.total -= 1;
            if (state.currentProperty?.id === propertyId) {
              state.currentProperty = null;
            }
          });
        },
        
        setCurrentProperty: (property) => {
          set((state) => {
            state.currentProperty = property;
          });
        },
        
        setFilters: (filters) => {
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.pagination.page = 1; // Reset to first page when filters change
          });
        },
        
        clearFilters: () => {
          set((state) => {
            state.filters = {
              city: '',
              type: '',
              status: '',
              minRent: '',
              maxRent: '',
              bedrooms: '',
              search: '',
            };
            state.pagination.page = 1;
          });
        },
        
        setPagination: (pagination) => {
          set((state) => {
            state.pagination = { ...state.pagination, ...pagination };
          });
        },
        
        setLoading: (isLoading) => {
          set((state) => {
            state.isLoading = isLoading;
          });
        },
        
        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },
        
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
      }))
    ),
    { name: 'properties-store' }
  )
);

// Tenants Store
export const useTenantsStore = create()(
  devtools(
    immer((set, get) => ({
      // State
      tenants: [],
      currentTenant: null,
      filters: {
        search: '',
        isHighRisk: null,
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      },
      isLoading: false,
      error: null,
      
      // Actions
      setTenants: (tenants, pagination) => {
        set((state) => {
          state.tenants = tenants;
          if (pagination) {
            state.pagination = pagination;
          }
        });
      },
      
      addTenant: (tenant) => {
        set((state) => {
          state.tenants.unshift(tenant);
          state.pagination.total += 1;
        });
      },
      
      updateTenant: (tenantId, updates) => {
        set((state) => {
          const index = state.tenants.findIndex(t => t.id === tenantId);
          if (index !== -1) {
            state.tenants[index] = { ...state.tenants[index], ...updates };
          }
          if (state.currentTenant?.id === tenantId) {
            state.currentTenant = { ...state.currentTenant, ...updates };
          }
        });
      },
      
      removeTenant: (tenantId) => {
        set((state) => {
          state.tenants = state.tenants.filter(t => t.id !== tenantId);
          state.pagination.total -= 1;
          if (state.currentTenant?.id === tenantId) {
            state.currentTenant = null;
          }
        });
      },
      
      setCurrentTenant: (tenant) => {
        set((state) => {
          state.currentTenant = tenant;
        });
      },
      
      setFilters: (filters) => {
        set((state) => {
          state.filters = { ...state.filters, ...filters };
          state.pagination.page = 1;
        });
      },
      
      setPagination: (pagination) => {
        set((state) => {
          state.pagination = { ...state.pagination, ...pagination };
        });
      },
      
      setLoading: (isLoading) => {
        set((state) => {
          state.isLoading = isLoading;
        });
      },
      
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },
      
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
    })),
    { name: 'tenants-store' }
  )
);

// Dashboard Store
export const useDashboardStore = create()(
  devtools(
    immer((set, get) => ({
      // State
      stats: {
        properties: { total: 0, available: 0, occupied: 0, maintenance: 0 },
        tenants: { total: 0, active: 0, highRisk: 0 },
        payments: { thisMonth: 0, lastMonth: 0, totalCount: 0 },
        revenue: { thisMonth: 0, lastMonth: 0, growth: 0 },
      },
      recentPayments: [],
      upcomingRent: [],
      chartData: {
        revenue: [],
        occupancy: [],
        payments: [],
      },
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      // Actions
      setStats: (stats) => {
        set((state) => {
          state.stats = { ...state.stats, ...stats };
          state.lastUpdated = new Date().toISOString();
        });
      },
      
      setRecentPayments: (payments) => {
        set((state) => {
          state.recentPayments = payments;
        });
      },
      
      setUpcomingRent: (rentData) => {
        set((state) => {
          state.upcomingRent = rentData;
        });
      },
      
      setChartData: (chartType, data) => {
        set((state) => {
          state.chartData[chartType] = data;
        });
      },
      
      setLoading: (isLoading) => {
        set((state) => {
          state.isLoading = isLoading;
        });
      },
      
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },
      
      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },
      
      refreshDashboard: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          // This would typically call your API service
          // const dashboardData = await api.dashboard.getStats();
          // get().setStats(dashboardData.stats);
          // get().setRecentPayments(dashboardData.recentPayments);
          // get().setUpcomingRent(dashboardData.upcomingRent);
          
          set((state) => {
            state.isLoading = false;
            state.lastUpdated = new Date().toISOString();
          });
        } catch (error) {
          set((state) => {
            state.error = error.message;
            state.isLoading = false;
          });
        }
      },
    })),
    { name: 'dashboard-store' }
  )
);

// Settings Store
export const useSettingsStore = create()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        userSettings: {},
        agencySettings: {},
        systemSettings: {},
        isLoading: false,
        error: null,
        hasUnsavedChanges: false,
        
        // Actions
        loadSettings: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            const response = await fetch('/api/v1/settings/preferences', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            const data = await response.json();
            
            if (data.success) {
              set((state) => {
                state.userSettings = data.data.user || {};
                state.agencySettings = data.data.agency || {};
                state.systemSettings = data.data.system || {};
                state.isLoading = false;
              });
            } else {
              throw new Error(data.message || 'Failed to load settings');
            }
          } catch (error) {
            set((state) => {
              state.error = error.message;
              state.isLoading = false;
            });
          }
        },
        
        updateUserSetting: (key, value) => {
          set((state) => {
            state.userSettings[key] = value;
            state.hasUnsavedChanges = true;
          });
        },
        
        updateAgencySetting: (key, value) => {
          set((state) => {
            state.agencySettings[key] = value;
            state.hasUnsavedChanges = true;
          });
        },
        
        saveSettings: async () => {
          const { userSettings, agencySettings } = get();
          
          try {
            await Promise.all([
              fetch('/api/v1/settings/user', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userSettings)
              }),
              fetch('/api/v1/settings/agency', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(agencySettings)
              })
            ]);
            
            set((state) => {
              state.hasUnsavedChanges = false;
            });
            
            return { success: true };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        
        resetSettings: async () => {
          try {
            const response = await fetch('/api/v1/settings/reset-user', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (response.ok) {
              await get().loadSettings();
              set((state) => {
                state.hasUnsavedChanges = false;
              });
              return { success: true };
            } else {
              throw new Error('Failed to reset settings');
            }
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
      })),
      {
        name: 'settings-storage',
        partialize: (state) => ({
          userSettings: state.userSettings,
          agencySettings: state.agencySettings,
        }),
      }
    ),
    { name: 'settings-store' }
  )
);

// UI Store for global UI state
export const useUIStore = create()(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        theme: 'system',
        sidebarCollapsed: false,
        notifications: [],
        modals: {
          propertyForm: false,
          tenantForm: false,
          paymentForm: false,
          confirmDialog: false,
        },
        loading: {
          global: false,
          operations: new Set(),
        },
        
        // Actions
        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
        },
        
        toggleSidebar: () => {
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          });
        },
        
        setSidebarCollapsed: (collapsed) => {
          set((state) => {
            state.sidebarCollapsed = collapsed;
          });
        },
        
        addNotification: (notification) => {
          set((state) => {
            state.notifications.push({
              id: Date.now(),
              timestamp: new Date().toISOString(),
              ...notification,
            });
          });
        },
        
        removeNotification: (id) => {
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id);
          });
        },
        
        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
          });
        },
        
        openModal: (modalName) => {
          set((state) => {
            state.modals[modalName] = true;
          });
        },
        
        closeModal: (modalName) => {
          set((state) => {
            state.modals[modalName] = false;
          });
        },
        
        closeAllModals: () => {
          set((state) => {
            Object.keys(state.modals).forEach(key => {
              state.modals[key] = false;
            });
          });
        },
        
        setGlobalLoading: (loading) => {
          set((state) => {
            state.loading.global = loading;
          });
        },
        
        addLoadingOperation: (operationId) => {
          set((state) => {
            state.loading.operations.add(operationId);
          });
        },
        
        removeLoadingOperation: (operationId) => {
          set((state) => {
            state.loading.operations.delete(operationId);
          });
        },
        
        isOperationLoading: (operationId) => {
          return get().loading.operations.has(operationId);
        },
      })),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// Store subscriptions for cross-store communication
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (!isAuthenticated) {
      // Clear other stores when user logs out
      usePropertiesStore.getState().setProperties([], { page: 1, limit: 10, total: 0, pages: 0 });
      useTenantsStore.getState().setTenants([], { page: 1, limit: 10, total: 0, pages: 0 });
      useDashboardStore.getState().setStats({
        properties: { total: 0, available: 0, occupied: 0, maintenance: 0 },
        tenants: { total: 0, active: 0, highRisk: 0 },
        payments: { thisMonth: 0, lastMonth: 0, totalCount: 0 },
        revenue: { thisMonth: 0, lastMonth: 0, growth: 0 },
      });
    }
  }
);

// Export store selectors for better performance
export const authSelectors = {
  user: (state) => state.user,
  isAuthenticated: (state) => state.isAuthenticated,
  isLoading: (state) => state.isLoading,
  error: (state) => state.error,
};

export const propertiesSelectors = {
  properties: (state) => state.properties,
  currentProperty: (state) => state.currentProperty,
  filters: (state) => state.filters,
  pagination: (state) => state.pagination,
  isLoading: (state) => state.isLoading,
};

export const tenantsSelectors = {
  tenants: (state) => state.tenants,
  currentTenant: (state) => state.currentTenant,
  filters: (state) => state.filters,
  pagination: (state) => state.pagination,
  isLoading: (state) => state.isLoading,
};

export const dashboardSelectors = {
  stats: (state) => state.stats,
  recentPayments: (state) => state.recentPayments,
  upcomingRent: (state) => state.upcomingRent,
  chartData: (state) => state.chartData,
  isLoading: (state) => state.isLoading,
  lastUpdated: (state) => state.lastUpdated,
};

export const uiSelectors = {
  theme: (state) => state.theme,
  sidebarCollapsed: (state) => state.sidebarCollapsed,
  notifications: (state) => state.notifications,
  modals: (state) => state.modals,
  loading: (state) => state.loading,
};