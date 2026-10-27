namespace SalonBook.Api.Models;

public class Review
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public int CustomerId { get; set; }

    public int AppointmentId { get; set; }

    public int? StaffId { get; set; }

    /// <summary>
    /// Overall star rating between 1 and 5.
    /// </summary>
    public int Rating { get; set; }

    /// <summary>
    /// Optional specific rating for salon cleanliness (1-5).
    /// </summary>
    public int? CleanlinessRating { get; set; }

    /// <summary>
    /// Optional specific rating for staff friendliness & skill (1-5).
    /// </summary>
    public int? StaffRating { get; set; }

    /// <summary>
    /// Optional specific rating for value for money (1-5).
    /// </summary>
    public int? ValueRating { get; set; }

    public string? Title { get; set; }

    public string Comment { get; set; } = string.Empty;

    /// <summary>
    /// JSON array of photo URLs uploaded by client.
    /// </summary>
    public string? PhotoUrlsJson { get; set; }

    /// <summary>
    /// True if client completed an actual verified booking on SalonBook.
    /// </summary>
    public bool IsVerifiedVisit { get; set; } = true;

    /// <summary>
    /// Official response from the salon manager / owner.
    /// </summary>
    public string? OwnerReply { get; set; }

    public DateTime? OwnerRepliedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation properties
    public Salon Salon { get; set; } = null!;

    public User Customer { get; set; } = null!;

    public Appointment Appointment { get; set; } = null!;

    public Staff? Staff { get; set; }
}
