using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class ClientConsultationCardResponse
{
    public int Id { get; set; }
    public int SalonId { get; set; }
    public int CustomerId { get; set; }
    public string? Allergies { get; set; }
    public string? SkinOrHairNotes { get; set; }
    public string? PrivateStaffNotes { get; set; }
    public bool IsPatchTested { get; set; }
    public DateTime? PatchTestDate { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class UpdateClientConsultationRequest
{
    [StringLength(1000, ErrorMessage = "Allergies notes cannot exceed 1000 characters.")]
    public string? Allergies { get; set; }

    [StringLength(2000, ErrorMessage = "Skin/Hair notes cannot exceed 2000 characters.")]
    public string? SkinOrHairNotes { get; set; }

    [StringLength(3000, ErrorMessage = "Private staff notes cannot exceed 3000 characters.")]
    public string? PrivateStaffNotes { get; set; }

    public bool IsPatchTested { get; set; }

    public DateTime? PatchTestDate { get; set; }

    [StringLength(150, ErrorMessage = "Emergency contact name cannot exceed 150 characters.")]
    public string? EmergencyContactName { get; set; }

    [StringLength(50, ErrorMessage = "Emergency contact phone cannot exceed 50 characters.")]
    public string? EmergencyContactPhone { get; set; }
}

public class ClientFormulaRecordResponse
{
    public int Id { get; set; }
    public int SalonId { get; set; }
    public int CustomerId { get; set; }
    public int? AppointmentId { get; set; }
    public int? StaffId { get; set; }
    public string? StaffName { get; set; }
    public string Category { get; set; } = string.Empty;
    public string FormulaDetails { get; set; } = string.Empty;
    public string? Developer { get; set; }
    public int? ProcessingTimeMinutes { get; set; }
    public string? Notes { get; set; }
    public string? CreatedByStaffName { get; set; }
    public DateTime ServiceDateUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class CreateClientFormulaRequest
{
    public int? AppointmentId { get; set; }

    public int? StaffId { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    [StringLength(50, ErrorMessage = "Category cannot exceed 50 characters.")]
    public string Category { get; set; } = "Color"; // Color, Bleach, Toner, Gloss, Keratin, Perm, Skincare

    [Required(ErrorMessage = "FormulaDetails are required.")]
    [StringLength(2000, ErrorMessage = "Formula details cannot exceed 2000 characters.")]
    public string FormulaDetails { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "Developer cannot exceed 100 characters.")]
    public string? Developer { get; set; }

    public int? ProcessingTimeMinutes { get; set; }

    [StringLength(2000, ErrorMessage = "Notes cannot exceed 2000 characters.")]
    public string? Notes { get; set; }

    public DateTime? ServiceDateUtc { get; set; }
}

public class ClientVisitHistoryItemResponse
{
    public int AppointmentId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public DateTime StartAtUtc { get; set; }
    public decimal Price { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? CustomerNotes { get; set; }
}

public class ClientDossierResponse
{
    public int CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public ClientConsultationCardResponse? ConsultationCard { get; set; }
    public List<ClientFormulaRecordResponse> Formulas { get; set; } = new();
    public List<ClientVisitHistoryItemResponse> VisitHistory { get; set; } = new();
}
