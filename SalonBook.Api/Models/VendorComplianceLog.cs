namespace SalonBook.Api.Models;

public class VendorComplianceLog
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    /// <summary>
    /// Type of event: "KYC_Verification", "KYC_Rejection", "Dispute_Raised", "Dispute_Resolved", "Audit_Check"
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>
    /// Associated status: "Pending", "Approved", "Rejected", "UnderReview", "Resolved"
    /// </summary>
    public string Status { get; set; } = string.Empty;

    public string? RejectionReason { get; set; }

    public string? DocumentType { get; set; }

    public string? DocumentUrl { get; set; }

    public string? ReviewedBy { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }

    public string? DisputeDetails { get; set; }

    public string? CustomerIdentifier { get; set; }

    public decimal? DisputedAmount { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Salon Salon { get; set; } = null!;
}

