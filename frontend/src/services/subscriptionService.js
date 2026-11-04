import { fetchApi } from './apiClient';

export const subscriptionService = {
  // Salon Vendor subscription management
  getSalonSubscription: () => fetchApi('/api/vendor/subscription', { method: 'GET' }),
  
  createSubscriptionOrder: (data) => fetchApi('/api/vendor/subscription/create-order', {
    method: 'POST',
    body: data
  }),

  verifySubscriptionPayment: (data) => fetchApi('/api/vendor/subscription/verify-payment', {
    method: 'POST',
    body: data
  }),

  getSubscriptionTransactions: () => fetchApi('/api/vendor/subscription/transactions', {
    method: 'GET'
  }),

  upgradeSubscription: (data) => fetchApi('/api/vendor/subscription/upgrade', {
    method: 'POST',
    body: data
  }),
  
  cancelSubscription: () => fetchApi('/api/vendor/subscription/cancel', {
    method: 'POST'
  }),

  // SuperAdmin platform overview & tier management
  getSuperAdminSubscriptions: () => fetchApi('/api/superadmin/subscriptions', { method: 'GET' }),

  adminAssignTier: (salonId, data) => fetchApi(`/api/superadmin/salons/${salonId}/subscription`, {
    method: 'PUT',
    body: data
  })
};
