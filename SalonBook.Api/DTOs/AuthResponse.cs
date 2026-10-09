namespace SalonBook.Api.DTOs;

public class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;

    public string RefreshToken { get; set; } = string.Empty;

    public string TokenType { get; set; } = "Bearer";

    public int ExpiresInSeconds { get; set; }

    public UserProfileResponse User { get; set; } = null!;
}

public class UserProfileResponse
{
    public int Id { get; set; }

    public int? SalonId { get; set; }

    public string? SalonSlug { get; set; }

    public string? SalonName { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsEmailVerified { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}

