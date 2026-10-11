import { fetchApi } from './apiClient';

export const customerService = {
  getCustomers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/admin/customers${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getCustomerById: (id) => fetchApi(`/api/admin/customers/${id}`, { method: 'GET' }),
  createCustomer: (data) => fetchApi('/api/admin/customers', { method: 'POST', body: data }),
};
