using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/salon/payment-settings")]
[Authorize(Policy = "SalonAdminOnly")]
public class SalonPaymentSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<SalonPaymentSettingsController> _logger;

    public SalonPaymentSettingsController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<SalonPaymentSettingsController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve UPI and booking advance payment settings for the authenticated salon administrator.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(SalonPaymentSettingsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPaymentSettings(CancellationToken cancellationToken)
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
            return NotFound(new { message = "Salon profile was not found." });
        }

        var tier = salon.SubscriptionTier ?? Common.SubscriptionPlanCatalog.Starter;
        var hasAdvance = !tier.Equals(Common.SubscriptionPlanCatalog.Starter, StringComparison.OrdinalIgnoreCase);

        var response = new SalonPaymentSettingsResponse
        {
            SalonId = salon.Id,
            UpiId = salon.UpiId,
            QrCodeImageUrl = salon.QrCodeImageUrl,
            IsAdvancePaymentRequired = salon.IsAdvancePaymentRequired,
            AdvancePaymentType = salon.AdvancePaymentType,
            AdvancePaymentValue = salon.AdvancePaymentValue,
            CurrencyCode = salon.CurrencyCode,
            CurrentTier = tier,
            HasAdvanceDepositEngine = hasAdvance
        };

        return Ok(response);
    }

    /// <summary>
    /// Configure UPI ID, QR code image reference, and advance booking deposit rules for the salon.
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(SalonPaymentSettingsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePaymentSettings(
        [FromBody] UpdateSalonPaymentSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var salon = await _dbContext.Salons
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);

        if (salon == null)
        {
            return NotFound(new { message = "Salon profile was not found." });
        }

        var tier = salon.SubscriptionTier ?? Common.SubscriptionPlanCatalog.Starter;
        var hasAdvance = !tier.Equals(Common.SubscriptionPlanCatalog.Starter, StringComparison.OrdinalIgnoreCase);

        if (request.IsAdvancePaymentRequired && !hasAdvance)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Automated Advance Deposits & No-Show Shield requires Growth Studio or Pro plan. Please upgrade your subscription on the Plan & Billing page to enable online advance deposits.",
                upgradeRequired = true,
                currentTier = tier
            });
        }

        salon.UpiId = request.UpiId?.Trim();
        salon.QrCodeImageUrl = request.QrCodeImageUrl?.Trim();
        salon.IsAdvancePaymentRequired = request.IsAdvancePaymentRequired;

        if (request.IsAdvancePaymentRequired)
        {
            salon.AdvancePaymentType = request.AdvancePaymentType?.Trim();
            salon.AdvancePaymentValue = request.AdvancePaymentValue;
        }
        else
        {
            salon.AdvancePaymentType = null;
            salon.AdvancePaymentValue = null;
        }

        salon.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Payment settings updated for Salon ID {SalonId} by Admin {Email}.", salon.Id, _currentUserService.Email);

        var response = new SalonPaymentSettingsResponse
        {
            SalonId = salon.Id,
            UpiId = salon.UpiId,
            QrCodeImageUrl = salon.QrCodeImageUrl,
            IsAdvancePaymentRequired = salon.IsAdvancePaymentRequired,
            AdvancePaymentType = salon.AdvancePaymentType,
            AdvancePaymentValue = salon.AdvancePaymentValue,
            CurrencyCode = salon.CurrencyCode,
            CurrentTier = tier,
            HasAdvanceDepositEngine = hasAdvance
        };

        return Ok(response);
    }
}

