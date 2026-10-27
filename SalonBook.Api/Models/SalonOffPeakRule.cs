namespace SalonBook.Api.Models;

public class SalonOffPeakRule
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Comma-separated days of week, e.g. "Tuesday,Wednesday".
    /// </summary>
    public string DaysOfWeek { get; set; } = string.Empty;

    /// <summary>
    /// Start time in "HH:mm" 24h format, e.g. "10:00".
    /// </summary>
    public string StartTime { get; set; } = "10:00";

    /// <summary>
    /// End time in "HH:mm" 24h format, e.g. "13:00".
    /// </summary>
    public string EndTime { get; set; } = "13:00";

    /// <summary>
    /// Discount percentage, e.g. 20.00 for 20% off.
    /// </summary>
    public decimal DiscountPercentage { get; set; } = 20.00m;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation property
    public Salon Salon { get; set; } = null!;
}

