using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class StaffBreakDTO
{
    [Required(ErrorMessage = "Break start time is required (e.g. '13:00').")]
    [RegularExpression(@"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "Start time must be in HH:mm format (e.g. 13:00).")]
    public string StartTime { get; set; } = string.Empty;

    [Required(ErrorMessage = "Break end time is required (e.g. '14:00').")]
    [RegularExpression(@"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "End time must be in HH:mm format (e.g. 14:00).")]
    public string EndTime { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Break title cannot exceed 100 characters.")]
    public string? Title { get; set; } = "Break";
}

public class StaffDayScheduleDTO
{
    [Required(ErrorMessage = "Day of week is required (0 = Sunday, 1 = Monday, ... 6 = Saturday).")]
    public DayOfWeek DayOfWeek { get; set; }

    public bool IsWorkingDay { get; set; } = true;

    [Required(ErrorMessage = "Work start time is required (e.g. '09:00').")]
    [RegularExpression(@"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "Start time must be in HH:mm format (e.g. 09:00).")]
    public string StartTime { get; set; } = "09:00";

    [Required(ErrorMessage = "Work end time is required (e.g. '18:00').")]
    [RegularExpression(@"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", ErrorMessage = "End time must be in HH:mm format (e.g. 18:00).")]
    public string EndTime { get; set; } = "18:00";

    public List<StaffBreakDTO> Breaks { get; set; } = new();
}

public class UpdateStaffScheduleRequest
{
    [Required(ErrorMessage = "Weekly schedule list is required.")]
    public List<StaffDayScheduleDTO> WeeklySchedule { get; set; } = new();
}

public class StaffDayScheduleResponse
{
    public DayOfWeek DayOfWeek { get; set; }

    public string DayName { get; set; } = string.Empty;

    public bool IsWorkingDay { get; set; }

    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;

    public List<StaffBreakDTO> Breaks { get; set; } = new();
}

