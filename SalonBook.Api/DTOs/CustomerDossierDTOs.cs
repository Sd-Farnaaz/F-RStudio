using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CustomerDossierResponse
{
    public int CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? Allergies { get; set; }
    public string? SkinOrHairNotes { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public bool IsPatchTested { get; set; }
    public DateTime? PatchTestDate { get; set; }
    public List<CustomerSalonCardResponse> SalonCards { get; set; } = new();
    public List<CustomerFormulaItemResponse> Formulas { get; set; } = new();
    public List<CustomerCareReminderResponse> CareReminders { get; set; } = new();
}

public class CustomerSalonCardResponse
{
    public int Id { get; set; }
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string SalonSlug { get; set; } = string.Empty;
    public string? Allergies { get; set; }
    public string? SkinOrHairNotes { get; set; }
    public bool IsPatchTested { get; set; }
    public DateTime? PatchTestDate { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class CustomerFormulaItemResponse
{
    public int Id { get; set; }
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string SalonSlug { get; set; } = string.Empty;
    public int? AppointmentId { get; set; }
    public string? StaffName { get; set; }
    public string Category { get; set; } = string.Empty;
    public string FormulaDetails { get; set; } = string.Empty;
    public string? Developer { get; set; }
    public int? ProcessingTimeMinutes { get; set; }
    public string? Notes { get; set; }
    public DateTime ServiceDateUtc { get; set; }
}

public class CustomerCareReminderResponse
{
    public string ReminderType { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string SalonSlug { get; set; } = string.Empty;
    public DateTime LastVisitUtc { get; set; }
    public int RecommendedIntervalWeeks { get; set; }
    public string DueStatus { get; set; } = "Due Soon";
    public string RecommendationMessage { get; set; } = string.Empty;
    public decimal? ActiveOffPeakDiscount { get; set; }
}

public class UpdateCustomerDossierRequest
{
    [StringLength(1000, ErrorMessage = "Allergies notes cannot exceed 1000 characters.")]
    public string? Allergies { get; set; }

    [StringLength(2000, ErrorMessage = "Skin/Hair notes cannot exceed 2000 characters.")]
    public string? SkinOrHairNotes { get; set; }

    [StringLength(150, ErrorMessage = "Emergency contact name cannot exceed 150 characters.")]
    public string? EmergencyContactName { get; set; }

    [StringLength(50, ErrorMessage = "Emergency contact phone cannot exceed 50 characters.")]
    public string? EmergencyContactPhone { get; set; }

    public int? SalonId { get; set; }
}
