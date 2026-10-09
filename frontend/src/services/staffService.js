import { fetchApi } from './apiClient';

export const staffService = {
  getStaffList: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/admin/staff${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  
  getStaffById: (id) => fetchApi(`/api/admin/staff/${id}`, { method: 'GET' }),
  
  createStaff: (data) => fetchApi('/api/admin/staff', { method: 'POST', body: data }),
  
  updateStaff: (id, data) => fetchApi(`/api/admin/staff/${id}`, { method: 'PUT', body: data }),
  
  updateStaffStatus: (id, isActive) => fetchApi(`/api/admin/staff/${id}/status`, { method: 'PATCH', body: { isActive } }),
  
  deleteStaff: (id) => fetchApi(`/api/admin/staff/${id}`, { method: 'DELETE' }),
  
  getStaffSchedule: (id) => fetchApi(`/api/admin/staff/${id}/schedule`, { method: 'GET' }),
  
  updateStaffSchedule: (id, data) => fetchApi(`/api/admin/staff/${id}/schedule`, { method: 'PUT', body: data })
};
