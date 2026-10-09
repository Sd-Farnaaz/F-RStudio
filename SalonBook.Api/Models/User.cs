namespace SalonBook.Api.Models;

public class User
{
    public int Id { get; set; }

    /// <summary>
    /// Nullable foreign key to Salon for initial platform-level account model.
    /// A null SalonId represents platform administrators or users without an assigned salon.
    /// </summary>
    public int? SalonId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsEmailVerified { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Salon? Salon { get; set; }
}

