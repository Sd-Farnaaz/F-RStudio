import { fetchApi } from './apiClient';

export const availabilityService = {
  // We prefer the scoped route
  getAvailability: (slug, params) => {
    // params expected: serviceId, date (yyyy-MM-dd), staffId (optional)
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/salons/${slug}/availability${query ? `?${query}` : ''}`, { method: 'GET' });
  }
};
