using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[AllowAnonymous]
public class PublicAvailabilityController : ControllerBase
{
    private readonly IAvailabilityService _availabilityService;
    private readonly ILogger<PublicAvailabilityController> _logger;

    public PublicAvailabilityController(
        IAvailabilityService availabilityService,
        ILogger<PublicAvailabilityController> logger)
    {
        _availabilityService = availabilityService;
        _logger = logger;
    }

    /// <summary>
    /// Calculate potential booking availability for a salon by slug, service(s), date, and optional staff.
    /// Note: Final booking creation must revalidate availability within a database transaction.
    /// </summary>
    [HttpGet("api/salons/{slug}/availability")]
    [ProducesResponseType(typeof(SalonAvailabilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSalonAvailability(
        string slug,
        [FromQuery] int? serviceId = null,
        [FromQuery] string? serviceIds = null,
        [FromQuery] string date = "",
        [FromQuery] int? staffId = null,
        CancellationToken cancellationToken = default)
    {
        var idList = new List<int>();
        if (!string.IsNullOrWhiteSpace(serviceIds))
        {
            var parsed = serviceIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0);
            idList.AddRange(parsed);
        }

        if (serviceId.HasValue && serviceId.Value > 0 && !idList.Contains(serviceId.Value))
        {
            idList.Insert(0, serviceId.Value);
        }

        if (idList.Count == 0)
        {
            return BadRequest(new { message = "Valid 'serviceId' or comma-separated 'serviceIds' parameter is required." });
        }

        if (string.IsNullOrWhiteSpace(date))
        {
            return BadRequest(new { message = "Valid 'date' parameter in 'yyyy-MM-dd' format is required." });
        }

        try
        {
            var result = await _availabilityService.GetAvailabilityAsync(slug, idList, date, staffId, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Alias endpoint to calculate salon availability using query string parameters.
    /// </summary>
    [HttpGet("api/availability")]
    [ProducesResponseType(typeof(SalonAvailabilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] string salonSlug,
        [FromQuery] int? serviceId = null,
        [FromQuery] string? serviceIds = null,
        [FromQuery] string date = "",
        [FromQuery] int? staffId = null,
        CancellationToken cancellationToken = default)
    {
        return await GetSalonAvailability(salonSlug, serviceId, serviceIds, date, staffId, cancellationToken);
    }
}

