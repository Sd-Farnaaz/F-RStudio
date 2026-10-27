import { fetchApi } from './apiClient';

export const posService = {
  quickCheckout: (data) => fetchApi('/api/admin/pos/quick-checkout', { method: 'POST', body: data }),
  getReceipt: (appointmentId) => fetchApi(`/api/admin/pos/receipt/${appointmentId}`, { method: 'GET' })
};

