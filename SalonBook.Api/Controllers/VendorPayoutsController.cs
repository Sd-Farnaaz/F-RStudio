using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/vendors")]
[Authorize(Policy = "SalonAdminOnly")]
public class VendorPayoutsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<VendorPayoutsController> _logger;

    public VendorPayoutsController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<VendorPayoutsController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve payout records and settlement transactions for the authenticated vendor's salon.
    /// </summary>
    [HttpGet("payouts")]
    [ProducesResponseType(typeof(PagedResult<VendorPayoutResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPayouts(
        [FromQuery] string? status,
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

        var query = _dbContext.VendorPayouts
            .AsNoTracking()
            .Where(p => p.SalonId == salonId.Value);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim();
            query = query.Where(p => p.Status == normalizedStatus);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var payouts = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => MapToPayoutResponse(p))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<VendorPayoutResponse>
        {
            Items = payouts,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(result);
    }

    /// <summary>
    /// Retrieve escrow ledger totals and settlement transaction history.
    /// </summary>
    [HttpGet("escrow-ledger")]
    [ProducesResponseType(typeof(EscrowLedgerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEscrowLedger(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
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

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var allPayoutsQuery = _dbContext.VendorPayouts
            .AsNoTracking()
            .Where(p => p.SalonId == salonId.Value);

        var totalEscrowHold = await allPayoutsQuery
            .Where(p => p.Status == "Pending")
            .SumAsync(p => p.NetAmount, cancellationToken);

        var totalDisbursed = await allPayoutsQuery
            .Where(p => p.Status == "Disbursed")
            .SumAsync(p => p.NetAmount, cancellationToken);

        var totalPendingSettlement = await allPayoutsQuery
            .Where(p => p.Status == "Processed")
            .SumAsync(p => p.NetAmount, cancellationToken);

        var totalCount = await allPayoutsQuery.CountAsync(cancellationToken);

        var pagedTransactions = await allPayoutsQuery
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => MapToPayoutResponse(p))
            .ToListAsync(cancellationToken);

        var response = new EscrowLedgerResponse
        {
            TotalEscrowHold = totalEscrowHold,
            TotalDisbursed = totalDisbursed,
            TotalPendingSettlement = totalPendingSettlement,
            CurrencyCode = salon.CurrencyCode,
            Transactions = new PagedResult<VendorPayoutResponse>
            {
                Items = pagedTransactions,
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount
            }
        };

        return Ok(response);
    }

    /// <summary>
    /// Request settlement and bank transfer for all accumulated escrow holdings.
    /// </summary>
    [HttpPost("payouts/request-settlement")]
    [ProducesResponseType(typeof(RequestSettlementResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RequestSettlement(CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var pendingPayouts = await _dbContext.VendorPayouts
            .Where(p => p.SalonId == salonId.Value && p.Status == "Pending")
            .ToListAsync(cancellationToken);

        if (pendingPayouts.Count == 0)
        {
            return BadRequest(new { message = "You have no pending escrow funds available for payout settlement." });
        }

        var totalAmount = pendingPayouts.Sum(p => p.NetAmount);
        var now = DateTime.UtcNow;

        foreach (var p in pendingPayouts)
        {
            p.Status = "Processed";
            p.UpdatedAtUtc = now;
            p.Notes = $"{p.Notes} | Settlement batched on {now:yyyy-MM-dd}";
        }

        // Create In-App Notification
        if (_currentUserService.UserId.HasValue)
        {
            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = _currentUserService.UserId.Value,
                SalonId = salonId.Value,
                Type = "SettlementRequested",
                Channel = "InApp",
                Subject = "Payout Settlement Requested",
                Message = $"Your settlement request for ₹{totalAmount:F2} across {pendingPayouts.Count} bookings has been queued for bank disbursement.",
                Status = "Sent",
                SentAtUtc = now,
                CreatedAtUtc = now
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new RequestSettlementResponse
        {
            Success = true,
            Message = $"Successfully submitted settlement request for ₹{totalAmount:F2}.",
            BatchedPayoutCount = pendingPayouts.Count,
            TotalSettlementAmount = totalAmount,
            RequestedAtUtc = now
        });
    }

    /// <summary>
    /// Disburse a processed payout with bank transaction reference / UTR number.
    /// </summary>
    [HttpPost("payouts/{id:int}/disburse")]
    [Authorize(Policy = "SalonAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DisbursePayout(
        int id,
        [FromBody] DisbursePayoutRequest request,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var payout = await _dbContext.VendorPayouts
            .FirstOrDefaultAsync(p => p.Id == id && p.SalonId == salonId.Value, cancellationToken);

        if (payout == null)
        {
            return NotFound(new { message = $"Payout #{id} not found." });
        }

        if (string.IsNullOrWhiteSpace(request.UtrNumber))
        {
            return BadRequest(new { message = "Valid Bank UTR / Reference number is required for disbursement." });
        }

        payout.Status = "Disbursed";
        payout.UtrNumber = request.UtrNumber.Trim();
        payout.DisbursedAtUtc = DateTime.UtcNow;
        payout.BankReleaseAtUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            payout.Notes = $"{payout.Notes} | Disbursed: {request.Notes.Trim()}";
        }
        payout.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Payout #{id} marked as Disbursed with UTR: {request.UtrNumber}.", payout = MapToPayoutResponse(payout) });
    }

    private static VendorPayoutResponse MapToPayoutResponse(VendorPayout p)
    {
        return new VendorPayoutResponse
        {
            Id = p.Id,
            SalonId = p.SalonId,
            EscrowTransactionId = p.EscrowTransactionId,
            Amount = p.Amount,
            CommissionAmount = p.CommissionAmount,
            NetAmount = p.NetAmount,
            CurrencyCode = p.CurrencyCode,
            Status = p.Status,
            UtrNumber = p.UtrNumber,
            BankReleaseAtUtc = p.BankReleaseAtUtc,
            DisbursedAtUtc = p.DisbursedAtUtc,
            Notes = p.Notes,
            CreatedAtUtc = p.CreatedAtUtc
        };
    }
}

