import { fetchApi } from './apiClient';

export const clientDossierService = {
  getDossier: (customerId) => fetchApi(`/api/admin/customers/${customerId}/dossier`, { method: 'GET' }),
  updateConsultation: (customerId, data) => fetchApi(`/api/admin/customers/${customerId}/consultation`, { method: 'PUT', body: data }),
  addFormula: (customerId, data) => fetchApi(`/api/admin/customers/${customerId}/formulas`, { method: 'POST', body: data }),
  deleteFormula: (customerId, formulaId) => fetchApi(`/api/admin/customers/${customerId}/formulas/${formulaId}`, { method: 'DELETE' })
};

