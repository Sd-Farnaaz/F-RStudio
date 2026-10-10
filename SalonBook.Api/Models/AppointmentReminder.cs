namespace SalonBook.Api.Models;

public class AppointmentReminder
{
    public int Id { get; set; }

    public int AppointmentId { get; set; }

    /// <summary>
    /// Reminder type: 24Hours, 2Hours.
    /// </summary>
    public string ReminderType { get; set; } = string.Empty;

    public DateTime ScheduledForUtc { get; set; }

    /// <summary>
    /// Status: Pending, Processed, Skipped, Failed.
    /// </summary>
    public string Status { get; set; } = "Pending";

    public DateTime? ProcessedAtUtc { get; set; }

    public string? LastError { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Appointment Appointment { get; set; } = null!;
}

