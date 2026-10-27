import { fetchApi } from './apiClient';

export const reviewService = {
  // Public reviews for salon detail page
  getSalonReviews: (slug, params = {}) => {
    const cleanParams = Object.entries(params || {}).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});
    const query = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/api/salons/${encodeURIComponent(slug)}/reviews${query ? `?${query}` : ''}`, {
      method: 'GET',
      skipAuth: true
    });
  },

  // Customer submitting review for completed appointment
  submitAppointmentReview: (appointmentId, data) => {
    return fetchApi(`/api/appointments/${appointmentId}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Customer getting review for an appointment
  getAppointmentReview: (appointmentId) => {
    return fetchApi(`/api/appointments/${appointmentId}/review`, {
      method: 'GET'
    });
  },

  // Salon Admin managing reviews
  getAdminReviews: (params = {}) => {
    const cleanParams = Object.entries(params || {}).reduce((acc, [key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        acc[key] = val;
      }
      return acc;
    }, {});
    const query = new URLSearchParams(cleanParams).toString();
    return fetchApi(`/api/admin/reviews${query ? `?${query}` : ''}`, {
      method: 'GET'
    });
  },

  // Salon Admin replying to review
  replyToReview: (reviewId, replyText) => {
    return fetchApi(`/api/admin/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply: replyText })
    });
  }
};
