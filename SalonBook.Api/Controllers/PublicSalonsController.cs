using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/salons")]
public class PublicSalonsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public PublicSalonsController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Browse active salons with search, city filter, and pagination.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PublicSalonResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalons(
        [FromQuery] string? q,
        [FromQuery] string? search,
        [FromQuery] string? city,
        [FromQuery] string? businessType,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _dbContext.Salons
            .AsNoTracking()
            .Where(s => s.IsActive);

        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(s => s.City != null && s.City.ToLower() == city.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(businessType))
        {
            query = query.Where(s => s.BusinessType.ToLower() == businessType.Trim().ToLower());
        }

        var textSearch = !string.IsNullOrWhiteSpace(q) ? q : search;
        if (!string.IsNullOrWhiteSpace(textSearch))
        {
            var term = textSearch.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) ||
                                     (s.Description != null && s.Description.ToLower().Contains(term)) ||
                                     (s.City != null && s.City.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => MapToPublicSalon(s))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<PublicSalonResponse>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(result);
    }

    /// <summary>
    /// Retrieve a public salon profile by its unique slug identifier.
    /// </summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(PublicSalonResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSalonBySlug(string slug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return NotFound(new { message = "Salon slug is required." });
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Slug == normalizedSlug && s.IsActive, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = $"Salon with identifier '{slug}' was not found or is currently inactive." });
        }

        return Ok(MapToPublicSalon(salon));
    }

    /// <summary>
    /// Browse active services offered by a salon.
    /// </summary>
    [HttpGet("{slug}/services")]
    [ProducesResponseType(typeof(PagedResult<PublicServiceResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSalonServices(
        string slug,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return NotFound(new { message = "Salon slug is required." });
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Slug == normalizedSlug && s.IsActive, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = $"Salon '{slug}' not found." });
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Services
            .AsNoTracking()
            .Where(s => s.SalonId == salon.Id && s.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(s => s.Category.ToLower() == category.Trim().ToLower());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var services = await query
            .OrderBy(s => s.Category)
            .ThenBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new PublicServiceResponse
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description,
                Category = s.Category,
                Price = s.Price,
                DurationMinutes = s.DurationMinutes,
                ImageUrl = s.ImageUrl
            })
            .ToListAsync(cancellationToken);

        var result = new PagedResult<PublicServiceResponse>
        {
            Items = services,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(result);
    }

    private static PublicSalonResponse MapToPublicSalon(Salon salon)
    {
        return new PublicSalonResponse
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
            LogoUrl = salon.LogoUrl
        };
    }
}

