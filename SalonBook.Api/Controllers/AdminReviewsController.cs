using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/reviews")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminReviewsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminReviewsController> _logger;

    public AdminReviewsController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<AdminReviewsController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve paginated customer reviews and rating analytics for the salon.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(SalonReviewSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetReviews(
        [FromQuery] int? rating,
        [FromQuery] bool? replied,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon not found." });
        }

        var baseQuery = _dbContext.Reviews
            .AsNoTracking()
            .Where(r => r.SalonId == salonId.Value);

        var totalReviews = await baseQuery.CountAsync(cancellationToken);
        var averageRating = totalReviews > 0
            ? await baseQuery.AverageAsync(r => (double)r.Rating, cancellationToken)
            : 0.0;

        var cleanRatings = await baseQuery
            .Where(r => r.CleanlinessRating.HasValue)
            .Select(r => (double)r.CleanlinessRating!.Value)
            .ToListAsync(cancellationToken);
        var staffRatings = await baseQuery
            .Where(r => r.StaffRating.HasValue)
            .Select(r => (double)r.StaffRating!.Value)
            .ToListAsync(cancellationToken);
        var valRatings = await baseQuery
            .Where(r => r.ValueRating.HasValue)
            .Select(r => (double)r.ValueRating!.Value)
            .ToListAsync(cancellationToken);

        var breakdownList = await baseQuery
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

        var filteredQuery = baseQuery;

        if (rating.HasValue && rating.Value >= 1 && rating.Value <= 5)
        {
            filteredQuery = filteredQuery.Where(r => r.Rating == rating.Value);
        }

        if (replied.HasValue)
        {
            filteredQuery = replied.Value
                ? filteredQuery.Where(r => r.OwnerReply != null && r.OwnerReply != "")
                : filteredQuery.Where(r => r.OwnerReply == null || r.OwnerReply == "");
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            filteredQuery = filteredQuery.Where(r =>
                r.Comment.ToLower().Contains(term) ||
                (r.Title != null && r.Title.ToLower().Contains(term)) ||
                (r.Customer != null && r.Customer.FullName.ToLower().Contains(term)));
        }

        var totalFiltered = await filteredQuery.CountAsync(cancellationToken);

        var items = await filteredQuery
            .Include(r => r.Customer)
            .Include(r => r.Staff)
            .Include(r => r.Appointment)
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var responses = items.Select(r => new ReviewResponse
        {
            Id = r.Id,
            SalonId = r.SalonId,
            SalonName = salon.Name,
            CustomerId = r.CustomerId,
            CustomerName = r.Customer != null ? r.Customer.FullName : "Client",
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
                Items = responses,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalFiltered
            }
        };

        return Ok(summary);
    }

    /// <summary>
    /// Add or update an official salon response to a customer review.
    /// </summary>
    [HttpPost("{id:int}/reply")]
    [ProducesResponseType(typeof(ReviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReplyToReview(
        int id,
        [FromBody] OwnerReplyRequest request,
        CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var review = await _dbContext.Reviews
            .Include(r => r.Salon)
            .Include(r => r.Customer)
            .Include(r => r.Staff)
            .Include(r => r.Appointment)
            .FirstOrDefaultAsync(r => r.Id == id && r.SalonId == salonId.Value, cancellationToken);

        if (review == null)
        {
            return NotFound(new { message = $"Review with ID {id} was not found for this salon." });
        }

        review.OwnerReply = request.Reply.Trim();
        review.OwnerRepliedAtUtc = DateTime.UtcNow;
        review.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Salon {SalonId} posted owner reply to Review {ReviewId}.", salonId.Value, review.Id);

        return Ok(new ReviewResponse
        {
            Id = review.Id,
            SalonId = review.SalonId,
            SalonName = review.Salon?.Name ?? string.Empty,
            CustomerId = review.CustomerId,
            CustomerName = review.Customer?.FullName ?? "Client",
            AppointmentId = review.AppointmentId,
            StaffId = review.StaffId,
            StaffName = review.Staff?.FullName,
            ServiceName = review.Appointment?.ServiceNameAtBooking,
            Rating = review.Rating,
            CleanlinessRating = review.CleanlinessRating,
            StaffRating = review.StaffRating,
            ValueRating = review.ValueRating,
            Title = review.Title,
            Comment = review.Comment,
            PhotoUrls = !string.IsNullOrWhiteSpace(review.PhotoUrlsJson)
                ? (System.Text.Json.JsonSerializer.Deserialize<List<string>>(review.PhotoUrlsJson) ?? new List<string>())
                : new List<string>(),
            IsVerifiedVisit = review.IsVerifiedVisit,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAtUtc = review.OwnerRepliedAtUtc,
            CreatedAtUtc = review.CreatedAtUtc,
            UpdatedAtUtc = review.UpdatedAtUtc
        });
    }
}
