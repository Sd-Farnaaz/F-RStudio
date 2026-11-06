using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
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
    private readonly ISalonImageStorageService _salonImageStorageService;
    private readonly ILogger<AdminServicesController> _logger;

    public AdminServicesController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ISalonImageStorageService salonImageStorageService,
        ILogger<AdminServicesController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _salonImageStorageService = salonImageStorageService;
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

        // Subscription Tier & Status Gating: Starter (5), Growth (15), Pro (unlimited)
        var salon = await _dbContext.Salons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
        if (salon == null) return NotFound(new { message = "Salon not found." });

        if (salon.SubscriptionStatus == "Expired" || !salon.IsActive)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Your salon subscription is currently expired or inactive. Please renew or upgrade your subscription on the Plan & Billing page to create services.",
                upgradeRequired = true,
                currentTier = salon.SubscriptionTier ?? "Starter"
            });
        }

        var tier = salon.SubscriptionTier ?? "Starter";
        var planConfig = SubscriptionPlanCatalog.GetPlanByTier(tier) ?? SubscriptionPlanCatalog.StarterPlan;
        if (planConfig.MaxServices.HasValue)
        {
            var activeServicesCount = await _dbContext.Services.AsNoTracking().CountAsync(s => s.SalonId == salonId.Value && s.IsActive, cancellationToken);
            if (activeServicesCount >= planConfig.MaxServices.Value)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Your {planConfig.Name} allows a maximum of {planConfig.MaxServices.Value} active catalog services. Please upgrade your subscription to add more services.",
                    upgradeRequired = true,
                    currentTier = tier,
                    servicesLimit = planConfig.MaxServices.Value
                });
            }
        }

        string? initialImageUrl = !string.IsNullOrWhiteSpace(request.ImageUrl) ? request.ImageUrl.Trim() : null;

        var service = new Service
        {
            SalonId = salonId.Value, // Hardcoded to authenticated admin's salon
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price,
            DurationMinutes = request.DurationMinutes,
            ImageUrl = initialImageUrl,
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.Services.Add(service);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Optional Service photo uploaded as Base64 Data URL during creation
        if (!string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            service.ImageUrl = request.ImageBase64;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

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

        if (request.IsActive && !service.IsActive)
        {
            var salon = await _dbContext.Salons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
            var tier = salon?.SubscriptionTier ?? "Starter";
            var planConfig = SubscriptionPlanCatalog.GetPlanByTier(tier) ?? SubscriptionPlanCatalog.StarterPlan;
            if (planConfig.MaxServices.HasValue)
            {
                var activeServicesCount = await _dbContext.Services.AsNoTracking().CountAsync(s => s.SalonId == salonId.Value && s.IsActive && s.Id != id, cancellationToken);
                if (activeServicesCount >= planConfig.MaxServices.Value)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Your {planConfig.Name} allows a maximum of {planConfig.MaxServices.Value} active catalog services. Please upgrade your subscription to add more services.",
                        upgradeRequired = true,
                        currentTier = tier,
                        servicesLimit = planConfig.MaxServices.Value
                    });
                }
            }
        }

        service.Name = request.Name.Trim();
        service.Description = request.Description?.Trim();
        service.Category = request.Category.Trim();
        service.Price = request.Price;
        service.DurationMinutes = request.DurationMinutes;
        if (request.IsActive && !service.IsActive)
        {
            var salon = await _dbContext.Salons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
            var tier = salon?.SubscriptionTier ?? "Starter";
            var planConfig = SubscriptionPlanCatalog.GetPlanByTier(tier) ?? SubscriptionPlanCatalog.StarterPlan;
            if (planConfig.MaxServices.HasValue)
            {
                var activeServicesCount = await _dbContext.Services.AsNoTracking().CountAsync(s => s.SalonId == salonId.Value && s.IsActive && s.Id != id, cancellationToken);
                if (activeServicesCount >= planConfig.MaxServices.Value)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Your {planConfig.Name} allows a maximum of {planConfig.MaxServices.Value} active catalog services. Please upgrade your subscription to add more services.",
                        upgradeRequired = true,
                        currentTier = tier,
                        servicesLimit = planConfig.MaxServices.Value
                    });
                }
            }
        }

        service.IsActive = request.IsActive;

        if (!string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            service.ImageUrl = request.ImageBase64;
        }
        else if (request.ImageUrl != null)
        {
            service.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        }

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

        if (request.IsActive && !service.IsActive)
        {
            var salon = await _dbContext.Salons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
            var tier = salon?.SubscriptionTier ?? "Starter";
            var planConfig = SubscriptionPlanCatalog.GetPlanByTier(tier) ?? SubscriptionPlanCatalog.StarterPlan;
            if (planConfig.MaxServices.HasValue)
            {
                var activeServicesCount = await _dbContext.Services.AsNoTracking().CountAsync(s => s.SalonId == salonId.Value && s.IsActive && s.Id != id, cancellationToken);
                if (activeServicesCount >= planConfig.MaxServices.Value)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Your {planConfig.Name} allows a maximum of {planConfig.MaxServices.Value} active catalog services. Please upgrade your subscription to add more services.",
                        upgradeRequired = true,
                        currentTier = tier,
                        servicesLimit = planConfig.MaxServices.Value
                    });
                }
            }
        }

        service.IsActive = request.IsActive;
        service.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Service ID {ServiceId} status set to IsActive={IsActive} for Salon ID {SalonId}",
            service.Id, service.IsActive, salonId.Value);

        return Ok(MapToServiceResponse(service));
    }

    /// <summary>
    /// Upload or replace the image for a service belonging to the authenticated administrator's salon.
    /// </summary>
    [HttpPost("{id:int}/image")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ServiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadServiceImage(int id, [FromForm(Name = "file")] IFormFile file, CancellationToken cancellationToken)
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

            service.ImageUrl = base64DataUrl;
            service.UpdatedAtUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Service ID {ServiceId} image updated for Salon ID {SalonId}", service.Id, salonId.Value);

            return Ok(MapToServiceResponse(service));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading service image for service ID {ServiceId}", service.Id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove the image for a service belonging to the authenticated administrator's salon.
    /// </summary>
    [HttpDelete("{id:int}/image")]
    [ProducesResponseType(typeof(ServiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteServiceImage(int id, CancellationToken cancellationToken)
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

        if (!string.IsNullOrWhiteSpace(service.ImageUrl))
        {
            await _salonImageStorageService.DeleteServiceImageAsync(salonId.Value, service.Id, service.ImageUrl, cancellationToken);
            service.ImageUrl = null;
            service.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Service ID {ServiceId} image removed for Salon ID {SalonId}", service.Id, salonId.Value);
        }

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

        // Clean up image file if present
        if (!string.IsNullOrWhiteSpace(service.ImageUrl))
        {
            await _salonImageStorageService.DeleteServiceImageAsync(salonId.Value, service.Id, service.ImageUrl, cancellationToken);
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
            ImageUrl = service.ImageUrl,
            IsActive = service.IsActive,
            CreatedAtUtc = service.CreatedAtUtc,
            UpdatedAtUtc = service.UpdatedAtUtc
        };
    }
}
