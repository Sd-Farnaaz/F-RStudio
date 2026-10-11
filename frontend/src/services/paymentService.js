import { fetchApi } from './apiClient';

export const paymentService = {
  // Salon Admin Payment Settings
  getPaymentSettings: () => fetchApi('/api/admin/salon/payment-settings', { method: 'GET' }),
  updatePaymentSettings: (data) => fetchApi('/api/admin/salon/payment-settings', { method: 'PUT', body: data }),

  // Customer Payment Proof Submission
  submitPaymentProof: (appointmentId, data) => 
    fetchApi(`/api/appointments/${appointmentId}/payment-proof`, { method: 'POST', body: data }),

  // Admin Payment Verification
  verifyPayment: (appointmentId, data) => 
    fetchApi(`/api/admin/appointments/${appointmentId}/verify-payment`, { method: 'POST', body: data }),
};
