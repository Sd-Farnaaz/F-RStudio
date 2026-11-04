namespace SalonBook.Api.Models;

public class SubscriptionTransaction
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public Salon? Salon { get; set; }

    public string PlanTier { get; set; } = string.Empty; // "Growth", "Pro"

    public string BillingCycle { get; set; } = "Monthly"; // "Monthly", "Annual"

    public string RazorpayOrderId { get; set; } = string.Empty;

    public string? RazorpayPaymentId { get; set; }

    public string? RazorpaySignature { get; set; }

    public decimal Amount { get; set; }

    public long AmountInPaise { get; set; }

    public string Currency { get; set; } = "INR";

    public string Status { get; set; } = "Pending"; // "Pending", "Paid", "Failed", "Cancelled"

    public string VerificationStatus { get; set; } = "Unverified"; // "Unverified", "Verified", "Failed"

    public string? PaymentMethod { get; set; }

    public string? FailureReason { get; set; }

    public DateTime? SubscriptionPeriodStartUtc { get; set; }

    public DateTime? SubscriptionPeriodEndUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? VerifiedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}
