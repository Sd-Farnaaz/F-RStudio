namespace SalonBook.Api.DTOs;

public class VendorKycStatusResponse
{
    public int SalonId { get; set; }

    public bool IsVerified { get; set; }

    public string KycStatus { get; set; } = string.Empty;

    public string? GstNumber { get; set; }

    public DateTime? LastReviewedAtUtc { get; set; }

    public string? RejectionReason { get; set; }
}

public class ComplianceAuditItemResponse
{
    public int Id { get; set; }

    public string EventType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? RejectionReason { get; set; }

    public string? DocumentType { get; set; }

    public string? DocumentUrl { get; set; }

    public string? ReviewedBy { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }

    public string? DisputeDetails { get; set; }

    public string? CustomerIdentifier { get; set; }

    public decimal? DisputedAmount { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}

public class ComplianceAuditTrailResponse
{
    public VendorKycStatusResponse KycStatus { get; set; } = new();

    public List<ComplianceAuditItemResponse> AuditLogs { get; set; } = new();

    public List<ComplianceAuditItemResponse> Disputes { get; set; } = new();
}

