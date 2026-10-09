using Microsoft.AspNetCore.Identity;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class PasswordHasherTests
{
    private readonly PasswordHasher<User> _hasher = new();

    [Fact]
    public void HashPassword_GeneratesNonPlainTextSecureHash()
    {
        var user = new User { Email = "user@test.com" };
        var password = "SuperSecretPassword123!";

        var hash = _hasher.HashPassword(user, password);

        Assert.NotNull(hash);
        Assert.NotEmpty(hash);
        Assert.DoesNotContain(password, hash);
    }

    [Fact]
    public void VerifyHashedPassword_SucceedsForCorrectPassword()
    {
        var user = new User { Email = "user@test.com" };
        var password = "CorrectPassword123!";
        var hash = _hasher.HashPassword(user, password);

        var result = _hasher.VerifyHashedPassword(user, hash, password);

        Assert.Equal(PasswordVerificationResult.Success, result);
    }

    [Fact]
    public void VerifyHashedPassword_FailsForIncorrectPassword()
    {
        var user = new User { Email = "user@test.com" };
        var password = "CorrectPassword123!";
        var hash = _hasher.HashPassword(user, password);

        var result = _hasher.VerifyHashedPassword(user, hash, "WrongPassword456!");

        Assert.Equal(PasswordVerificationResult.Failed, result);
    }
}

