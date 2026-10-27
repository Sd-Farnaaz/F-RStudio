using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CreateAppointmentRequest
{
    [Required(ErrorMessage = "SalonId is required.")]
    public int SalonId { get; set; }

    [Required(ErrorMessage = "ServiceId is required.")]
    public int ServiceId { get; set; }

    /// <summary>
    /// Optional additional service IDs for multi-service bundle bookings.
    /// </summary>
    public List<int>? AdditionalServiceIds { get; set; }

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

    // Direct Payment Details
    public decimal AdvanceAmountRequired { get; set; }

    public decimal AmountPaid { get; set; }

    public string PaymentStatus { get; set; } = "NotRequired";

    public string? PaymentMethod { get; set; }

    public string? PaymentTransactionReference { get; set; }

    public string? PaymentProofUrl { get; set; }

    public DateTime? PaymentSubmittedAtUtc { get; set; }

    public DateTime? PaymentVerifiedAtUtc { get; set; }

    public string? PaymentVerifiedBy { get; set; }

    public string? PaymentNotes { get; set; }

    public string? SalonUpiId { get; set; }

    public string? SalonQrCodeImageUrl { get; set; }

    public bool HasReview { get; set; }

    public int? ReviewRating { get; set; }

    public int? ReviewId { get; set; }
}

public class AppointmentCalendarItemResponse
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string? CustomerEmail { get; set; }

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

    public string PaymentStatus { get; set; } = string.Empty;

    public decimal AmountPaid { get; set; }
}

public class RescheduleAppointmentRequest
{
    [Required(ErrorMessage = "NewStartAtUtc is required.")]
    public DateTime NewStartAtUtc { get; set; }

    public int? NewStaffId { get; set; }

    [StringLength(500, ErrorMessage = "Reason cannot exceed 500 characters.")]
    public string? Reason { get; set; }
}
