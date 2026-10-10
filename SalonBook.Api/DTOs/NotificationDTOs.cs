namespace SalonBook.Api.DTOs;

public record NotificationResponse(
    int Id,
    int RecipientUserId,
    int? SalonId,
    int? AppointmentId,
    string Type,
    string Channel,
    string Subject,
    string Message,
    string Status,
    bool IsRead,
    DateTime? ReadAtUtc,
    DateTime? SentAtUtc,
    DateTime CreatedAtUtc
);

public record UnreadNotificationCountResponse(
    int UnreadCount
);

public record MarkAllNotificationsReadResponse(
    int MarkedReadCount
);

