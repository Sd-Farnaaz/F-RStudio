using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/vendors/media")]
[Authorize(Policy = "SalonAdminOnly")]
public class VendorMediaController : ControllerBase
{
    private readonly IMediaStorageService _mediaStorageService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<VendorMediaController> _logger;

    public VendorMediaController(
        IMediaStorageService mediaStorageService,
        ICurrentUserService currentUserService,
        ILogger<VendorMediaController> logger)
    {
        _mediaStorageService = mediaStorageService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Upload a multipart file (e.g. GST registration PDF, salon storefront images, portfolio pictures).
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(MediaUploadResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UploadMedia(
        IFormFile file,
        [FromForm] string? category = "general",
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Please select a valid file to upload." });
        }

        try
        {
            var result = await _mediaStorageService.UploadMediaAsync(file, category, cancellationToken);

            _logger.LogInformation("Media file '{FileName}' uploaded successfully for Salon ID {SalonId} under category '{Category}'.",
                result.StoredFileName, salonId.Value, result.Category);

            return Created(result.FileUrl, result);
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
}

