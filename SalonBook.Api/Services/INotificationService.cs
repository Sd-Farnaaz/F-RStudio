using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public interface INotificationService
{
    Task DispatchAppointmentEventAsync(Appointment appointment, string eventType, CancellationToken cancellationToken = default);

    Task ProcessReminderAsync(int reminderId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<NotificationResponse>> GetCustomerNotificationsAsync(int customerId, bool? unreadOnly, int skip, int take, CancellationToken cancellationToken = default);

    Task<int> GetCustomerUnreadCountAsync(int customerId, CancellationToken cancellationToken = default);

    Task<bool> MarkNotificationReadAsync(int notificationId, int userId, CancellationToken cancellationToken = default);

    Task<int> MarkAllCustomerNotificationsReadAsync(int customerId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<NotificationResponse>> GetAdminNotificationsAsync(int salonId, int adminUserId, bool? unreadOnly, int skip, int take, CancellationToken cancellationToken = default);

    Task<int> GetAdminUnreadCountAsync(int salonId, int adminUserId, CancellationToken cancellationToken = default);

    Task<int> MarkAllAdminNotificationsReadAsync(int salonId, int adminUserId, CancellationToken cancellationToken = default);
}

