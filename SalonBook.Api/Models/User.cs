namespace SalonBook.Api.Models;

public class User
{
    public int Id { get; set; }

    /// <summary>
    /// Nullable foreign key to Salon.
    /// SuperAdmin: null (platform-wide).
    /// Admin: assigned to specific Salon.
    /// User (Customer): null (global customer account).
    /// </summary>
    public int? SalonId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsEmailVerified { get; set; } = false;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    public DateTime? LastLoginAtUtc { get; set; }

    // Navigation properties
    public Salon? Salon { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
