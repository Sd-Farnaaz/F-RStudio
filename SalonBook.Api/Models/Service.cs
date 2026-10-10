namespace SalonBook.Api.Models;

public class Service
{
    public int Id { get; set; }

    /// <summary>
    /// Foreign key referencing the owning Salon (Tenant).
    /// </summary>
    public int SalonId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Category { get; set; } = string.Empty;

    public decimal Price { get; set; }

    /// <summary>
    /// Duration of service in minutes (e.g., 5 to 480 minutes).
    /// </summary>
    public int DurationMinutes { get; set; } = 30;

    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation properties
    public Salon Salon { get; set; } = null!;

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

