namespace SalonBook.Api.Models;

public class Notification
{
    public int Id { get; set; }

    public int RecipientUserId { get; set; }

    public int? SalonId { get; set; }

    public int? AppointmentId { get; set; }

    /// <summary>
    /// Event type: AppointmentCreated, AppointmentConfirmed, AppointmentCancelled, AppointmentStatusChanged, AppointmentReminder24H, AppointmentReminder2H.
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Delivery channel: InApp, Email.
    /// </summary>
    public string Channel { get; set; } = "InApp";

    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Delivery status: Pending, Sent, Failed, Skipped.
    /// </summary>
    public string Status { get; set; } = "Pending";

    public bool IsRead { get; set; } = false;

    public DateTime? ReadAtUtc { get; set; }

    public DateTime? SentAtUtc { get; set; }

    public int RetryCount { get; set; } = 0;

    public DateTime? NextAttemptAtUtc { get; set; }

    public string? LastErrorCode { get; set; }

    public string? ErrorMessage { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User Recipient { get; set; } = null!;

    public Salon? Salon { get; set; }

    public Appointment? Appointment { get; set; }
}

