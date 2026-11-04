using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class SubscriptionPlanInfo
{
    public string Tier { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public decimal AnnualPrice { get; set; }
    public int? MaxStaff { get; set; }
    public int? MaxServices { get; set; }
    public decimal CommissionPercent { get; set; }
    public List<string> Features { get; set; } = new();
    public bool IsPopular { get; set; }
}

public class SalonSubscriptionResponse
{
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string CurrentTier { get; set; } = "Starter";
    public string BillingCycle { get; set; } = "Monthly";
    public string Status { get; set; } = "Active"; // "Active", "Trial", "Expired", "Cancelled"
    public decimal CurrentPrice { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? RenewsAtUtc { get; set; }
    public DateTime? TrialEndsAtUtc { get; set; }
    public int? RemainingTrialDays { get; set; }
    public bool IsTrialActive { get; set; }
    public bool IsSubscriptionExpired { get; set; }
    public string? DeactivationReason { get; set; }
    public bool IsSuspendedByAdmin { get; set; }
    public bool IsActive { get; set; }
    
    // Usage vs Quota
    public int StaffCount { get; set; }
    public int? StaffLimit { get; set; }
    public int ServicesCount { get; set; }
    public int? ServicesLimit { get; set; }
    public bool CanAddStaff { get; set; }
    public bool CanAddService { get; set; }

    // Feature Flags Entitlements
    public bool HasAdvanceDepositEngine { get; set; }
    public bool HasVerifiedReviewsAccess { get; set; }
    public bool HasZeroCommission { get; set; }
    public bool HasCustomBranding { get; set; }
    public bool HasPrioritySupport { get; set; }

    public List<SubscriptionPlanInfo> AvailablePlans { get; set; } = new();
}

public class CreateSubscriptionOrderRequest
{
    [Required(ErrorMessage = "Plan tier is required.")]
    public string Tier { get; set; } = string.Empty; // "Growth", "Pro"

    public string BillingCycle { get; set; } = "Monthly"; // "Monthly", "Annual"
}

public class SubscriptionOrderResponse
{
    public string OrderId { get; set; } = string.Empty;
    public string KeyId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public long AmountInPaise { get; set; }
    public string Currency { get; set; } = "INR";
    public string PlanTier { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string SalonName { get; set; } = string.Empty;
    public string SalonEmail { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = "Monthly";
    public string Description { get; set; } = string.Empty;
    public bool IsTestMode { get; set; } = true;
}

public class VerifySubscriptionPaymentRequest
{
    [Required(ErrorMessage = "Razorpay Order ID is required.")]
    public string RazorpayOrderId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Razorpay Payment ID is required.")]
    public string RazorpayPaymentId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Razorpay Signature is required.")]
    public string RazorpaySignature { get; set; } = string.Empty;

    public string? PaymentMethod { get; set; } = "Razorpay";
}

public class SubscriptionPaymentVerificationResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int SalonId { get; set; }
    public string Tier { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public DateTime? RenewsAtUtc { get; set; }
    public string TransactionReference { get; set; } = string.Empty;
}

public class SubscriptionTransactionItemResponse
{
    public int Id { get; set; }
    public string PlanTier { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = "Monthly";
    public string RazorpayOrderId { get; set; } = string.Empty;
    public string? RazorpayPaymentId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string Status { get; set; } = "Pending";
    public string VerificationStatus { get; set; } = "Unverified";
    public string? PaymentMethod { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }
}

public class UpgradeSubscriptionRequest
{
    public string Tier { get; set; } = string.Empty; // "Growth", "Pro", "Starter"
    public string BillingCycle { get; set; } = "Monthly"; // "Monthly", "Annual"
    public string? PaymentMethod { get; set; } = "UPI";
}

public class UpgradeSubscriptionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int SalonId { get; set; }
    public string Tier { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public DateTime? RenewsAtUtc { get; set; }
    public string TransactionReference { get; set; } = string.Empty;
}

public class SalonSubscriptionSummaryItem
{
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string Tier { get; set; } = "Starter";
    public string BillingCycle { get; set; } = "Monthly";
    public string Status { get; set; } = "Active";
    public decimal Price { get; set; }
    public DateTime? RenewsAtUtc { get; set; }
    public int StaffCount { get; set; }
    public int ServicesCount { get; set; }
    public string? DeactivationReason { get; set; }
    public bool IsActive { get; set; }
}

public class SuperAdminSubscriptionOverviewResponse
{
    public int TotalSalons { get; set; }
    public int StarterCount { get; set; }
    public int GrowthCount { get; set; }
    public int ProCount { get; set; }
    public decimal MonthlyRecurringRevenue { get; set; }
    public decimal AnnualRunRate { get; set; }
    public List<SalonSubscriptionSummaryItem> Salons { get; set; } = new();
}
