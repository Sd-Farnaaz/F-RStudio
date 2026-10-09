namespace SalonBook.Api.Configurations;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SecretKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "SalonBook";

    public string Audience { get; set; } = "SalonBook.Client";

    public int AccessTokenExpirationMinutes { get; set; } = 15;

    public int RefreshTokenExpirationDays { get; set; } = 7;

    public int PasswordResetTokenExpirationMinutes { get; set; } = 30;
}

