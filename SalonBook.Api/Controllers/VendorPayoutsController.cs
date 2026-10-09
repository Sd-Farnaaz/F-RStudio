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

