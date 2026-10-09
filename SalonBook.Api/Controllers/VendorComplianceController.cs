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
public class VendorComplianceController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<VendorComplianceController> _logger;

    public VendorComplianceController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<VendorComplianceController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve the KYC audit log, verification status, and customer dispute history for the vendor's salon.
    /// </summary>
    [HttpGet("audit-trail")]
    [ProducesResponseType(typeof(ComplianceAuditTrailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAuditTrail(CancellationToken cancellationToken = default)
    {
        return await BuildComplianceHistoryAsync(cancellationToken);
    }

    /// <summary>
    /// Alias for KYC audit and compliance history.
    /// </summary>
    [HttpGet("compliance-history")]
    [ProducesResponseType(typeof(ComplianceAuditTrailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetComplianceHistory(CancellationToken cancellationToken = default)
    {
        return await BuildComplianceHistoryAsync(cancellationToken);
    }

    private async Task<IActionResult> BuildComplianceHistoryAsync(CancellationToken cancellationToken)
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

        var logs = await _dbContext.VendorComplianceLogs
            .AsNoTracking()
            .Where(c => c.SalonId == salonId.Value)
            .OrderByDescending(c => c.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var lastKycReview = logs.FirstOrDefault(l => l.EventType.StartsWith("KYC", StringComparison.OrdinalIgnoreCase));

        var kycStatus = new VendorKycStatusResponse
        {
            SalonId = salon.Id,
            IsVerified = salon.IsVerified,
            KycStatus = salon.KycStatus,
            GstNumber = salon.GstNumber,
            LastReviewedAtUtc = lastKycReview?.ReviewedAtUtc ?? lastKycReview?.CreatedAtUtc,
            RejectionReason = lastKycReview?.RejectionReason
        };

        var auditLogs = logs
            .Where(l => !l.EventType.Contains("Dispute", StringComparison.OrdinalIgnoreCase))
            .Select(MapToComplianceItem)
            .ToList();

        var disputes = logs
            .Where(l => l.EventType.Contains("Dispute", StringComparison.OrdinalIgnoreCase))
            .Select(MapToComplianceItem)
            .ToList();

        var response = new ComplianceAuditTrailResponse
        {
            KycStatus = kycStatus,
            AuditLogs = auditLogs,
            Disputes = disputes
        };

        return Ok(response);
    }

    private static ComplianceAuditItemResponse MapToComplianceItem(VendorComplianceLog log)
    {
        return new ComplianceAuditItemResponse
        {
            Id = log.Id,
            EventType = log.EventType,
            Status = log.Status,
            RejectionReason = log.RejectionReason,
            DocumentType = log.DocumentType,
            DocumentUrl = log.DocumentUrl,
            ReviewedBy = log.ReviewedBy,
            ReviewedAtUtc = log.ReviewedAtUtc,
            DisputeDetails = log.DisputeDetails,
            CustomerIdentifier = log.CustomerIdentifier,
            DisputedAmount = log.DisputedAmount,
            CreatedAtUtc = log.CreatedAtUtc
        };
    }
}

