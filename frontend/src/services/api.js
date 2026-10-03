const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('fintrack_token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      if (token && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');
        window.dispatchEvent(new Event('auth-expired'));
      }
    }
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    me: () => request('/auth/me'),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
  },

  // Expenses
  expenses: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/expenses${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/expenses/${id}`),
    create: (formData) => request('/expenses', { method: 'POST', body: formData }),
    update: (id, formData) => request(`/expenses/${id}`, { method: 'PUT', body: formData }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
    suggestCategory: (title) => request(`/expenses/suggest-category?title=${encodeURIComponent(title)}`),
  },

  // Income
  income: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/income${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/income/${id}`),
    create: (data) => request('/income', { method: 'POST', body: data }),
    update: (id, data) => request(`/income/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/income/${id}`, { method: 'DELETE' }),
  },

  // Budget
  budget: {
    get: (month) => request(`/budget${month ? `?month=${month}` : ''}`),
    getHistory: () => request('/budget/history'),
    set: (data) => request('/budget', { method: 'POST', body: data }),
    delete: (id) => request(`/budget/${id}`, { method: 'DELETE' }),
  },

  // Categories
  categories: {
    getAll: () => request('/categories'),
    create: (data) => request('/categories', { method: 'POST', body: data }),
    update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },

  // Reports
  reports: {
    getSummary: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/reports/summary${query ? `?${query}` : ''}`);
    },
    getInsights: () => request('/reports/insights'),
  },

  // Admin
  admin: {
    getStatistics: () => request('/admin/statistics'),
    getUsers: () => request('/admin/users'),
    deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
    getAllExpenses: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/admin/expenses${query ? `?${query}` : ''}`);
    },
    deleteExpense: (id) => request(`/admin/expenses/${id}`, { method: 'DELETE' }),
    getAnalytics: () => request('/admin/analytics'),
  },
};

export default api;
