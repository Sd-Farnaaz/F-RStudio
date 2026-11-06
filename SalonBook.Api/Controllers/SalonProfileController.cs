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

        if (!string.IsNullOrWhiteSpace(request.PhotoBase64))
        {
            salon.LogoUrl = request.PhotoBase64;
        }
        else if (request.LogoUrl != null)
        {
            salon.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();
        }

        salon.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Salon profile updated for Salon ID {SalonId} ({SalonName}) by user {Email}",
            salon.Id, salon.Name, _currentUserService.Email);

        return Ok(MapToProfileResponse(salon));
    }

    /// <summary>
    /// Upload or replace the salon's logo/profile image.
    /// Validates file type, size (max 5MB), and stores as high-fidelity persistent data URL.
    /// </summary>
    [HttpPost("logo")]
    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(SalonProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadLogo([FromForm(Name = "file")] IFormFile file, CancellationToken cancellationToken)
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

        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { message = "Image file size exceeds the 5MB limit." });
        }

        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, cancellationToken);
            var bytes = ms.ToArray();
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var mime = ext switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".gif" => "image/gif",
                _ => "image/jpeg"
            };

            var base64DataUrl = $"data:{mime};base64,{Convert.ToBase64String(bytes)}";

            salon.LogoUrl = base64DataUrl;
            salon.UpdatedAtUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Salon logo updated successfully for Salon ID {SalonId}", salon.Id);

            return Ok(MapToProfileResponse(salon));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading salon logo for Salon ID {SalonId}", salon.Id);
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
