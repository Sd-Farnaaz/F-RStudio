namespace SalonBook.Api.DTOs;

public class AvailabilitySlotResponse
{
    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;

    public List<PublicStaffResponse> AvailableStaff { get; set; } = new();
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

