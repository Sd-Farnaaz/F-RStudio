import { fetchApi } from './apiClient';

export const adminService = {
  // Salon Profile
  getSalonProfile: () => fetchApi('/api/admin/salon/profile', { method: 'GET' }),
  updateSalonProfile: (data) => fetchApi('/api/admin/salon/profile', { method: 'PUT', body: data }),

  // Services Catalog
  getServices: () => fetchApi('/api/admin/services', { method: 'GET' }),
  getServiceById: (id) => fetchApi(`/api/admin/services/${id}`, { method: 'GET' }),
  createService: (data) => fetchApi('/api/admin/services', { method: 'POST', body: data }),
  updateService: (id, data) => fetchApi(`/api/admin/services/${id}`, { method: 'PUT', body: data }),
  updateServiceStatus: (id, isActive) => fetchApi(`/api/admin/services/${id}/status`, { method: 'PATCH', body: { isActive } }),
  deleteService: (id) => fetchApi(`/api/admin/services/${id}`, { method: 'DELETE' }),
  uploadServiceImage: (serviceId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi(`/api/admin/services/${serviceId}/image`, {
      method: 'POST',
      body: formData
    });
  },
  deleteServiceImage: (serviceId) => fetchApi(`/api/admin/services/${serviceId}/image`, { method: 'DELETE' }),

  // Salon Branding / Logo
  uploadSalonLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi('/api/admin/salon/profile/logo', {
      method: 'POST',
      body: formData
    });
  },

  // Vendor Analytics & Dashboard
  getAnalyticsRevenue: () => fetchApi('/api/vendors/analytics/revenue', { method: 'GET' }),
  getDashboardSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/admin/dashboard/summary${query ? `?${query}` : ''}`, { method: 'GET' });
  },
};

