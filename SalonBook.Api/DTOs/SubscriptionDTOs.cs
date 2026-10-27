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
    public string Status { get; set; } = "Active";
    public decimal CurrentPrice { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? RenewsAtUtc { get; set; }
    
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

public class UpgradeSubscriptionRequest
{
    public string Tier { get; set; } = string.Empty; // "Growth", "LuxuryPro", "Starter"
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
}

public class SuperAdminSubscriptionOverviewResponse
{
    public int TotalSalons { get; set; }
    public int StarterCount { get; set; }
    public int GrowthCount { get; set; }
    public int LuxuryProCount { get; set; }
    public decimal MonthlyRecurringRevenue { get; set; }
    public decimal AnnualRunRate { get; set; }
    public List<SalonSubscriptionSummaryItem> Salons { get; set; } = new();
}
