namespace SalonBook.Api.DTOs;

public class AvailabilitySlotResponse
{
    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;

    public List<PublicStaffResponse> AvailableStaff { get; set; } = new();

    /// <summary>
    /// AI/Smart Schedule Gap Optimization flag.
    /// Indicates whether this slot seamlessly attaches to existing bookings or shift edges, avoiding awkward 15-30 min idle gaps.
    /// </summary>
    public bool IsGapOptimized { get; set; }

    public string? OptimizationReason { get; set; }

    /// <summary>
    /// Off-Peak / Flash dynamic discount active for this time slot.
    /// </summary>
    public bool HasFlashDiscount { get; set; }

    public decimal? DiscountPercentage { get; set; }

    public decimal? OriginalPrice { get; set; }

    public decimal? DiscountedPrice { get; set; }

    public string? FlashDiscountTitle { get; set; }
}

public class SalonAvailabilityResponse
{
    public string Date { get; set; } = string.Empty;

    public string DayOfWeek { get; set; } = string.Empty;

    public string TimeZone { get; set; } = string.Empty;

    public int ServiceId { get; set; }

    public string ServiceName { get; set; } = string.Empty;

    public int DurationMinutes { get; set; }

    public List<AvailabilitySlotResponse> Slots { get; set; } = new();
}

