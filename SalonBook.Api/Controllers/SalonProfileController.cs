using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/salon/profile")]
[Authorize(Policy = "SalonAdminOnly")]
public class SalonProfileController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISalonImageStorageService _salonImageStorageService;
    private readonly ILogger<SalonProfileController> _logger;

    public SalonProfileController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ISalonImageStorageService salonImageStorageService,
        ILogger<SalonProfileController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _salonImageStorageService = salonImageStorageService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve the authenticated administrator's own salon profile.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(SalonProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon profile not found." });
        }

        return Ok(MapToProfileResponse(salon));
    }

    /// <summary>
    /// Update the authenticated administrator's own salon profile.
    /// Salon ownership, tenant ID, and slug cannot be tampered with.
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(SalonProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateSalonProfileRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var salon = await _dbContext.Salons
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon profile not found." });
        }

        salon.Name = request.Name.Trim();
        salon.Description = request.Description?.Trim();
        salon.BusinessType = request.BusinessType.Trim();
        salon.AddressLine = request.AddressLine?.Trim();
        salon.City = request.City?.Trim();
        salon.State = request.State?.Trim();
        salon.PostalCode = request.PostalCode?.Trim();
        salon.Country = string.IsNullOrWhiteSpace(request.Country) ? "India" : request.Country.Trim();
        salon.PhoneNumber = request.PhoneNumber?.Trim();
        salon.ContactEmail = request.ContactEmail?.Trim().ToLowerInvariant();
        salon.OpeningHoursJson = request.OpeningHoursJson?.Trim();

        if (!string.IsNullOrWhiteSpace(request.TimeZone))
        {
            salon.TimeZone = request.TimeZone.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.CurrencyCode))
        {
            salon.CurrencyCode = request.CurrencyCode.Trim().ToUpperInvariant();
        }

        salon.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Salon profile updated for Salon ID {SalonId} ({SalonName}) by user {Email}",
            salon.Id, salon.Name, _currentUserService.Email);

        return Ok(MapToProfileResponse(salon));
    }

    /// <summary>
    /// Upload or replace the salon's logo/profile image.
    /// Validates file type, size (max 5MB), and actual image binary magic bytes.
    /// </summary>
    [HttpPost("logo")]
    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(SalonProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var salon = await _dbContext.Salons
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon profile not found." });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please select a valid image file to upload." });
        }

        try
        {
            var oldLogoUrl = salon.LogoUrl;
            var newLogoUrl = await _salonImageStorageService.SaveSalonLogoAsync(salon.Id, file, cancellationToken);

            // If replacing an existing logo, remove the old file
            if (!string.IsNullOrWhiteSpace(oldLogoUrl) && !oldLogoUrl.Equals(newLogoUrl, StringComparison.OrdinalIgnoreCase))
            {
                await _salonImageStorageService.DeleteSalonLogoAsync(salon.Id, oldLogoUrl, cancellationToken);
            }

            salon.LogoUrl = newLogoUrl;
            salon.UpdatedAtUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Salon logo updated successfully for Salon ID {SalonId}: {LogoUrl}", salon.Id, newLogoUrl);

            return Ok(MapToProfileResponse(salon));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove the salon's logo/profile image.
    /// </summary>
    [HttpDelete("logo")]
    [HttpDelete("image")]
    [ProducesResponseType(typeof(SalonProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLogo(CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var salon = await _dbContext.Salons
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon profile not found." });
        }

        if (!string.IsNullOrWhiteSpace(salon.LogoUrl))
        {
            await _salonImageStorageService.DeleteSalonLogoAsync(salon.Id, salon.LogoUrl, cancellationToken);
            salon.LogoUrl = null;
            salon.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Salon logo removed successfully for Salon ID {SalonId}", salon.Id);
        }

        return Ok(MapToProfileResponse(salon));
    }

    private static SalonProfileResponse MapToProfileResponse(Salon salon)
    {
        return new SalonProfileResponse
        {
            Id = salon.Id,
            Name = salon.Name,
            Slug = salon.Slug,
            BusinessType = salon.BusinessType,
            Description = salon.Description,
            AddressLine = salon.AddressLine,
            City = salon.City,
            State = salon.State,
            PostalCode = salon.PostalCode,
            Country = salon.Country,
            PhoneNumber = salon.PhoneNumber,
            ContactEmail = salon.ContactEmail,
            OpeningHoursJson = salon.OpeningHoursJson,
            TimeZone = salon.TimeZone,
            CurrencyCode = salon.CurrencyCode,
            LogoUrl = salon.LogoUrl,
            OnboardingState = salon.OnboardingState,
            IsActive = salon.IsActive,
            CreatedAtUtc = salon.CreatedAtUtc,
            UpdatedAtUtc = salon.UpdatedAtUtc
        };
    }
}
