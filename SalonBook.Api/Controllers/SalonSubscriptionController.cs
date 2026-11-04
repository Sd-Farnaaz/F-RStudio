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
[Route("api")]
public class SalonSubscriptionController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRazorpaySubscriptionService _razorpaySubscriptionService;
    private readonly ILogger<SalonSubscriptionController> _logger;

    public SalonSubscriptionController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IRazorpaySubscriptionService razorpaySubscriptionService,
        ILogger<SalonSubscriptionController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _razorpaySubscriptionService = razorpaySubscriptionService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve current subscription plan, entitlement limits, trial countdown, and usage metrics for the authenticated salon.
    /// </summary>
    [HttpGet("vendor/subscription")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(typeof(SalonSubscriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentSubscription(CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null) return NotFound(new { message = "Salon not found." });

        var staffCount = await _dbContext.Staff
            .AsNoTracking()
            .CountAsync(s => s.SalonId == salonId.Value && s.IsActive, cancellationToken);

        var servicesCount = await _dbContext.Services
            .AsNoTracking()
            .CountAsync(s => s.SalonId == salonId.Value && s.IsActive, cancellationToken);

        var currentTier = salon.SubscriptionTier ?? SubscriptionPlanCatalog.Starter;
        var planConfig = SubscriptionPlanCatalog.GetPlanByTier(currentTier) ?? SubscriptionPlanCatalog.StarterPlan;

        var canAddStaff = !planConfig.MaxStaff.HasValue || staffCount < planConfig.MaxStaff.Value;
        var canAddService = !planConfig.MaxServices.HasValue || servicesCount < planConfig.MaxServices.Value;

        var now = DateTime.UtcNow;
        var isTrialActive = (salon.SubscriptionStatus == "Trial" || salon.SubscriptionTier == "Starter") &&
                            salon.TrialEndsAtUtc.HasValue && salon.TrialEndsAtUtc.Value > now;

        int? remainingTrialDays = null;
        if (salon.TrialEndsAtUtc.HasValue && salon.TrialEndsAtUtc.Value > now)
        {
            remainingTrialDays = Math.Max(0, (int)Math.Ceiling((salon.TrialEndsAtUtc.Value - now).TotalDays));
        }

        var isExpired = salon.SubscriptionStatus == "Expired" ||
                        (salon.SubscriptionRenewsAtUtc.HasValue && salon.SubscriptionRenewsAtUtc.Value <= now);

        var response = new SalonSubscriptionResponse
        {
            SalonId = salon.Id,
            SalonName = salon.Name,
            CurrentTier = currentTier,
            BillingCycle = salon.SubscriptionBillingCycle ?? "Monthly",
            Status = salon.SubscriptionStatus ?? "Active",
            CurrentPrice = salon.SubscriptionPrice,
            StartedAtUtc = salon.SubscriptionStartedAtUtc,
            RenewsAtUtc = salon.SubscriptionRenewsAtUtc,
            TrialEndsAtUtc = salon.TrialEndsAtUtc,
            RemainingTrialDays = remainingTrialDays,
            IsTrialActive = isTrialActive,
            IsSubscriptionExpired = isExpired,
            DeactivationReason = salon.DeactivationReason,
            IsSuspendedByAdmin = salon.IsSuspendedByAdmin,
            IsActive = salon.IsActive,
            StaffCount = staffCount,
            StaffLimit = planConfig.MaxStaff,
            ServicesCount = servicesCount,
            ServicesLimit = planConfig.MaxServices,
            CanAddStaff = canAddStaff,
            CanAddService = canAddService,
            HasAdvanceDepositEngine = !currentTier.Equals(SubscriptionPlanCatalog.Starter, StringComparison.OrdinalIgnoreCase),
            HasVerifiedReviewsAccess = true,
            HasZeroCommission = currentTier.Equals("Pro", StringComparison.OrdinalIgnoreCase) || currentTier.Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase),
            HasCustomBranding = currentTier.Equals("Pro", StringComparison.OrdinalIgnoreCase) || currentTier.Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase),
            HasPrioritySupport = !currentTier.Equals(SubscriptionPlanCatalog.Starter, StringComparison.OrdinalIgnoreCase),
            AvailablePlans = SubscriptionPlanCatalog.AllPlans.ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Create a Razorpay payment order for upgrading or renewing a salon subscription plan.
    /// </summary>
    [HttpPost("vendor/subscription/create-order")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(typeof(SubscriptionOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateSubscriptionOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        try
        {
            var response = await _razorpaySubscriptionService.CreateSubscriptionOrderAsync(salonId.Value, request, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cryptographically verify Razorpay payment signature and activate/renew subscription.
    /// </summary>
    [HttpPost("vendor/subscription/verify-payment")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(typeof(SubscriptionPaymentVerificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> VerifyPayment(
        [FromBody] VerifySubscriptionPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        try
        {
            var response = await _razorpaySubscriptionService.VerifySubscriptionPaymentAsync(salonId.Value, request, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieve transaction ledger of subscription orders and payments for this salon.
    /// </summary>
    [HttpGet("vendor/subscription/transactions")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(typeof(IReadOnlyList<SubscriptionTransactionItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetTransactions(CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var transactions = await _razorpaySubscriptionService.GetSalonTransactionsAsync(salonId.Value, cancellationToken);
        return Ok(transactions);
    }

    /// <summary>
    /// Direct instant upgrade endpoint (retained for backward compatibility and manual administrative changes).
    /// </summary>
    [HttpPost("vendor/subscription/upgrade")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(typeof(UpgradeSubscriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpgradeSubscription(
        [FromBody] UpgradeSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var salon = await _dbContext.Salons.FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
        if (salon == null) return NotFound(new { message = "Salon not found." });

        var targetPlan = SubscriptionPlanCatalog.GetPlanByTier(request.Tier);
        if (targetPlan == null)
        {
            return BadRequest(new { message = $"Invalid subscription tier '{request.Tier}'. Supported tiers: Starter, Growth, Pro." });
        }

        var billingCycle = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) ? "Annual" : "Monthly";
        var (price, _) = SubscriptionPlanCatalog.GetPriceDetails(targetPlan.Tier, billingCycle);

        var now = DateTime.UtcNow;
        var renewsAt = billingCycle == "Annual" ? now.AddYears(1) : now.AddMonths(1);
        var txRef = $"SUB-{targetPlan.Tier.ToUpperInvariant()}-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";

        salon.SubscriptionTier = targetPlan.Tier;
        salon.SubscriptionBillingCycle = billingCycle;
        salon.SubscriptionStatus = "Active";
        salon.SubscriptionPrice = price;
        salon.SubscriptionStartedAtUtc = now;
        salon.SubscriptionRenewsAtUtc = renewsAt;
        salon.UpdatedAtUtc = now;

        if (!salon.IsSuspendedByAdmin && salon.DeactivationReason != "SuperAdminSuspension")
        {
            salon.IsActive = true;
            salon.DeactivationReason = null;
        }

        if (_currentUserService.UserId.HasValue)
        {
            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = _currentUserService.UserId.Value,
                SalonId = salon.Id,
                Type = "SubscriptionUpgraded",
                Channel = "InApp",
                Subject = $"Plan Upgraded to {targetPlan.Name}!",
                Message = $"Your salon subscription is now active on the {targetPlan.Name} ({billingCycle}) plan. Your enhanced limits are unlocked immediately.",
                Status = "Sent",
                SentAtUtc = now,
                CreatedAtUtc = now
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new UpgradeSubscriptionResponse
        {
            Success = true,
            Message = $"Successfully subscribed to the {targetPlan.Name} plan!",
            SalonId = salon.Id,
            Tier = targetPlan.Tier,
            BillingCycle = billingCycle,
            AmountPaid = price,
            RenewsAtUtc = renewsAt,
            TransactionReference = txRef
        });
    }

    /// <summary>
    /// Cancel current paid subscription (will revert to Starter at the end of billing cycle).
    /// </summary>
    [HttpPost("vendor/subscription/cancel")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelSubscription(CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var salon = await _dbContext.Salons.FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
        if (salon == null) return NotFound(new { message = "Salon not found." });

        salon.SubscriptionStatus = "Cancelled";
        salon.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new 
        { 
            message = "Subscription scheduled for cancellation. Your plan perks remain active until the end of your current billing period.",
            renewsAtUtc = salon.SubscriptionRenewsAtUtc
        });
    }

    /// <summary>
    /// Platform SuperAdmin overview of all salon subscriptions, active MRR, ARR, and tier breakdowns.
    /// </summary>
    [HttpGet("superadmin/subscriptions")]
    [Authorize(Policy = "SuperAdminOnly")]
    [ProducesResponseType(typeof(SuperAdminSubscriptionOverviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetSuperAdminSubscriptions(CancellationToken cancellationToken = default)
    {
        var salons = await _dbContext.Salons
            .AsNoTracking()
            .Include(s => s.StaffMembers.Where(st => st.IsActive))
            .Include(s => s.Services.Where(sv => sv.IsActive))
            .OrderByDescending(s => s.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var starterCount = salons.Count(s => (s.SubscriptionTier ?? "Starter").Equals("Starter", StringComparison.OrdinalIgnoreCase));
        var growthCount = salons.Count(s => (s.SubscriptionTier ?? "").Equals("Growth", StringComparison.OrdinalIgnoreCase));
        var proCount = salons.Count(s => (s.SubscriptionTier ?? "").Equals("Pro", StringComparison.OrdinalIgnoreCase) || 
                                         (s.SubscriptionTier ?? "").Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase));

        // Calculate MRR
        decimal mrr = 0m;
        foreach (var s in salons.Where(s => (s.SubscriptionStatus ?? "Active") == "Active"))
        {
            if (s.SubscriptionBillingCycle == "Annual")
            {
                mrr += s.SubscriptionPrice / 12m;
            }
            else
            {
                mrr += s.SubscriptionPrice;
            }
        }

        var arr = mrr * 12m;

        var items = salons.Select(s => new SalonSubscriptionSummaryItem
        {
            SalonId = s.Id,
            SalonName = s.Name,
            City = s.City ?? "Unknown",
            ContactEmail = s.ContactEmail ?? "",
            Tier = s.SubscriptionTier ?? "Starter",
            BillingCycle = s.SubscriptionBillingCycle ?? "Monthly",
            Status = s.SubscriptionStatus ?? "Active",
            Price = s.SubscriptionPrice,
            RenewsAtUtc = s.SubscriptionRenewsAtUtc,
            StaffCount = s.StaffMembers.Count,
            ServicesCount = s.Services.Count,
            DeactivationReason = s.DeactivationReason,
            IsActive = s.IsActive
        }).ToList();

        return Ok(new SuperAdminSubscriptionOverviewResponse
        {
            TotalSalons = salons.Count,
            StarterCount = starterCount,
            GrowthCount = growthCount,
            ProCount = proCount,
            MonthlyRecurringRevenue = Math.Round(mrr, 2),
            AnnualRunRate = Math.Round(arr, 2),
            Salons = items
        });
    }

    /// <summary>
    /// SuperAdmin manual assignment of a salon's subscription tier.
    /// </summary>
    [HttpPut("superadmin/salons/{id:int}/subscription")]
    [Authorize(Policy = "SuperAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdminAssignTier(
        int id, 
        [FromBody] UpgradeSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var salon = await _dbContext.Salons.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (salon == null) return NotFound(new { message = "Salon not found." });

        var targetPlan = SubscriptionPlanCatalog.GetPlanByTier(request.Tier);
        if (targetPlan == null)
        {
            return BadRequest(new { message = $"Invalid tier '{request.Tier}'." });
        }

        var billingCycle = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) ? "Annual" : "Monthly";
        var (price, _) = SubscriptionPlanCatalog.GetPriceDetails(targetPlan.Tier, billingCycle);

        salon.SubscriptionTier = targetPlan.Tier;
        salon.SubscriptionBillingCycle = billingCycle;
        salon.SubscriptionStatus = "Active";
        salon.SubscriptionPrice = price;
        salon.SubscriptionRenewsAtUtc = billingCycle == "Annual" ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(1);
        salon.UpdatedAtUtc = DateTime.UtcNow;

        if (!salon.IsSuspendedByAdmin && salon.DeactivationReason != "SuperAdminSuspension")
        {
            salon.IsActive = true;
            salon.DeactivationReason = null;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Successfully assigned {targetPlan.Name} to {salon.Name}." });
    }
}
