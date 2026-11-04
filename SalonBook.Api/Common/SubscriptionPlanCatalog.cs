using SalonBook.Api.DTOs;

namespace SalonBook.Api.Common;

public static class SubscriptionPlanCatalog
{
    public const string Starter = "Starter";
    public const string Growth = "Growth";
    public const string Pro = "Pro";
    public const string LuxuryPro = "LuxuryPro"; // Legacy alias for Pro

    public static readonly SubscriptionPlanInfo StarterPlan = new()
    {
        Tier = Starter,
        Name = "Starter Trial",
        Tagline = "Complimentary 30-day trial for new luxury studios & independent artists.",
        MonthlyPrice = 0.00m,
        AnnualPrice = 0.00m,
        MaxStaff = 5,
        MaxServices = 5,
        CommissionPercent = 5.0m,
        IsPopular = false,
        Features = new List<string>
        {
            "30-Day Free Trial",
            "Up to 5 Specialist Profiles",
            "Up to 5 Salon Catalog Services",
            "Standard Calendar & Appointments",
            "Direct UPI & QR Code Payments",
            "Basic Client Dossier Ledger",
            "5% Platform Settlement Fee"
        }
    };

    public static readonly SubscriptionPlanInfo GrowthPlan = new()
    {
        Tier = Growth,
        Name = "Growth Studio",
        Tagline = "Ideal for expanding boutique studios seeking online payments and client retention.",
        MonthlyPrice = 1499.00m,
        AnnualPrice = 14990.00m, // 10 months prepaid, 2 months free
        MaxStaff = 20,
        MaxServices = 15,
        CommissionPercent = 2.5m,
        IsPopular = true,
        Features = new List<string>
        {
            "Up to 20 Specialist Profiles",
            "Up to 15 Salon Catalog Services",
            "Instant Razorpay Online Payments (UPI, Cards, NetBanking)",
            "Automated Advance Deposits & No-Show Shield",
            "Automated Client Care Cadence & Review Invites",
            "Digital GST Tax Invoicing & Downloadable Receipts",
            "Automated 24h & 2h Appointment Reminders",
            "Reduced 2.5% Platform Settlement Fee"
        }
    };

    public static readonly SubscriptionPlanInfo ProPlan = new()
    {
        Tier = Pro,
        Name = "Pro",
        Tagline = "The complete flagship suite for premium studios, luxury spas & beauty salons.",
        MonthlyPrice = 2999.00m,
        AnnualPrice = 29990.00m, // 10 months prepaid, 2 months free
        MaxStaff = 50,
        MaxServices = null, // Unlimited
        CommissionPercent = 0.0m,
        IsPopular = false,
        Features = new List<string>
        {
            "Up to 50 Specialist Profiles",
            "Unlimited Salon Catalog Services",
            "0% Platform Commission — Retain 100% of Revenue",
            "Priority Instant Escrow Payouts & Settlement",
            "AI Stylist Matching & Client Consultation Vault",
            "Custom Branded Receipts & Digital Signage",
            "Multi-Location Ready & Advanced Analytics",
            "Dedicated 24/7 Concierge Support"
        }
    };

    public static readonly IReadOnlyList<SubscriptionPlanInfo> AllPlans = new[]
    {
        StarterPlan,
        GrowthPlan,
        ProPlan
    };

    public static SubscriptionPlanInfo? GetPlanByTier(string? tier)
    {
        if (string.IsNullOrWhiteSpace(tier)) return StarterPlan;

        var normalized = tier.Trim();

        if (normalized.Equals(Starter, StringComparison.OrdinalIgnoreCase))
            return StarterPlan;

        if (normalized.Equals(Growth, StringComparison.OrdinalIgnoreCase))
            return GrowthPlan;

        if (normalized.Equals(Pro, StringComparison.OrdinalIgnoreCase) || 
            normalized.Equals(LuxuryPro, StringComparison.OrdinalIgnoreCase))
            return ProPlan;

        return null;
    }

    public static (decimal price, long amountInPaise) GetPriceDetails(string tier, string billingCycle)
    {
        var plan = GetPlanByTier(tier) ?? throw new ArgumentException($"Invalid subscription tier '{tier}'.");

        var isAnnual = billingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase);
        var price = isAnnual ? plan.AnnualPrice : plan.MonthlyPrice;
        var paise = (long)Math.Round(price * 100m, MidpointRounding.AwayFromZero);

        return (price, paise);
    }
}
