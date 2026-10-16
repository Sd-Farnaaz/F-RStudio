import { fetchApi } from './apiClient';

/**
 * Clean query parameter objects by stripping undefined, null, or empty string values.
 */
function toQueryString(params = {}) {
  const cleanParams = Object.entries(params || {}).reduce((acc, [key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      acc[key] = val;
    }
    return acc;
  }, {});
  const query = new URLSearchParams(cleanParams).toString();
  return query ? `?${query}` : '';
}

export const superAdminService = {
  // 1. Overview Dashboard
  getOverview: () => fetchApi('/api/superadmin/overview', { method: 'GET' }),

  // 2. Salon Management
  getSalons: (params = {}) => {
    const query = toQueryString(params);
    return fetchApi(`/api/superadmin/salons${query}`, { method: 'GET' });
  },

  getSalonById: (id) => fetchApi(`/api/superadmin/salons/${id}`, { method: 'GET' }),

  updateSalonStatus: (id, { isActive, reason }) =>
    fetchApi(`/api/superadmin/salons/${id}/status`, {
      method: 'PATCH',
      body: { isActive, reason }
    }),

  updateSalonKyc: (id, { kycStatus, isVerified = true, notes }) =>
    fetchApi(`/api/superadmin/salons/${id}/kyc`, {
      method: 'PATCH',
      body: { kycStatus, isVerified, notes }
    }),

  // 3. User Management
  getUsers: (params = {}) => {
    const query = toQueryString(params);
    return fetchApi(`/api/superadmin/users${query}`, { method: 'GET' });
  },

  updateUserStatus: (id, { isActive }) =>
    fetchApi(`/api/superadmin/users/${id}/status`, {
      method: 'PATCH',
      body: { isActive }
    })
};
