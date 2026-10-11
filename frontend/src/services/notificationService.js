import { fetchApi } from './apiClient';

export const notificationService = {
  // Admin Endpoints
  getAdminNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/admin/notifications${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getAdminUnreadCount: () => {
    return fetchApi('/api/admin/notifications/unread-count', { method: 'GET' });
  },

  markAdminNotificationRead: (id) => {
    return fetchApi(`/api/admin/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllAdminNotificationsRead: () => {
    return fetchApi('/api/admin/notifications/read-all', { method: 'POST' });
  },

  // Customer Endpoints
  getCustomerNotifications: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/api/notifications/my${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  getCustomerUnreadCount: () => {
    return fetchApi('/api/notifications/unread-count', { method: 'GET' });
  },

  markCustomerNotificationRead: (id) => {
    return fetchApi(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  markAllCustomerNotificationsRead: () => {
    return fetchApi('/api/notifications/read-all', { method: 'POST' });
  },

  // Role-Aware Helpers
  getNotificationsByRole: (role, params = {}) => {
    const isAdmin = role === 'Admin' || role === 'SalonAdmin';
    return isAdmin
      ? notificationService.getAdminNotifications(params)
      : notificationService.getCustomerNotifications(params);
  },

  getUnreadCountByRole: (role) => {
    const isAdmin = role === 'Admin' || role === 'SalonAdmin';
    return isAdmin
      ? notificationService.getAdminUnreadCount()
      : notificationService.getCustomerUnreadCount();
  },

  markAsReadByRole: (role, id) => {
    const isAdmin = role === 'Admin' || role === 'SalonAdmin';
    return isAdmin
      ? notificationService.markAdminNotificationRead(id)
      : notificationService.markCustomerNotificationRead(id);
  },

  markAllAsReadByRole: (role) => {
    const isAdmin = role === 'Admin' || role === 'SalonAdmin';
    return isAdmin
      ? notificationService.markAllAdminNotificationsRead()
      : notificationService.markAllCustomerNotificationsRead();
  },
};
