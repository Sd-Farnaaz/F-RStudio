using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private readonly ILogger<SalonSubscriptionController> _logger;

    public SalonSubscriptionController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<SalonSubscriptionController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    private static readonly List<SubscriptionPlanInfo> SystemPlans = new()
    {
        new SubscriptionPlanInfo
        {
            Tier = "Starter",
            Name = "Starter Solo",
            Tagline = "Ideal for independent solo stylists and boutique chairs.",
            MonthlyPrice = 0.00m,
            AnnualPrice = 0.00m,
            MaxStaff = 1,
            MaxServices = 5,
            CommissionPercent = 5.0m,
            IsPopular = false,
            Features = new List<string>
            {
                "1 Specialist Staff Profile",
                "Up to 5 Salon Services",
                "Direct UPI & QR Code Payments",
                "Standard Calendar Scheduling",
                "Basic Client Appointment Ledger",
                "5% Platform Settlement Fee"
            }
        },
        new SubscriptionPlanInfo
        {
            Tier = "Growth",
            Name = "Growth Studio",
            Tagline = "For expanding salons seeking online payments and client retention.",
            MonthlyPrice = 1499.00m,
            AnnualPrice = 14990.00m,
            MaxStaff = 10,
            MaxServices = null, // Unlimited
            CommissionPercent = 2.5m,
            IsPopular = true,
            Features = new List<string>
            {
                "Up to 10 Specialist Profiles",
                "Unlimited Salon Services & Categories",
                "Instant Online Payment Gateway (UPI / Cards / Net Banking)",
                "Automated Advance Deposits & No-Show Shield",
                "Digital GST Tax Invoicing & Downloadable Receipts",
                "Verified Customer Reviews & Owner Reply Engine",
                "Automated SMS & Email Appointment Reminders",
                "Reduced 2.5% Platform Settlement Fee"
            }
        },
        new SubscriptionPlanInfo
        {
            Tier = "LuxuryPro",
            Name = "Luxury Pro",
            Tagline = "The complete enterprise suite for luxury spas, premium chains & studios.",
            MonthlyPrice = 3999.00m,
            AnnualPrice = 39990.00m,
            MaxStaff = null, // Unlimited
            MaxServices = null, // Unlimited
            CommissionPercent = 0.0m,
            IsPopular = false,
            Features = new List<string>
            {
                "Unlimited Staff Specialists & Multi-Chair Management",
                "Unlimited Services with Multi-Treatment Bundle Builder",
                "0% Platform Commission — Retain 100% of Revenue",
                "Automated Daily Escrow Payouts & Fast-Track Settlement",
                "Branded Invoices with Custom Salon Logo & GSTIN",
                "Advanced Financial & Revenue Performance Analytics",
                "Multi-Channel VIP Client Notifications",
                "Dedicated 24/7 Concierge & Account Manager"
            }
        }
    };

    /// <summary>
    /// Retrieve current subscription plan, entitlement limits, and usage metrics for the authenticated salon.
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

        var currentTier = salon.SubscriptionTier ?? "Starter";
        var planConfig = SystemPlans.FirstOrDefault(p => p.Tier.Equals(currentTier, StringComparison.OrdinalIgnoreCase)) 
                         ?? SystemPlans[0];

        var canAddStaff = !planConfig.MaxStaff.HasValue || staffCount < planConfig.MaxStaff.Value;
        var canAddService = !planConfig.MaxServices.HasValue || servicesCount < planConfig.MaxServices.Value;

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
            StaffCount = staffCount,
            StaffLimit = planConfig.MaxStaff,
            ServicesCount = servicesCount,
            ServicesLimit = planConfig.MaxServices,
            CanAddStaff = canAddStaff,
            CanAddService = canAddService,
            HasAdvanceDepositEngine = !currentTier.Equals("Starter", StringComparison.OrdinalIgnoreCase),
            HasVerifiedReviewsAccess = true,
            HasZeroCommission = currentTier.Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase),
            HasCustomBranding = currentTier.Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase),
            HasPrioritySupport = !currentTier.Equals("Starter", StringComparison.OrdinalIgnoreCase),
            AvailablePlans = SystemPlans
        };

        return Ok(response);
    }

    /// <summary>
    /// Upgrade or change salon subscription plan tier and billing cycle.
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

        var targetPlan = SystemPlans.FirstOrDefault(p => p.Tier.Equals(request.Tier, StringComparison.OrdinalIgnoreCase));
        if (targetPlan == null)
        {
            return BadRequest(new { message = $"Invalid subscription tier '{request.Tier}'. Supported tiers: Starter, Growth, LuxuryPro." });
        }

        var billingCycle = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) ? "Annual" : "Monthly";
        var price = billingCycle == "Annual" ? targetPlan.AnnualPrice : targetPlan.MonthlyPrice;

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

        // In-App Notification for Salon Manager
        if (_currentUserService.UserId.HasValue)
        {
            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = _currentUserService.UserId.Value,
                SalonId = salon.Id,
                Type = "SubscriptionUpgraded",
                Channel = "InApp",
                Subject = $"Plan Upgraded to {targetPlan.Name}!",
                Message = $"Your salon subscription is now active on the {targetPlan.Name} ({billingCycle}) plan. Your enhanced specialist limits and platform perks are unlocked immediately.",
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
        var luxuryProCount = salons.Count(s => (s.SubscriptionTier ?? "").Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase));

        // Calculate MRR: monthly price + (annual price / 12)
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
            ServicesCount = s.Services.Count
        }).ToList();

        return Ok(new SuperAdminSubscriptionOverviewResponse
        {
            TotalSalons = salons.Count,
            StarterCount = starterCount,
            GrowthCount = growthCount,
            LuxuryProCount = luxuryProCount,
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

        var targetPlan = SystemPlans.FirstOrDefault(p => p.Tier.Equals(request.Tier, StringComparison.OrdinalIgnoreCase));
        if (targetPlan == null)
        {
            return BadRequest(new { message = $"Invalid tier '{request.Tier}'." });
        }

        var billingCycle = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) ? "Annual" : "Monthly";
        var price = billingCycle == "Annual" ? targetPlan.AnnualPrice : targetPlan.MonthlyPrice;

        salon.SubscriptionTier = targetPlan.Tier;
        salon.SubscriptionBillingCycle = billingCycle;
        salon.SubscriptionStatus = "Active";
        salon.SubscriptionPrice = price;
        salon.SubscriptionRenewsAtUtc = billingCycle == "Annual" ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(1);
        salon.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Successfully assigned {targetPlan.Name} to {salon.Name}." });
    }
}
