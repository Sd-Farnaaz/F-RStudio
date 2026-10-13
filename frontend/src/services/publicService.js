import { fetchApi } from './apiClient';

export const publicService = {
  // Public Discovery
  getSalons: (params = {}) => {
    const cleanParams = Object.entries(params || {}).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});
    const query = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/api/salons${query ? `?${query}` : ''}`, { method: 'GET', skipAuth: true });
  },
  getSalonBySlug: (slug) => fetchApi(`/api/salons/${encodeURIComponent(slug)}`, { method: 'GET', skipAuth: true }),
  getSalonServices: (slug, params = {}) => {
    const cleanParams = Object.entries(params || {}).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});
    const query = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/api/salons/${encodeURIComponent(slug)}/services${query ? `?${query}` : ''}`, { method: 'GET', skipAuth: true });
  },
};
