using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/services")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminServicesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminServicesController> _logger;

    public AdminServicesController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<AdminServicesController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new service in the authenticated administrator's salon catalog.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ServiceResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var service = new Service
        {
            SalonId = salonId.Value, // Hardcoded to authenticated admin's salon
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price,
            DurationMinutes = request.DurationMinutes,
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.Services.Add(service);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Service '{ServiceName}' (ID: {ServiceId}) created for Salon ID {SalonId} by {Email}",
            service.Name, service.Id, salonId.Value, _currentUserService.Email);

        return CreatedAtAction(nameof(GetServiceById), new { id = service.Id }, MapToServiceResponse(service));
    }

    /// <summary>
    /// List services in the authenticated administrator's salon catalog with optional filtering and pagination.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ServiceResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetServices(
        [FromQuery] string? category,
        [FromQuery] bool? isActive,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Services
            .AsNoTracking()
            .Where(s => s.SalonId == salonId.Value);

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(s => s.Category == category.Trim());
        }

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchTerm = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(searchTerm) ||
                                     (s.Description != null && s.Description.ToLower().Contains(searchTerm)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var services = await query
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => MapToServiceResponse(s))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<ServiceResponse>
        {
            Items = services,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(result);
    }

    /// <summary>
    /// Retrieve a single service by ID, ensuring it belongs to the authenticated admin's salon.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ServiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetServiceById(int id, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var service = await _dbContext.Services
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (service == null)
        {
            return NotFound(new { message = "Service not found in your salon catalog." });
        }

        return Ok(MapToServiceResponse(service));
    }

    /// <summary>
    /// Update a service in the authenticated administrator's salon catalog.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ServiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateService(int id, [FromBody] UpdateServiceRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var service = await _dbContext.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (service == null)
        {
            return NotFound(new { message = "Service not found in your salon catalog." });
        }

        service.Name = request.Name.Trim();
        service.Description = request.Description?.Trim();
        service.Category = request.Category.Trim();
        service.Price = request.Price;
        service.DurationMinutes = request.DurationMinutes;
        service.IsActive = request.IsActive;
        service.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Service ID {ServiceId} updated for Salon ID {SalonId} by {Email}",
            service.Id, salonId.Value, _currentUserService.Email);

        return Ok(MapToServiceResponse(service));
    }

    /// <summary>
    /// Update active status for a service (Activate / Deactivate).
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(ServiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateServiceStatus(int id, [FromBody] UpdateServiceStatusRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var service = await _dbContext.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (service == null)
        {
            return NotFound(new { message = "Service not found in your salon catalog." });
        }

        service.IsActive = request.IsActive;
        service.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Service ID {ServiceId} status set to IsActive={IsActive} for Salon ID {SalonId}",
            service.Id, service.IsActive, salonId.Value);

        return Ok(MapToServiceResponse(service));
    }

    /// <summary>
    /// Delete a service from the salon catalog.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteService(int id, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var service = await _dbContext.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (service == null)
        {
            return NotFound(new { message = "Service not found in your salon catalog." });
        }

        _dbContext.Services.Remove(service);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Service ID {ServiceId} deleted from Salon ID {SalonId} by {Email}",
            service.Id, salonId.Value, _currentUserService.Email);

        return Ok(new { message = "Service removed successfully from salon catalog." });
    }

    private static ServiceResponse MapToServiceResponse(Service service)
    {
        return new ServiceResponse
        {
            Id = service.Id,
            SalonId = service.SalonId,
            Name = service.Name,
            Description = service.Description,
            Category = service.Category,
            Price = service.Price,
            DurationMinutes = service.DurationMinutes,
            IsActive = service.IsActive,
            CreatedAtUtc = service.CreatedAtUtc,
            UpdatedAtUtc = service.UpdatedAtUtc
        };
    }
}

