import { fetchApi } from './apiClient';

export const paymentService = {
  // Salon Admin Payment Settings
  getPaymentSettings: () => fetchApi('/api/admin/salon/payment-settings', { method: 'GET' }),
  updatePaymentSettings: (data) => fetchApi('/api/admin/salon/payment-settings', { method: 'PUT', body: data }),

  // Customer Payment Proof Submission (Direct UPI / Offline transfer)
  submitPaymentProof: (appointmentId, data) => 
    fetchApi(`/api/appointments/${appointmentId}/payment-proof`, { method: 'POST', body: data }),

  // Admin Manual Payment Verification
  verifyPayment: (appointmentId, data) => 
    fetchApi(`/api/admin/appointments/${appointmentId}/verify-payment`, { method: 'POST', body: data }),

  // Online Gateway Integration (Razorpay / UPI / Card)
  createPaymentOrder: (appointmentId, amountType = 'Advance', paymentGateway = 'Razorpay') =>
    fetchApi('/api/payments/create-order', {
      method: 'POST',
      body: { appointmentId, amountType, paymentGateway }
    }),

  verifyOnlinePayment: (data) =>
    fetchApi('/api/payments/verify', {
      method: 'POST',
      body: data
    }),

  // Digital GST Tax Invoice
  getAppointmentInvoice: (appointmentId) =>
    fetchApi(`/api/appointments/${appointmentId}/invoice`, { method: 'GET' }),
};
