namespace SalonBook.Api.Models;

public class ClientConsultationCard
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public int CustomerId { get; set; }

    public string? Allergies { get; set; }

    public string? SkinOrHairNotes { get; set; }

    public string? PrivateStaffNotes { get; set; }

    public bool IsPatchTested { get; set; } = false;

    public DateTime? PatchTestDate { get; set; }

    public string? EmergencyContactName { get; set; }

    public string? EmergencyContactPhone { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation properties
    public Salon Salon { get; set; } = null!;

    public User Customer { get; set; } = null!;
}
