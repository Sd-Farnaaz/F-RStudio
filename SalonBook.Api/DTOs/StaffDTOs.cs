using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CreateStaffRequest
{
    [Required(ErrorMessage = "Staff full name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 150 characters.")]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Invalid email format.")]
    [StringLength(256, ErrorMessage = "Email cannot exceed 256 characters.")]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Invalid phone number format.")]
    [StringLength(30, ErrorMessage = "Phone number cannot exceed 30 characters.")]
    public string? PhoneNumber { get; set; }

    [StringLength(100, ErrorMessage = "Job title/specialization cannot exceed 100 characters.")]
    public string? Title { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Optional initial weekly schedule configuration.
    /// </summary>
    public List<StaffDayScheduleDTO>? WeeklySchedule { get; set; }
}

public class UpdateStaffRequest
{
    [Required(ErrorMessage = "Staff full name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 150 characters.")]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Invalid email format.")]
    [StringLength(256, ErrorMessage = "Email cannot exceed 256 characters.")]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Invalid phone number format.")]
    [StringLength(30, ErrorMessage = "Phone number cannot exceed 30 characters.")]
    public string? PhoneNumber { get; set; }

    [StringLength(100, ErrorMessage = "Job title/specialization cannot exceed 100 characters.")]
    public string? Title { get; set; }

    public bool IsActive { get; set; } = true;
}

public class UpdateStaffStatusRequest
{
    public bool IsActive { get; set; }
}

public class StaffResponse
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Title { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public List<StaffDayScheduleResponse> Schedules { get; set; } = new();
}

public class PublicStaffResponse
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Title { get; set; }

    public bool IsActive { get; set; }
}

