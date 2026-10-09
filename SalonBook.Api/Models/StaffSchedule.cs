namespace SalonBook.Api.Models;

public class StaffSchedule
{
    public int Id { get; set; }

    public int StaffId { get; set; }

    public DayOfWeek DayOfWeek { get; set; }

    public bool IsWorkingDay { get; set; } = true;

    public TimeSpan StartTime { get; set; } = new TimeSpan(9, 0, 0); // 09:00:00

    public TimeSpan EndTime { get; set; } = new TimeSpan(18, 0, 0); // 18:00:00

    // Navigation properties
    public Staff Staff { get; set; } = null!;

    public ICollection<StaffBreak> Breaks { get; set; } = new List<StaffBreak>();
}

