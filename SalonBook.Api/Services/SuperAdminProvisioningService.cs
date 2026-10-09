using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public interface ISuperAdminProvisioningService
{
    Task<User> ProvisionSuperAdminAsync(string email, string fullName, string password, CancellationToken cancellationToken = default);
}

public class SuperAdminProvisioningService : ISuperAdminProvisioningService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<SuperAdminProvisioningService> _logger;

    public SuperAdminProvisioningService(
        ApplicationDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        ILogger<SuperAdminProvisioningService> logger)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<User> ProvisionSuperAdminAsync(string email, string fullName, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var existingUser = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (existingUser != null)
        {
            if (existingUser.Role == Roles.SuperAdmin)
            {
                _logger.LogInformation("SuperAdmin account with email {Email} already exists. Updating details.", normalizedEmail);
                existingUser.FullName = fullName;
                existingUser.PasswordHash = _passwordHasher.HashPassword(existingUser, password);
                existingUser.IsActive = true;
                existingUser.IsEmailVerified = true;
                existingUser.UpdatedAtUtc = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync(cancellationToken);
                return existingUser;
            }

            throw new InvalidOperationException($"An account with email '{normalizedEmail}' already exists with role '{existingUser.Role}'. Cannot provision as SuperAdmin.");
        }

        var superAdmin = new User
        {
            FullName = fullName,
            Email = normalizedEmail,
            Role = Roles.SuperAdmin,
            SalonId = null, // SuperAdmin has no salon restriction
            IsActive = true,
            IsEmailVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        superAdmin.PasswordHash = _passwordHasher.HashPassword(superAdmin, password);

        _dbContext.Users.Add(superAdmin);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin account successfully provisioned for {Email}.", normalizedEmail);
        return superAdmin;
    }
}
