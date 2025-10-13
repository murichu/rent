import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_VERSION = '/api/v1';

/**
 * Haven API Client
 * Create axios instance with defaults
 */
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Name': 'Haven',
    'X-App-Version': '1.0.0',
  },
});

/**
 * Request interceptor - Add auth token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - Handle errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Token expired - try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}${API_VERSION}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('token', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API Service
 */
const api = {
  // Auth
  auth: {
    register: (data) => apiClient.post('/auth/register', data),
    login: (data) => apiClient.post('/auth/login', data),
    logout: () => apiClient.post('/auth/logout'),
    refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
    requestPasswordReset: (email) => apiClient.post('/auth/request-reset', { email }),
    resetPassword: (token, password) => apiClient.post('/auth/reset-password', { token, password }),
    verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  },

  // Properties
  properties: {
    getAll: (params) => apiClient.get('/properties', { params }),
    getById: (id) => apiClient.get(`/properties/${id}`),
    create: (data) => apiClient.post('/properties', data),
    update: (id, data) => apiClient.put(`/properties/${id}`, data),
    delete: (id) => apiClient.delete(`/properties/${id}`),
    bulkDelete: (ids) => apiClient.post('/properties/bulk-delete', { ids }),
  },

  // Tenants
  tenants: {
    getAll: (params) => apiClient.get('/tenants', { params }),
    getById: (id) => apiClient.get(`/tenants/${id}`),
    create: (data) => apiClient.post('/tenants', data),
    update: (id, data) => apiClient.put(`/tenants/${id}`, data),
    delete: (id) => apiClient.delete(`/tenants/${id}`),
    bulkDelete: (ids) => apiClient.post('/tenants/bulk-delete', { ids }),
  },

  // Leases
  leases: {
    getAll: (params) => apiClient.get('/leases', { params }),
    getById: (id) => apiClient.get(`/leases/${id}`),
    create: (data) => apiClient.post('/leases', data),
    update: (id, data) => apiClient.put(`/leases/${id}`, data),
    delete: (id) => apiClient.delete(`/leases/${id}`),
  },

  // Payments
  payments: {
    getAll: (params) => apiClient.get('/payments', { params }),
    getById: (id) => apiClient.get(`/payments/${id}`),
    create: (data) => apiClient.post('/payments', data),
    update: (id, data) => apiClient.put(`/payments/${id}`, data),
    delete: (id) => apiClient.delete(`/payments/${id}`),
  },

  // Invoices
  invoices: {
    getAll: (params) => apiClient.get('/invoices', { params }),
    getById: (id) => apiClient.get(`/invoices/${id}`),
    create: (data) => apiClient.post('/invoices', data),
    update: (id, data) => apiClient.put(`/invoices/${id}`, data),
    delete: (id) => apiClient.delete(`/invoices/${id}`),
  },

  // Units
  units: {
    getAll: (params) => apiClient.get('/units', { params }),
    getById: (id) => apiClient.get(`/units/${id}`),
    create: (data) => apiClient.post('/units', data),
    update: (id, data) => apiClient.put(`/units/${id}`, data),
    delete: (id) => apiClient.delete(`/units/${id}`),
  },

  // Dashboard
  dashboard: {
    getStats: () => apiClient.get('/dashboard/stats'),
    getRevenueData: (params) => apiClient.get('/dashboard/revenue', { params }),
    getOccupancyData: (params) => apiClient.get('/dashboard/occupancy', { params }),
  },

  // Agencies
  agencies: {
    getMe: () => apiClient.get('/agencies/me'),
    update: (data) => apiClient.put('/agencies/me', data),
  },

  // Users
  users: {
    getAll: (params) => apiClient.get('/users', { params }),
    getById: (id) => apiClient.get(`/users/${id}`),
    create: (data) => apiClient.post('/users', data),
    update: (id, data) => apiClient.put(`/users/${id}`, data),
    delete: (id) => apiClient.delete(`/users/${id}`),
  },

  // Notices
  notices: {
    getAll: (params) => apiClient.get('/notices', { params }),
    getById: (id) => apiClient.get(`/notices/${id}`),
    create: (data) => apiClient.post('/notices', data),
    update: (id, data) => apiClient.put(`/notices/${id}`, data),
    delete: (id) => apiClient.delete(`/notices/${id}`),
  },

  // Penalties
  penalties: {
    getAll: (params) => apiClient.get('/penalties', { params }),
    getById: (id) => apiClient.get(`/penalties/${id}`),
  },

  // Ratings
  ratings: {
    getTenantRating: (id) => apiClient.get(`/ratings/tenant/${id}`),
  },

  // Two-Factor Authentication
  twoFactor: {
    getStatus: () => apiClient.get('/2fa/status'),
    setup: () => apiClient.post('/2fa/setup'),
    enable: (token) => apiClient.post('/2fa/enable', { token }),
    disable: (token) => apiClient.post('/2fa/disable', { token }),
    verify: (token) => apiClient.post('/2fa/verify', { token }),
    sendEmailOTP: () => apiClient.post('/2fa/send-email-otp'),
    verifyEmailOTP: (otp) => apiClient.post('/2fa/verify-email-otp', { otp }),
    regenerateBackupCodes: (token) => apiClient.post('/2fa/regenerate-backup-codes', { token }),
  },

  // M-Pesa Payments (Safaricom Daraja)
  mpesa: {
    // C2B STK Push
    initiateStkPush: (data) => apiClient.post('/mpesa/stk-push', data),
    getStatus: (checkoutRequestId) => apiClient.get(`/mpesa/status/${checkoutRequestId}`),
    getDetailedStatus: (checkoutRequestId) => apiClient.get(`/mpesa/status-detailed/${checkoutRequestId}`),
    getTransactions: (params) => apiClient.get('/mpesa/transactions', { params }),
    getTransaction: (id) => apiClient.get(`/mpesa/transactions/${id}`),
    
    // B2C (Business to Customer - Refunds/Payouts)
    initiateB2C: (data) => apiClient.post('/mpesa/b2c', data),
    
    // Transaction Reversal
    reverseTransaction: (data) => apiClient.post('/mpesa/reverse', data),
    
    // Account Balance
    checkBalance: () => apiClient.post('/mpesa/balance'),
    getLatestBalance: () => apiClient.get('/mpesa/balance/latest'),
  },

  // KCB Buni Banking APIs
  kcb: {
    // M-Pesa STK Push (via KCB)
    initiateStkPush: (data) => apiClient.post('/kcb/stk-push', data),
    getStatus: (transactionRef) => apiClient.get(`/kcb/status/${transactionRef}`),
    
    // Account Statement
    getStatement: (data) => apiClient.post('/kcb/statement', data),
    getBalance: () => apiClient.get('/kcb/balance'),
    
    // Send to Bank (Inter-bank)
    sendToBank: (data) => apiClient.post('/kcb/send-to-bank', data),
    
    // Bank to Bank (KCB internal)
    bankToBank: (data) => apiClient.post('/kcb/bank-to-bank', data),
    
    // PesaLink
    sendViaPesaLink: (data) => apiClient.post('/kcb/pesalink', data),
    
    // Transactions
    getTransactions: (params) => apiClient.get('/kcb/transactions', { params }),
    
    // Bank Codes
    getBankCodes: () => apiClient.get('/kcb/bank-codes'),
  },

  // Card Payments (Stripe + Paystack)
  cards: {
    // Stripe
    createStripeIntent: (data) => apiClient.post('/cards/stripe/create-intent', data),
    getStripeStatus: (paymentIntentId) => apiClient.get(`/cards/stripe/status/${paymentIntentId}`),
    
    // Paystack
    initializePaystack: (data) => apiClient.post('/cards/paystack/initialize', data),
    verifyPaystack: (reference) => apiClient.get(`/cards/paystack/verify/${reference}`),
    
    // General
    getTransactions: (params) => apiClient.get('/cards/transactions', { params }),
    getTransaction: (id) => apiClient.get(`/cards/transactions/${id}`),
  },
};

export default api;
export { apiClient };
