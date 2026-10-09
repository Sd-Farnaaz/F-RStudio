using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Options;
using SalonBook.Api.Common;
using SalonBook.Api.Configurations;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Tests;

public class TokenServiceTests
{
    private readonly IOptions<JwtOptions> _options = Options.Create(new JwtOptions
    {
        SecretKey = "Test_Secret_Key_For_Unit_Testing_Purpose_Only_1234567890!",
        Issuer = "TestIssuer",
        Audience = "TestAudience",
        AccessTokenExpirationMinutes = 15,
        RefreshTokenExpirationDays = 7,
        PasswordResetTokenExpirationMinutes = 30
    });

    [Fact]
    public void GenerateAccessToken_ProducesValidJwtWithExpectedClaims()
    {
        var tokenService = new TokenService(_options);
        var user = new User
        {
            Id = 42,
            Email = "admin@example.com",
            FullName = "Salon Admin",
            Role = Roles.Admin,
            SalonId = 7
        };

        var (token, expiresAtUtc, jwtId) = tokenService.GenerateAccessToken(user, "luxe-salon");

        Assert.NotNull(token);
        Assert.NotEmpty(token);
        Assert.NotNull(jwtId);
        Assert.True(expiresAtUtc > DateTime.UtcNow);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal("TestIssuer", jwt.Issuer);
        Assert.Contains("TestAudience", jwt.Audiences);

        Assert.Equal("42", jwt.Claims.First(c => c.Type == CustomClaimTypes.UserId || c.Type == "sub").Value);
        Assert.Equal("admin@example.com", jwt.Claims.First(c => c.Type == CustomClaimTypes.Email || c.Type == "email").Value);
        Assert.Equal(Roles.Admin, jwt.Claims.First(c => c.Type == CustomClaimTypes.Role || c.Type == ClaimTypes.Role).Value);
        Assert.Equal("7", jwt.Claims.First(c => c.Type == CustomClaimTypes.SalonId).Value);
        Assert.Equal("luxe-salon", jwt.Claims.First(c => c.Type == "salon_slug").Value);
    }

    [Fact]
    public void GenerateRefreshToken_ProducesCryptographicallySecureTokenAndMatchingHash()
    {
        var tokenService = new TokenService(_options);
        var (rawToken, tokenHash, expiresAtUtc, familyId) = tokenService.GenerateRefreshToken();

        Assert.NotNull(rawToken);
        Assert.NotEmpty(rawToken);
        Assert.NotNull(tokenHash);
        Assert.NotNull(familyId);
        Assert.True(expiresAtUtc > DateTime.UtcNow.AddDays(6));

        // Hash verification
        var computedHash = tokenService.HashToken(rawToken);
        Assert.Equal(tokenHash, computedHash);
    }

    [Fact]
    public void GeneratePasswordResetToken_ProducesSecureTokenAndMatchingHash()
    {
        var tokenService = new TokenService(_options);
        var (rawToken, tokenHash, expiresAtUtc) = tokenService.GeneratePasswordResetToken();

        Assert.NotNull(rawToken);
        Assert.NotEmpty(rawToken);
        Assert.NotNull(tokenHash);
        Assert.True(expiresAtUtc > DateTime.UtcNow.AddMinutes(25));

        var computedHash = tokenService.HashToken(rawToken);
        Assert.Equal(tokenHash, computedHash);
    }
}

