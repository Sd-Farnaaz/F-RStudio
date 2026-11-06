import { fetchApi } from './apiClient';

export const automationService = {
  // Live Message Logs (Email, InApp)
  getMessageLogs: (limit = 50) => fetchApi(`/api/admin/automation/reminders/logs?limit=${limit}`, { method: 'GET' }),

  // Re-engagement ("We Miss You" Campaigns)
  getReEngagementCandidates: (minWeeks = 6) => fetchApi(`/api/admin/automation/reengagement/candidates?minWeeks=${minWeeks}`, { method: 'GET' }),
  dispatchReEngagement: (data) => fetchApi('/api/admin/automation/reengagement/dispatch', { method: 'POST', body: data }),

  // Off-Peak Dynamic Pricing Rules
  getOffPeakRules: () => fetchApi('/api/admin/automation/discounts', { method: 'GET' }),
  createOffPeakRule: (data) => fetchApi('/api/admin/automation/discounts', { method: 'POST', body: data }),
  updateOffPeakRule: (id, data) => fetchApi(`/api/admin/automation/discounts/${id}`, { method: 'PUT', body: data }),
  deleteOffPeakRule: (id) => fetchApi(`/api/admin/automation/discounts/${id}`, { method: 'DELETE' }),

  // Email SMTP Relay Configuration & Live Test
  getSmtpConfig: () => fetchApi('/api/admin/automation/smtp', { method: 'GET' }),
  updateSmtpConfig: (data) => fetchApi('/api/admin/automation/smtp', { method: 'PUT', body: data }),
  testSmtpConfig: (data) => fetchApi('/api/admin/automation/smtp/test', { method: 'POST', body: data }),
};
