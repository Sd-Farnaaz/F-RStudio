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
    private readonly ILogger<PublicSalonsController> _logger;

    public PublicSalonsController(
        ApplicationDbContext dbContext,
        ILogger<PublicSalonsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
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

        var salons = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = salons.Select(MapToPublicSalon).ToList();

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

        int reviewCount = 0;
        double averageRating = 5.0;
        try
        {
            var reviewsQuery = _dbContext.Reviews.AsNoTracking().Where(r => r.SalonId == salon.Id);
            reviewCount = await reviewsQuery.CountAsync(cancellationToken);
            averageRating = reviewCount > 0 ? await reviewsQuery.AverageAsync(r => (double)r.Rating, cancellationToken) : 5.0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Reviews table unavailable for salon '{Slug}'. Defaulting to 0 reviews.", slug);
        }

        var response = MapToPublicSalon(salon);
        response.ReviewCount = reviewCount;
        response.AverageRating = Math.Round(averageRating, 1);

        return Ok(response);
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

    /// <summary>
    /// Retrieve active staff members / stylists for a salon.
    /// </summary>
    [HttpGet("{slug}/staff")]
    [ProducesResponseType(typeof(List<PublicStaffResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSalonStaff(string slug, CancellationToken cancellationToken)
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

        var staff = await _dbContext.Staff
            .AsNoTracking()
            .Where(s => s.SalonId == salon.Id && s.IsActive)
            .OrderBy(s => s.FullName)
            .Select(s => new PublicStaffResponse
            {
                Id = s.Id,
                FullName = s.FullName,
                Title = s.Title,
                IsActive = s.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(staff);
    }

    /// <summary>
    /// Retrieve customer reviews, star breakdown, and rating metrics for a salon.
    /// </summary>
    [HttpGet("{slug}/reviews")]
    [ProducesResponseType(typeof(SalonReviewSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSalonReviews(
        string slug,
        [FromQuery] int? minRating,
        [FromQuery] bool? hasPhotos,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
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
        pageSize = Math.Clamp(pageSize, 1, 50);

        var allReviewsQuery = _dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.SalonId == salon.Id);

        var totalReviews = await allReviewsQuery.CountAsync(cancellationToken);
        var averageRating = totalReviews > 0
            ? await allReviewsQuery.AverageAsync(r => (double)r.Rating, cancellationToken)
            : 5.0;

        var cleanRatings = await allReviewsQuery
            .Where(r => r.CleanlinessRating.HasValue)
            .Select(r => (double)r.CleanlinessRating!.Value)
            .ToListAsync(cancellationToken);
        var staffRatings = await allReviewsQuery
            .Where(r => r.StaffRating.HasValue)
            .Select(r => (double)r.StaffRating!.Value)
            .ToListAsync(cancellationToken);
        var valRatings = await allReviewsQuery
            .Where(r => r.ValueRating.HasValue)
            .Select(r => (double)r.ValueRating!.Value)
            .ToListAsync(cancellationToken);

        var breakdownList = await allReviewsQuery
            .GroupBy(r => r.Rating)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var breakdownDict = new Dictionary<int, int>
        {
            { 5, 0 }, { 4, 0 }, { 3, 0 }, { 2, 0 }, { 1, 0 }
        };
        foreach (var item in breakdownList)
        {
            if (breakdownDict.ContainsKey(item.Rating))
            {
                breakdownDict[item.Rating] = item.Count;
            }
        }

        var filteredQuery = allReviewsQuery;
        if (minRating.HasValue && minRating.Value >= 1 && minRating.Value <= 5)
        {
            filteredQuery = filteredQuery.Where(r => r.Rating >= minRating.Value);
        }

        if (hasPhotos == true)
        {
            filteredQuery = filteredQuery.Where(r => !string.IsNullOrEmpty(r.PhotoUrlsJson) && r.PhotoUrlsJson != "[]");
        }

        var totalFiltered = await filteredQuery.CountAsync(cancellationToken);

        var reviews = await filteredQuery
            .Include(r => r.Customer)
            .Include(r => r.Staff)
            .Include(r => r.Appointment)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var reviewResponses = reviews.Select(r => new ReviewResponse
        {
            Id = r.Id,
            SalonId = r.SalonId,
            SalonName = salon.Name,
            CustomerId = r.CustomerId,
            CustomerName = r.Customer != null ? r.Customer.FullName : "Verified Client",
            AppointmentId = r.AppointmentId,
            StaffId = r.StaffId,
            StaffName = r.Staff != null ? r.Staff.FullName : null,
            ServiceName = r.Appointment != null ? r.Appointment.ServiceNameAtBooking : null,
            Rating = r.Rating,
            CleanlinessRating = r.CleanlinessRating,
            StaffRating = r.StaffRating,
            ValueRating = r.ValueRating,
            Title = r.Title,
            Comment = r.Comment,
            PhotoUrls = !string.IsNullOrWhiteSpace(r.PhotoUrlsJson)
                ? (System.Text.Json.JsonSerializer.Deserialize<List<string>>(r.PhotoUrlsJson) ?? new List<string>())
                : new List<string>(),
            IsVerifiedVisit = r.IsVerifiedVisit,
            OwnerReply = r.OwnerReply,
            OwnerRepliedAtUtc = r.OwnerRepliedAtUtc,
            CreatedAtUtc = r.CreatedAtUtc,
            UpdatedAtUtc = r.UpdatedAtUtc
        }).ToList();

        var summary = new SalonReviewSummaryResponse
        {
            AverageRating = Math.Round(averageRating, 1),
            TotalReviews = totalReviews,
            AverageCleanliness = cleanRatings.Count > 0 ? Math.Round(cleanRatings.Average(), 1) : null,
            AverageStaff = staffRatings.Count > 0 ? Math.Round(staffRatings.Average(), 1) : null,
            AverageValue = valRatings.Count > 0 ? Math.Round(valRatings.Average(), 1) : null,
            RatingBreakdown = breakdownDict,
            Reviews = new PagedResult<ReviewResponse>
            {
                Items = reviewResponses,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalFiltered
            }
        };

        return Ok(summary);
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

