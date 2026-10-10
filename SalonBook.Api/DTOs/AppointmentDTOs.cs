using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CreateAppointmentRequest
{
    [Required(ErrorMessage = "SalonId is required.")]
    public int SalonId { get; set; }

    [Required(ErrorMessage = "ServiceId is required.")]
    public int ServiceId { get; set; }

    /// <summary>
    /// Optional specific staff member. If omitted, the server selects an available staff member.
    /// </summary>
    public int? StaffId { get; set; }

    [Required(ErrorMessage = "StartAtUtc is required.")]
    public DateTime StartAtUtc { get; set; }

    [StringLength(500, ErrorMessage = "Customer notes cannot exceed 500 characters.")]
    public string? CustomerNotes { get; set; }
}

public class CancelAppointmentRequest
{
    [StringLength(500, ErrorMessage = "Cancellation reason cannot exceed 500 characters.")]
    public string? Reason { get; set; }
}

public class UpdateAppointmentStatusRequest
{
    [Required(ErrorMessage = "Target status is required.")]
    [StringLength(30, ErrorMessage = "Status cannot exceed 30 characters.")]
    public string Status { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Reason cannot exceed 500 characters.")]
    public string? Reason { get; set; }
}

public class AppointmentResponse
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string SalonName { get; set; } = string.Empty;

    public string SalonSlug { get; set; } = string.Empty;

    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerEmail { get; set; } = string.Empty;

    public string? CustomerPhone { get; set; }

    public int StaffId { get; set; }

    public string StaffName { get; set; } = string.Empty;

    public string? StaffTitle { get; set; }

    public int ServiceId { get; set; }

    public string ServiceName { get; set; } = string.Empty;

    public int DurationMinutes { get; set; }

    public decimal Price { get; set; }

    public DateTime StartAtUtc { get; set; }

    public DateTime EndAtUtc { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? CustomerNotes { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public DateTime? CancelledAtUtc { get; set; }

    public string? CancellationReason { get; set; }
}

public class AppointmentCalendarItemResponse
{
    public int Id { get; set; }

    public int StaffId { get; set; }

    public string StaffName { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string ServiceName { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public DateTime StartAtUtc { get; set; }

    public DateTime EndAtUtc { get; set; }

    public string Status { get; set; } = string.Empty;
}

