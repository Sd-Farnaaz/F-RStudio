namespace SalonBook.Api.Models;

public class ClientFormulaRecord
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public int CustomerId { get; set; }

    public int? AppointmentId { get; set; }

    public int? StaffId { get; set; }

    public string Category { get; set; } = "Color"; // Color, Bleach, Toner, Gloss, Keratin, Perm, Skincare

    public string FormulaDetails { get; set; } = string.Empty;

    public string? Developer { get; set; }

    public int? ProcessingTimeMinutes { get; set; }

    public string? Notes { get; set; }

    public string? CreatedByStaffName { get; set; }

    public DateTime ServiceDateUtc { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Salon Salon { get; set; } = null!;

    public User Customer { get; set; } = null!;

    public Staff? Staff { get; set; }

    public Appointment? Appointment { get; set; }
}
