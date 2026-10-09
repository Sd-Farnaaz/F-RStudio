import { fetchApi } from './apiClient';

export const publicService = {
  // Public Discovery
  getSalons: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/salons${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getSalonBySlug: (slug) => fetchApi(`/api/salons/${slug}`, { method: 'GET' }),
  getSalonServices: (slug) => fetchApi(`/api/salons/${slug}/services`, { method: 'GET' }),
};
