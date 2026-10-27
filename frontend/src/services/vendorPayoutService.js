import { fetchApi } from './apiClient';

export const vendorPayoutService = {
  getPayouts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/vendors/payouts${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getEscrowLedger: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/vendors/escrow-ledger${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  requestSettlement: () => fetchApi('/api/vendors/payouts/request-settlement', {
    method: 'POST'
  }),

  disbursePayout: (id, data) => fetchApi(`/api/vendors/payouts/${id}/disburse`, {
    method: 'POST',
    body: data
  })
};
