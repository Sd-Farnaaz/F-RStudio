import { fetchApi } from './apiClient';

export const customerDossierService = {
  getDossier: () => fetchApi('/api/customer/dossier', { method: 'GET' }),
  updateDossier: (data) => fetchApi('/api/customer/dossier', { method: 'PUT', body: data }),
  getCareReminders: () => fetchApi('/api/customer/dossier/care-reminders', { method: 'GET' })
};
