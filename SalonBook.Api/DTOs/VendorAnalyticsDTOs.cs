namespace SalonBook.Api.DTOs;

public class VendorRevenueAnalyticsResponse
{
    public string CurrencyCode { get; set; } = "INR";

    public decimal TotalRealizedRevenue { get; set; }

    public decimal TotalPendingPipeline { get; set; }

    public decimal AnnualTarget { get; set; }

    public decimal TargetProgressPercentage { get; set; }

    public List<MonthlyRevenueItem> MonthlyBreakdown { get; set; } = new();

    public List<TargetMilestoneItem> Milestones { get; set; } = new();
}

public class MonthlyRevenueItem
{
    public int Year { get; set; }

    public int Month { get; set; }

    public string MonthName { get; set; } = string.Empty;

    public decimal RealizedRevenue { get; set; }

    public decimal PendingPipeline { get; set; }

    public int TotalBookings { get; set; }

    public int CompletedBookings { get; set; }
}

public class TargetMilestoneItem
{
    public string MilestoneName { get; set; } = string.Empty;

    public decimal TargetAmount { get; set; }

    public decimal AchievedAmount { get; set; }

    public decimal Percentage { get; set; }

    public bool IsReached { get; set; }
}

