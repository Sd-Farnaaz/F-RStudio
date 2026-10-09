namespace SalonBook.Api.Models;

public class StaffBreak
{
    public int Id { get; set; }

    public int StaffScheduleId { get; set; }

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public string? Title { get; set; } = "Break";

    // Navigation property
    public StaffSchedule StaffSchedule { get; set; } = null!;
}

