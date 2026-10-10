namespace SalonBook.Api.Models;

public class Staff
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Title { get; set; } // e.g., "Master Barber", "Senior Stylist", "Colorist"

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation properties
    public Salon Salon { get; set; } = null!;

    public ICollection<StaffSchedule> Schedules { get; set; } = new List<StaffSchedule>();

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}

