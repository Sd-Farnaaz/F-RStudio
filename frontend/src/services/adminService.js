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

  // Vendor Analytics
  getAnalyticsRevenue: () => fetchApi('/api/vendors/analytics/revenue', { method: 'GET' }),
};
