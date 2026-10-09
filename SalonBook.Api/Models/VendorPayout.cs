namespace SalonBook.Api.Models;

public class VendorPayout
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string EscrowTransactionId { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public decimal CommissionAmount { get; set; }

    public decimal NetAmount { get; set; }

    public string CurrencyCode { get; set; } = "INR";

    public string Status { get; set; } = "Pending"; // "Pending", "Processed", "Disbursed", "Failed"

    public string? UtrNumber { get; set; }

    public DateTime? BankReleaseAtUtc { get; set; }

    public DateTime? DisbursedAtUtc { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation property
    public Salon Salon { get; set; } = null!;
}

