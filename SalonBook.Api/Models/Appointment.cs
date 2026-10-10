namespace SalonBook.Api.Models;

public class Appointment
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public int CustomerId { get; set; }

    public int StaffId { get; set; }

    public int ServiceId { get; set; }

    public DateTime StartAtUtc { get; set; }

    public DateTime EndAtUtc { get; set; }

    public string Status { get; set; } = "Confirmed"; // Pending, Confirmed, Cancelled, Completed, NoShow

    public decimal PriceAtBooking { get; set; }

    public string ServiceNameAtBooking { get; set; } = string.Empty;

    public int DurationMinutesAtBooking { get; set; }

    public string? CustomerNotes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    public DateTime? CancelledAtUtc { get; set; }

    public string? CancellationReason { get; set; }

    // Direct Payment Tracking
    public decimal AdvanceAmountRequired { get; set; } = 0.00m;

    public decimal AmountPaid { get; set; } = 0.00m;

    public string PaymentStatus { get; set; } = "NotRequired"; // NotRequired, Pending, PartiallyPaid, Paid, Failed, Refunded

    public string? PaymentMethod { get; set; } // UPI, Cash, Card, DirectQR, None

    public string? PaymentTransactionReference { get; set; }

    public string? PaymentProofUrl { get; set; }

    public DateTime? PaymentSubmittedAtUtc { get; set; }

    public DateTime? PaymentVerifiedAtUtc { get; set; }

    public int? PaymentVerifiedByUserId { get; set; }

    public string? PaymentNotes { get; set; }

    // Navigation properties
    public User? PaymentVerifiedByUser { get; set; }
    public Salon Salon { get; set; } = null!;

    public User Customer { get; set; } = null!;

    public Staff Staff { get; set; } = null!;

    public Service Service { get; set; } = null!;

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public ICollection<AppointmentReminder> Reminders { get; set; } = new List<AppointmentReminder>();
}

