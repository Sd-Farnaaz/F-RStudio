namespace SalonBook.Api.Models;

public class PasswordResetToken
{
    public int Id { get; set; }

    public int UserId { get; set; }

    /// <summary>
    /// SHA-256 hash of the cryptographically random reset token string.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? UsedAtUtc { get; set; }

    public string? CreatedByIp { get; set; }

    public string? UsedByIp { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;

    public bool IsUsed => UsedAtUtc != null;

    public bool IsActive => !IsUsed && !IsExpired;

    // Navigation property
    public User User { get; set; } = null!;
}

