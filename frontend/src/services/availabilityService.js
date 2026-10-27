import { fetchApi } from './apiClient';

export const availabilityService = {
  // Public Availability checking
  getAvailability: (slug, params = {}) => {
    // params expected: serviceId or serviceIds (array or csv), date (yyyy-MM-dd), staffId (optional)
    const cleanParams = Object.entries(params || {}).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = Array.isArray(val) ? val.join(',') : val;
      }
      return acc;
    }, {});
    const query = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/api/salons/${encodeURIComponent(slug)}/availability${query ? `?${query}` : ''}`, { method: 'GET', skipAuth: true });
  }
};
