namespace SalonBook.Api.Models;

public class RefreshToken
{
    public int Id { get; set; }

    public int UserId { get; set; }

    /// <summary>
    /// SHA-256 hash of the cryptographically random token string.
    /// Never store raw refresh tokens in the database.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    public string? JwtId { get; set; }

    /// <summary>
    /// Identifier for the token family used to track rotations and detect reuse.
    /// </summary>
    public string FamilyId { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAtUtc { get; set; }

    public DateTime? RevokedAtUtc { get; set; }

    public string? ReplacedByTokenHash { get; set; }

    public string? CreatedByIp { get; set; }

    public string? RevokedByIp { get; set; }

    public string? ReasonRevoked { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAtUtc;

    public bool IsRevoked => RevokedAtUtc != null;

    public bool IsActive => !IsRevoked && !IsExpired;

    // Navigation property
    public User User { get; set; } = null!;
}

