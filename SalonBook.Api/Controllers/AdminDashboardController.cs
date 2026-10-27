using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminDashboardController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminDashboardController> _logger;

    public AdminDashboardController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<AdminDashboardController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve real-time dashboard analytics, appointment metrics, revenue summaries, and trend data for the authenticated administrator's salon.
    /// </summary>
    [HttpGet]
    [HttpGet("summary")]
    [ProducesResponseType(typeof(AdminDashboardSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDashboardSummary(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
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

        var nowUtc = DateTime.UtcNow;
        var effectiveToUtc = toUtc ?? nowUtc;
        var effectiveFromUtc = fromUtc ?? effectiveToUtc.Date.AddDays(-30);

        if (effectiveFromUtc > effectiveToUtc)
        {
            return BadRequest(new { message = "'fromUtc' date cannot be later than 'toUtc' date." });
        }

        // 1. Overall upcoming appointments count (from now onwards)
        var upcomingAppointments = await _dbContext.Appointments
            .AsNoTracking()
            .CountAsync(a => a.SalonId == salonId.Value &&
                             a.StartAtUtc >= nowUtc &&
                             a.Status != "Cancelled", cancellationToken);

        // 2. Total distinct customers relevant to this salon
        var totalCustomers = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.User &&
                        (u.SalonId == salonId.Value ||
                         u.Appointments.Any(a => a.SalonId == salonId.Value)))
            .CountAsync(cancellationToken);

        // 3. Appointments within selected date range
        var periodAppointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.SalonId == salonId.Value &&
                        a.StartAtUtc >= effectiveFromUtc &&
                        a.StartAtUtc <= effectiveToUtc)
            .Select(a => new
            {
                a.Id,
                a.StartAtUtc,
                a.Status,
                a.ServiceId,
                a.ServiceNameAtBooking,
                Category = a.Service.Category,
                a.PriceAtBooking,
                a.AdvanceAmountRequired,
                a.AmountPaid,
                a.PaymentStatus,
                IsPaymentVerified = a.PaymentVerifiedAtUtc != null
            })
            .ToListAsync(cancellationToken);

        // 4. Metric calculations
        var totalAppointments = periodAppointments.Count;
        var completedAppointments = periodAppointments.Count(a => a.Status == "Completed");
        var cancelledAppointments = periodAppointments.Count(a => a.Status == "Cancelled");
        var noShowAppointments = periodAppointments.Count(a => a.Status == "NoShow");

        // 5. Revenue Calculations
        var nonCancelledAppointments = periodAppointments.Where(a => a.Status != "Cancelled").ToList();

        var totalBookingValue = nonCancelledAppointments.Sum(a => a.PriceAtBooking);
        var totalAdvanceRequired = nonCancelledAppointments.Sum(a => a.AdvanceAmountRequired);

        // Collected revenue includes Paid and PartiallyPaid appointments (regardless of cancellation, actual money received)
        var collectedRevenue = periodAppointments
            .Where(a => a.PaymentStatus == PaymentStatuses.Paid || a.PaymentStatus == PaymentStatuses.PartiallyPaid)
            .Sum(a => a.AmountPaid);

        // Verified revenue: amount verified by admin
        var verifiedRevenue = periodAppointments
            .Where(a => a.IsPaymentVerified)
            .Sum(a => a.AmountPaid);

        // Pending revenue on active (non-cancelled, non-refunded) bookings
        var pendingRevenue = nonCancelledAppointments
            .Where(a => a.PaymentStatus != PaymentStatuses.Paid && a.PaymentStatus != PaymentStatuses.Refunded)
            .Sum(a => Math.Max(0m, a.PriceAtBooking - a.AmountPaid));

        // Refunded amounts
        var refundedAmount = periodAppointments
            .Where(a => a.PaymentStatus == PaymentStatuses.Refunded)
            .Sum(a => a.AmountPaid);

        // 6. Popular Services (Top 10)
        var popularServices = periodAppointments
            .Where(a => a.Status != "Cancelled")
            .GroupBy(a => new { a.ServiceId, a.ServiceNameAtBooking, a.Category })
            .Select(g => new PopularServiceSummary
            {
                ServiceId = g.Key.ServiceId,
                ServiceName = g.Key.ServiceNameAtBooking,
                Category = g.Key.Category,
                BookingCount = g.Count(),
                TotalRevenue = g.Sum(x => x.AmountPaid > 0 ? x.AmountPaid : (x.Status == "Completed" ? x.PriceAtBooking : 0m))
            })
            .OrderByDescending(s => s.BookingCount)
            .ThenByDescending(s => s.TotalRevenue)
            .Take(10)
            .ToList();

        // 7. Trend Generation
        var totalDays = (effectiveToUtc.Date - effectiveFromUtc.Date).TotalDays;
        var trends = new List<AppointmentTrendItem>();

        if (totalDays <= 31)
        {
            // Daily breakdown
            var currentDate = effectiveFromUtc.Date;
            while (currentDate <= effectiveToUtc.Date)
            {
                var nextDate = currentDate.AddDays(1);
                var dayAppointments = periodAppointments
                    .Where(a => a.StartAtUtc.Date == currentDate)
                    .ToList();

                var dayRevenue = dayAppointments
                    .Where(a => a.PaymentStatus == PaymentStatuses.Paid || a.PaymentStatus == PaymentStatuses.PartiallyPaid)
                    .Sum(a => a.AmountPaid);

                trends.Add(new AppointmentTrendItem
                {
                    PeriodKey = currentDate.ToString("yyyy-MM-dd"),
                    DateUtc = currentDate,
                    TotalAppointments = dayAppointments.Count,
                    CompletedAppointments = dayAppointments.Count(a => a.Status == "Completed"),
                    CancelledAppointments = dayAppointments.Count(a => a.Status == "Cancelled"),
                    CollectedRevenue = dayRevenue
                });

                currentDate = nextDate;
            }
        }
        else
        {
            // Monthly breakdown
            var currentMonth = new DateTime(effectiveFromUtc.Year, effectiveFromUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var endMonth = new DateTime(effectiveToUtc.Year, effectiveToUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            while (currentMonth <= endMonth)
            {
                var nextMonth = currentMonth.AddMonths(1);
                var monthAppointments = periodAppointments
                    .Where(a => a.StartAtUtc >= currentMonth && a.StartAtUtc < nextMonth)
                    .ToList();

                var monthRevenue = monthAppointments
                    .Where(a => a.PaymentStatus == PaymentStatuses.Paid || a.PaymentStatus == PaymentStatuses.PartiallyPaid)
                    .Sum(a => a.AmountPaid);

                trends.Add(new AppointmentTrendItem
                {
                    PeriodKey = currentMonth.ToString("MMM yyyy"),
                    DateUtc = currentMonth,
                    TotalAppointments = monthAppointments.Count,
                    CompletedAppointments = monthAppointments.Count(a => a.Status == "Completed"),
                    CancelledAppointments = monthAppointments.Count(a => a.Status == "Cancelled"),
                    CollectedRevenue = monthRevenue
                });

                currentMonth = nextMonth;
            }
        }

        var response = new AdminDashboardSummaryResponse
        {
            FromUtc = effectiveFromUtc,
            ToUtc = effectiveToUtc,
            CurrencyCode = salon.CurrencyCode,
            TotalAppointments = totalAppointments,
            UpcomingAppointments = upcomingAppointments,
            CompletedAppointments = completedAppointments,
            CancelledAppointments = cancelledAppointments,
            NoShowAppointments = noShowAppointments,
            TotalCustomers = totalCustomers,
            Revenue = new DashboardRevenueSummary
            {
                TotalBookingValue = totalBookingValue,
                TotalAdvanceRequired = totalAdvanceRequired,
                TotalCollectedRevenue = collectedRevenue,
                TotalVerifiedRevenue = verifiedRevenue,
                TotalPendingRevenue = pendingRevenue,
                TotalRefundedAmount = refundedAmount
            },
            PopularServices = popularServices,
            Trends = trends
        };

        return Ok(response);
    }
}

