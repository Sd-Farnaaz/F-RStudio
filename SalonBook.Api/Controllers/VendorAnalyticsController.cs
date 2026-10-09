using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/vendors/analytics")]
[Authorize(Policy = "SalonAdminOnly")]
public class VendorAnalyticsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<VendorAnalyticsController> _logger;

    public VendorAnalyticsController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<VendorAnalyticsController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve monthly revenue analytics, realized vs pending pipeline, and annual target progress.
    /// </summary>
    [HttpGet("revenue")]
    [ProducesResponseType(typeof(VendorRevenueAnalyticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRevenueAnalytics(
        [FromQuery] int months = 12,
        CancellationToken cancellationToken = default)
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

        months = Math.Clamp(months, 1, 24);
        var now = DateTime.UtcNow;
        var startDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-(months - 1));

        var payouts = await _dbContext.VendorPayouts
            .AsNoTracking()
            .Where(p => p.SalonId == salonId.Value && p.CreatedAtUtc >= startDate)
            .ToListAsync(cancellationToken);

        var monthlyBreakdown = new List<MonthlyRevenueItem>();
        for (int i = 0; i < months; i++)
        {
            var targetMonth = startDate.AddMonths(i);
            var nextMonth = targetMonth.AddMonths(1);

            var monthPayouts = payouts.Where(p => p.CreatedAtUtc >= targetMonth && p.CreatedAtUtc < nextMonth).ToList();

            var realized = monthPayouts.Where(p => p.Status == "Disbursed" || p.Status == "Processed").Sum(p => p.NetAmount);
            var pending = monthPayouts.Where(p => p.Status == "Pending").Sum(p => p.NetAmount);

            monthlyBreakdown.Add(new MonthlyRevenueItem
            {
                Year = targetMonth.Year,
                Month = targetMonth.Month,
                MonthName = targetMonth.ToString("MMM yyyy"),
                RealizedRevenue = realized,
                PendingPipeline = pending,
                TotalBookings = monthPayouts.Count,
                CompletedBookings = monthPayouts.Count(p => p.Status == "Disbursed" || p.Status == "Processed")
            });
        }

        var totalRealized = payouts.Where(p => p.Status == "Disbursed" || p.Status == "Processed").Sum(p => p.NetAmount);
        var totalPending = payouts.Where(p => p.Status == "Pending").Sum(p => p.NetAmount);
        var annualTarget = salon.AnnualRevenueTarget > 0 ? salon.AnnualRevenueTarget : 1200000.00m;
        var targetProgress = annualTarget > 0 ? Math.Round((totalRealized / annualTarget) * 100, 2) : 0m;

        // Milestones
        var milestones = new List<TargetMilestoneItem>
        {
            new()
            {
                MilestoneName = "Bronze Tier (₹2,50,000)",
                TargetAmount = 250000.00m,
                AchievedAmount = totalRealized,
                Percentage = Math.Min(100m, Math.Round((totalRealized / 250000.00m) * 100, 2)),
                IsReached = totalRealized >= 250000.00m
            },
            new()
            {
                MilestoneName = "Silver Tier (₹6,000,000)",
                TargetAmount = 600000.00m,
                AchievedAmount = totalRealized,
                Percentage = Math.Min(100m, Math.Round((totalRealized / 600000.00m) * 100, 2)),
                IsReached = totalRealized >= 600000.00m
            },
            new()
            {
                MilestoneName = "Gold Tier - Annual Target (₹12,00,000)",
                TargetAmount = annualTarget,
                AchievedAmount = totalRealized,
                Percentage = Math.Min(100m, targetProgress),
                IsReached = totalRealized >= annualTarget
            }
        };

        var response = new VendorRevenueAnalyticsResponse
        {
            CurrencyCode = salon.CurrencyCode,
            TotalRealizedRevenue = totalRealized,
            TotalPendingPipeline = totalPending,
            AnnualTarget = annualTarget,
            TargetProgressPercentage = targetProgress,
            MonthlyBreakdown = monthlyBreakdown,
            Milestones = milestones
        };

        return Ok(response);
    }
}

