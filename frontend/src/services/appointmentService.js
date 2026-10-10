import { fetchApi } from './apiClient';

export const appointmentService = {
  // Customer endpoints
  createAppointment: (data) => fetchApi('/api/appointments', { method: 'POST', body: data }),
  getMyAppointments: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/appointments/my${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getAppointment: (id) => fetchApi(`/api/appointments/${id}`, { method: 'GET' }),
  cancelAppointment: (id, reason) => fetchApi(`/api/appointments/${id}/cancel`, { method: 'POST', body: { reason } }),

  // Admin endpoints
  getAdminAppointments: (params) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/admin/appointments${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getAdminAppointment: (id) => fetchApi(`/api/admin/appointments/${id}`, { method: 'GET' }),
  updateAppointmentStatus: (id, status, reason) => fetchApi(`/api/admin/appointments/${id}/status`, { method: 'PATCH', body: { status, reason } }),
  getCalendar: (startUtc, endUtc, staffId) => {
    const params = { startUtc, endUtc };
    if (staffId) params.staffId = staffId;
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/admin/appointments/calendar?${query}`, { method: 'GET' });
  }
};

export function getTimeZoneOffset(timeZone, dateStr) {
  try {
      const d = new Date(dateStr);
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(d);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (!tzPart) return 'Z';
      const tzName = tzPart.value;
      if (tzName === 'GMT' || tzName === 'UTC') return 'Z';
      let offset = tzName.replace('GMT', '').replace('UTC', '');
      if (!offset) return 'Z';
      
      const sign = offset[0];
      let [hours, mins] = offset.substring(1).split(':');
      hours = hours.padStart(2, '0');
      mins = mins || '00';
      return `${sign}${hours}:${mins}`;
  } catch (e) {
      return 'Z';
  }
}

export function toUtcIso(dateStr, timeStr, timeZone) {
  const offset = getTimeZoneOffset(timeZone, `${dateStr}T12:00:00Z`);
  const dt = new Date(`${dateStr}T${timeStr}:00${offset}`);
  return dt.toISOString();
}

export function formatInTimeZone(utcDateStr, timeZone, options = {}) {
  try {
    const d = new Date(utcDateStr);
    return new Intl.DateTimeFormat('en-US', { timeZone, ...options }).format(d);
  } catch (e) {
    return new Date(utcDateStr).toLocaleString();
  }
}
