using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SalonBook.Api.Common;
using SalonBook.Api.Configurations;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc, string JwtId) GenerateAccessToken(User user, string? salonSlug = null);
    (string RawToken, string TokenHash, DateTime ExpiresAtUtc, string FamilyId) GenerateRefreshToken();
    (string RawToken, string TokenHash, DateTime ExpiresAtUtc) GeneratePasswordResetToken();
    string HashToken(string rawToken);
}

public class TokenService : ITokenService
{
    private readonly JwtOptions _jwtOptions;

    public TokenService(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;

        if (string.IsNullOrWhiteSpace(_jwtOptions.SecretKey) || _jwtOptions.SecretKey.Length < 32)
        {
            throw new InvalidOperationException("JWT SecretKey must be configured and at least 32 characters (256 bits) long.");
        }
    }

    public (string Token, DateTime ExpiresAtUtc, string JwtId) GenerateAccessToken(User user, string? salonSlug = null)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtOptions.SecretKey);
        var jwtId = Guid.NewGuid().ToString("N");
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenExpirationMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, jwtId),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new(CustomClaimTypes.UserId, user.Id.ToString()),
            new(CustomClaimTypes.Role, user.Role),
            new(CustomClaimTypes.Email, user.Email),
            new(CustomClaimTypes.FullName, user.FullName)
        };

        if (user.SalonId.HasValue)
        {
            claims.Add(new Claim(CustomClaimTypes.SalonId, user.SalonId.Value.ToString()));
        }

        if (!string.IsNullOrWhiteSpace(salonSlug))
        {
            claims.Add(new Claim("salon_slug", salonSlug));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = _jwtOptions.Issuer,
            Audience = _jwtOptions.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return (tokenHandler.WriteToken(token), expiresAtUtc, jwtId);
    }

    public (string RawToken, string TokenHash, DateTime ExpiresAtUtc, string FamilyId) GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var rawToken = Convert.ToBase64String(randomBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var tokenHash = HashToken(rawToken);
        var expiresAtUtc = DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays);
        var familyId = Guid.NewGuid().ToString("N");

        return (rawToken, tokenHash, expiresAtUtc, familyId);
    }

    public (string RawToken, string TokenHash, DateTime ExpiresAtUtc) GeneratePasswordResetToken()
    {
        var randomBytes = new byte[48];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var rawToken = Convert.ToBase64String(randomBytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
        var tokenHash = HashToken(rawToken);
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwtOptions.PasswordResetTokenExpirationMinutes);

        return (rawToken, tokenHash, expiresAtUtc);
    }

    public string HashToken(string rawToken)
    {
        var bytes = Encoding.UTF8.GetBytes(rawToken);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
