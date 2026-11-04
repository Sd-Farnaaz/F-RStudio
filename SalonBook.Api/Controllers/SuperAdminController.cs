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
[Route("api/superadmin")]
[Authorize(Policy = "SuperAdminOnly")]
public class SuperAdminController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IEmailService _emailService;
    private readonly IEmailTemplateBuilder _emailTemplateBuilder;
    private readonly ILogger<SuperAdminController> _logger;

    public SuperAdminController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IEmailService emailService,
        IEmailTemplateBuilder emailTemplateBuilder,
        ILogger<SuperAdminController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _emailService = emailService;
        _emailTemplateBuilder = emailTemplateBuilder;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve platform-wide overview metrics, totals, and recent salons for SuperAdmin.
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(SuperAdminOverviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var totalSalons = await _dbContext.Salons.CountAsync(cancellationToken);
        var activeSalons = await _dbContext.Salons.CountAsync(s => s.IsActive, cancellationToken);
        var pendingVerificationSalons = await _dbContext.Salons
            .CountAsync(s => !s.IsVerified || s.KycStatus == "Pending" || s.KycStatus == "NotSubmitted", cancellationToken);

        var totalUsers = await _dbContext.Users.CountAsync(cancellationToken);
        var totalCustomers = await _dbContext.Users.CountAsync(u => u.Role == Roles.User, cancellationToken);
        var totalSalonAdmins = await _dbContext.Users.CountAsync(u => u.Role == Roles.Admin, cancellationToken);

        var totalAppointments = await _dbContext.Appointments.CountAsync(cancellationToken);
        var totalGrossRevenue = await _dbContext.Appointments
            .Where(a => a.Status != "Cancelled")
            .SumAsync(a => (decimal?)a.PriceAtBooking, cancellationToken) ?? 0m;

        // Cross-Phase Platform Insights (Reviews, Client Dossiers, Escrow Holdings, SaaS MRR)
        var totalVerifiedReviews = await _dbContext.Reviews.CountAsync(cancellationToken);
        var totalConsultationCards = await _dbContext.ClientConsultationCards.CountAsync(cancellationToken);
        var totalPendingEscrow = await _dbContext.VendorPayouts
            .Where(p => p.Status == "Pending" || p.Status == "Processed")
            .SumAsync(p => (decimal?)p.NetAmount, cancellationToken) ?? 0m;

        var activeSalonsList = await _dbContext.Salons
            .AsNoTracking()
            .Where(s => s.IsActive && s.SubscriptionStatus == "Active")
            .Select(s => new { s.SubscriptionBillingCycle, s.SubscriptionPrice })
            .ToListAsync(cancellationToken);

        decimal mrr = 0m;
        foreach (var s in activeSalonsList)
        {
            mrr += s.SubscriptionBillingCycle == "Annual" ? s.SubscriptionPrice / 12m : s.SubscriptionPrice;
        }

        var recentSalons = await _dbContext.Salons
            .AsNoTracking()
            .OrderByDescending(s => s.CreatedAtUtc)
            .Take(5)
            .Select(s => new SuperAdminRecentSalonItem
            {
                Id = s.Id,
                Name = s.Name,
                Slug = s.Slug,
                BusinessType = s.BusinessType,
                City = s.City,
                IsActive = s.IsActive,
                IsVerified = s.IsVerified,
                KycStatus = s.KycStatus,
                SubscriptionTier = s.SubscriptionTier ?? "Starter",
                CreatedAtUtc = s.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var response = new SuperAdminOverviewResponse
        {
            TotalSalons = totalSalons,
            ActiveSalons = activeSalons,
            PendingVerificationSalons = pendingVerificationSalons,
            TotalUsers = totalUsers,
            TotalCustomers = totalCustomers,
            TotalSalonAdmins = totalSalonAdmins,
            TotalAppointments = totalAppointments,
            TotalGrossRevenue = totalGrossRevenue,
            PlatformHealth = "Healthy",
            TotalVerifiedReviews = totalVerifiedReviews,
            TotalConsultationCards = totalConsultationCards,
            TotalPendingEscrow = Math.Round(totalPendingEscrow, 2),
            MonthlyRecurringRevenue = Math.Round(mrr, 2),
            RecentSalons = recentSalons
        };

        return Ok(response);
    }

    /// <summary>
    /// Browse and search all salons across the platform with pagination and status filters.
    /// </summary>
    [HttpGet("salons")]
    [ProducesResponseType(typeof(PagedResult<SuperAdminSalonResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListSalons(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isVerified,
        [FromQuery] string? kycStatus,
        [FromQuery] string? subscriptionTier,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Salons.AsNoTracking();

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        if (isVerified.HasValue)
        {
            query = query.Where(s => s.IsVerified == isVerified.Value);
        }

        if (!string.IsNullOrWhiteSpace(kycStatus) && !kycStatus.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedKyc = kycStatus.Trim().ToLower();
            query = query.Where(s => s.KycStatus.ToLower() == normalizedKyc);
        }

        if (!string.IsNullOrWhiteSpace(subscriptionTier) && !subscriptionTier.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var tierTerm = subscriptionTier.Trim().ToLower();
            query = query.Where(s => (s.SubscriptionTier ?? "Starter").ToLower() == tierTerm);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) ||
                                     s.Slug.ToLower().Contains(term) ||
                                     (s.City != null && s.City.ToLower().Contains(term)) ||
                                     (s.ContactEmail != null && s.ContactEmail.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var salons = await query
            .OrderByDescending(s => s.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SuperAdminSalonResponse
            {
                Id = s.Id,
                Name = s.Name,
                Slug = s.Slug,
                BusinessType = s.BusinessType,
                City = s.City,
                State = s.State,
                ContactEmail = s.ContactEmail,
                PhoneNumber = s.PhoneNumber,
                IsActive = s.IsActive,
                IsVerified = s.IsVerified,
                KycStatus = s.KycStatus,
                OnboardingState = s.OnboardingState,
                AdminEmail = s.Users.Where(u => u.Role == Roles.Admin).Select(u => u.Email).FirstOrDefault(),
                AdminFullName = s.Users.Where(u => u.Role == Roles.Admin).Select(u => u.FullName).FirstOrDefault(),
                TotalStaff = s.StaffMembers.Count,
                TotalServices = s.Services.Count,
                TotalAppointments = s.Appointments.Count,
                CreatedAtUtc = s.CreatedAtUtc,

                // Cross-Phase Data
                SubscriptionTier = s.SubscriptionTier ?? "Starter",
                SubscriptionStatus = s.SubscriptionStatus ?? "Active",
                DeactivationReason = s.DeactivationReason,
                IsSuspendedByAdmin = s.IsSuspendedByAdmin,
                TrialEndsAtUtc = s.TrialEndsAtUtc,
                AverageRating = s.Reviews.Any() ? Math.Round(s.Reviews.Average(r => r.Rating), 1) : 0,
                TotalReviews = s.Reviews.Count,
                TotalConsultationCards = _dbContext.ClientConsultationCards.Count(c => c.SalonId == s.Id),
                TotalPendingEscrow = s.Payouts.Where(p => p.Status == "Pending" || p.Status == "Processed").Sum(p => p.NetAmount)
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<SuperAdminSalonResponse>
        {
            Items = salons,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        });
    }

    /// <summary>
    /// Retrieve full details and performance metrics for a specific salon.
    /// </summary>
    [HttpGet("salons/{id:int}")]
    [ProducesResponseType(typeof(SuperAdminSalonDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSalonById(int id, CancellationToken cancellationToken)
    {
        var salon = await _dbContext.Salons
            .AsNoTracking()
            .Include(s => s.Users.Where(u => u.Role == Roles.Admin))
            .Include(s => s.StaffMembers)
            .Include(s => s.Services)
            .Include(s => s.Appointments)
            .Include(s => s.Reviews)
            .Include(s => s.Payouts)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon not found." });
        }

        var adminUser = salon.Users.FirstOrDefault(u => u.Role == Roles.Admin);
        var totalRevenue = salon.Appointments
            .Where(a => a.Status != "Cancelled")
            .Sum(a => a.PriceAtBooking);

        var totalConsultationCards = await _dbContext.ClientConsultationCards.CountAsync(c => c.SalonId == id, cancellationToken);
        var totalFormulas = await _dbContext.ClientFormulaRecords.CountAsync(f => f.SalonId == id, cancellationToken);
        var avgRating = salon.Reviews.Any() ? Math.Round(salon.Reviews.Average(r => r.Rating), 1) : 0;
        var pendingEscrow = salon.Payouts.Where(p => p.Status == "Pending" || p.Status == "Processed").Sum(p => p.NetAmount);
        var disbursedEscrow = salon.Payouts.Where(p => p.Status == "Disbursed").Sum(p => p.NetAmount);

        var response = new SuperAdminSalonDetailResponse
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
            TimeZone = salon.TimeZone,
            CurrencyCode = salon.CurrencyCode,
            LogoUrl = salon.LogoUrl,
            IsActive = salon.IsActive,
            IsVerified = salon.IsVerified,
            KycStatus = salon.KycStatus,
            OnboardingState = salon.OnboardingState,
            AdminEmail = adminUser?.Email,
            AdminFullName = adminUser?.FullName,
            TotalStaff = salon.StaffMembers.Count,
            TotalServices = salon.Services.Count,
            TotalAppointments = salon.Appointments.Count,
            TotalRevenue = totalRevenue,
            CreatedAtUtc = salon.CreatedAtUtc,

            // Phase 1, Phase 2, Phase 3 Enhancements
            SubscriptionTier = salon.SubscriptionTier ?? "Starter",
            SubscriptionBillingCycle = salon.SubscriptionBillingCycle ?? "Monthly",
            SubscriptionStatus = salon.SubscriptionStatus ?? "Active",
            DeactivationReason = salon.DeactivationReason,
            IsSuspendedByAdmin = salon.IsSuspendedByAdmin,
            TrialEndsAtUtc = salon.TrialEndsAtUtc,
            SubscriptionPrice = salon.SubscriptionPrice,
            SubscriptionRenewsAtUtc = salon.SubscriptionRenewsAtUtc,
            GstNumber = salon.GstNumber,
            UpiId = salon.UpiId,
            IsAdvancePaymentRequired = salon.IsAdvancePaymentRequired,
            AdvancePaymentType = salon.AdvancePaymentType,
            AdvancePaymentValue = salon.AdvancePaymentValue,
            AverageRating = avgRating,
            TotalReviews = salon.Reviews.Count,
            TotalConsultationCards = totalConsultationCards,
            TotalFormulaRecords = totalFormulas,
            TotalPendingEscrow = pendingEscrow,
            TotalDisbursedEscrow = disbursedEscrow
        };

        return Ok(response);
    }

    /// <summary>
    /// Activate or deactivate a salon on the platform.
    /// </summary>
    [HttpPatch("salons/{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSalonStatus(int id, [FromBody] UpdateSalonStatusRequest request, CancellationToken cancellationToken)
    {
        var salon = await _dbContext.Salons.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (salon == null)
        {
            return NotFound(new { message = "Salon not found." });
        }

        salon.IsActive = request.IsActive;
        salon.IsSuspendedByAdmin = !request.IsActive;
        salon.DeactivationReason = !request.IsActive ? (request.Reason ?? "SuperAdminSuspension") : null;
        salon.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminEmail} updated Salon ID {SalonId} active status to {IsActive}. Reason: {Reason}",
            _currentUserService.Email, salon.Id, request.IsActive, request.Reason ?? "Not specified");

        return Ok(new
        {
            message = $"Salon status updated to {(salon.IsActive ? "active" : "inactive")}.",
            salonId = salon.Id,
            isActive = salon.IsActive
        });
    }

    /// <summary>
    /// Update KYC verification status of a salon.
    /// </summary>
    [HttpPatch("salons/{id:int}/kyc")]
    [ProducesResponseType(typeof(SuperAdminSalonDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSalonKyc(int id, [FromBody] UpdateSalonKycRequest request, CancellationToken cancellationToken)
    {
        var validKycStatuses = new[] { "Verified", "Rejected", "Pending", "NotSubmitted" };
        if (!validKycStatuses.Contains(request.KycStatus, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = $"Invalid KycStatus. Allowed values: {string.Join(", ", validKycStatuses)}" });
        }

        var salon = await _dbContext.Salons.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (salon == null)
        {
            return NotFound(new { message = "Salon not found." });
        }

        salon.KycStatus = request.KycStatus;
        salon.IsVerified = request.IsVerified;
        salon.UpdatedAtUtc = DateTime.UtcNow;

        // Log compliance audit entry
        var complianceLog = new VendorComplianceLog
        {
            SalonId = salon.Id,
            EventType = request.KycStatus.Equals("Verified", StringComparison.OrdinalIgnoreCase) ? "KYC_Verification" : "KYC_Rejection",
            Status = request.KycStatus.Equals("Verified", StringComparison.OrdinalIgnoreCase) ? "Approved" : "Rejected",
            RejectionReason = request.Notes,
            ReviewedBy = _currentUserService.Email ?? "SuperAdmin",
            ReviewedAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.VendorComplianceLogs.Add(complianceLog);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminEmail} updated KYC for Salon ID {SalonId}: Status={KycStatus}, Verified={IsVerified}",
            _currentUserService.Email, salon.Id, salon.KycStatus, salon.IsVerified);

        return await GetSalonById(id, cancellationToken);
    }

    /// <summary>
    /// Browse and search platform users across all roles.
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(PagedResult<SuperAdminUserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Salon)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            var normalizedRole = role.Trim().ToLower();
            query = query.Where(u => u.Role.ToLower() == normalizedRole);
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderByDescending(u => u.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new SuperAdminUserResponse
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role,
                SalonId = u.SalonId,
                SalonName = u.Salon != null ? u.Salon.Name : null,
                IsActive = u.IsActive,
                IsEmailVerified = u.IsEmailVerified,
                CreatedAtUtc = u.CreatedAtUtc,
                LastLoginAtUtc = u.LastLoginAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<SuperAdminUserResponse>
        {
            Items = users,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        });
    }

    /// <summary>
    /// Activate or deactivate a user account.
    /// </summary>
    [HttpPatch("users/{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateUserStatusRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (user.Id == _currentUserService.UserId && !request.IsActive)
        {
            return BadRequest(new { message = "You cannot deactivate your own SuperAdmin account." });
        }

        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminEmail} updated User ID {UserId} ({Role}) active status to {IsActive}",
            _currentUserService.Email, user.Id, user.Role, request.IsActive);

        return Ok(new
        {
            message = $"User status updated to {(user.IsActive ? "active" : "inactive")}.",
            userId = user.Id,
            isActive = user.IsActive
        });
    }

    /// <summary>
    /// Platform-wide settlements and escrow ledger for SuperAdmin with status filtering.
    /// </summary>
    [HttpGet("settlements")]
    [ProducesResponseType(typeof(SuperAdminSettlementsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetSettlements(
        [FromQuery] string? status,
        [FromQuery] int? salonId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var totalPending = await _dbContext.VendorPayouts
            .Where(p => p.Status == "Pending")
            .SumAsync(p => (decimal?)p.NetAmount, cancellationToken) ?? 0m;

        var totalProcessed = await _dbContext.VendorPayouts
            .Where(p => p.Status == "Processed")
            .SumAsync(p => (decimal?)p.NetAmount, cancellationToken) ?? 0m;

        var totalDisbursed = await _dbContext.VendorPayouts
            .Where(p => p.Status == "Disbursed")
            .SumAsync(p => (decimal?)p.NetAmount, cancellationToken) ?? 0m;

        var query = _dbContext.VendorPayouts
            .AsNoTracking()
            .Include(p => p.Salon)
            .AsQueryable();

        if (salonId.HasValue)
        {
            query = query.Where(p => p.SalonId == salonId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim().ToLower();
            query = query.Where(p => p.Status.ToLower() == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => (p.Salon != null && p.Salon.Name.ToLower().Contains(term)) ||
                                     p.EscrowTransactionId.ToLower().Contains(term) ||
                                     (p.UtrNumber != null && p.UtrNumber.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new SuperAdminSettlementItem
            {
                Id = p.Id,
                SalonId = p.SalonId,
                SalonName = p.Salon != null ? p.Salon.Name : "Unknown Salon",
                SalonCity = p.Salon != null && p.Salon.City != null ? p.Salon.City : "—",
                EscrowTransactionId = p.EscrowTransactionId,
                Amount = p.Amount,
                CommissionAmount = p.CommissionAmount,
                NetAmount = p.NetAmount,
                CurrencyCode = p.CurrencyCode,
                Status = p.Status,
                UtrNumber = p.UtrNumber,
                DisbursedAtUtc = p.DisbursedAtUtc,
                Notes = p.Notes,
                CreatedAtUtc = p.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new SuperAdminSettlementsResponse
        {
            TotalPendingEscrow = Math.Round(totalPending, 2),
            TotalProcessedSettlement = Math.Round(totalProcessed, 2),
            TotalDisbursed = Math.Round(totalDisbursed, 2),
            Settlements = new PagedResult<SuperAdminSettlementItem>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            }
        });
    }

    /// <summary>
    /// Disburse a settlement payout and record bank UTR reference.
    /// </summary>
    [HttpPost("settlements/{id:int}/disburse")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DisburseSettlement(
        int id,
        [FromBody] DisburseSettlementRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UtrNumber))
        {
            return BadRequest(new { message = "Bank UTR or transfer reference is required." });
        }

        var payout = await _dbContext.VendorPayouts
            .Include(p => p.Salon)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (payout == null)
        {
            return NotFound(new { message = "Settlement record not found." });
        }

        if (payout.Status == "Disbursed")
        {
            return BadRequest(new { message = "This settlement has already been disbursed." });
        }

        payout.Status = "Disbursed";
        payout.UtrNumber = request.UtrNumber.Trim();
        payout.DisbursedAtUtc = DateTime.UtcNow;
        payout.UpdatedAtUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            payout.Notes = string.IsNullOrWhiteSpace(payout.Notes)
                ? request.Notes.Trim()
                : $"{payout.Notes}; {request.Notes.Trim()}";
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("SuperAdmin {AdminEmail} marked payout ID {PayoutId} (Salon {SalonId}) as Disbursed with UTR {UtrNumber}",
            _currentUserService.Email, payout.Id, payout.SalonId, payout.UtrNumber);

        return Ok(new
        {
            message = "Settlement marked as Disbursed successfully.",
            payoutId = payout.Id,
            salonId = payout.SalonId,
            status = payout.Status,
            utrNumber = payout.UtrNumber,
            disbursedAtUtc = payout.DisbursedAtUtc
        });
    }

    /// <summary>
    /// Temporary authenticated SuperAdmin-only endpoint to send a real test email verifying Brevo SMTP credentials.
    /// </summary>
    [HttpPost("email/test")]
    [ProducesResponseType(typeof(SendTestEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(SendTestEmailResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SendTestEmail(
        [FromBody] SendTestEmailRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.RecipientEmail))
        {
            return BadRequest(new SendTestEmailResponse
            {
                Success = false,
                Message = "Recipient email address is required.",
                ErrorCode = "INVALID_RECIPIENT",
                SentAtUtc = DateTime.UtcNow
            });
        }

        var recipient = request.RecipientEmail.Trim();

        var testTemplate = _emailTemplateBuilder.BuildInternalSmtpTestEmail(recipient);
        var result = await _emailService.SendEmailAsync(recipient, testTemplate.Subject, testTemplate.HtmlBody, testTemplate.PlainTextBody, cancellationToken);

        if (!result.Success)
        {
            _logger.LogWarning("SuperAdmin test email to {Recipient} failed or was skipped: {ErrorCode} - {ErrorMessage}",
                recipient, result.ErrorCode, result.ErrorMessage);

            return BadRequest(new SendTestEmailResponse
            {
                Success = false,
                Message = result.Skipped
                    ? $"Email sending was skipped: {result.ErrorMessage}"
                    : $"Failed to send test email: {result.ErrorMessage}",
                RecipientEmail = recipient,
                ErrorCode = result.ErrorCode,
                ErrorMessage = result.ErrorMessage,
                SentAtUtc = DateTime.UtcNow
            });
        }

        _logger.LogInformation("SuperAdmin test email successfully dispatched to {Recipient}", recipient);

        return Ok(new SendTestEmailResponse
        {
            Success = true,
            Message = "Test email sent successfully via Brevo SMTP.",
            RecipientEmail = recipient,
            SentAtUtc = DateTime.UtcNow
        });
    }
}

