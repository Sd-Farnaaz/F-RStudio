namespace SalonBook.Api.Models;

public class Salon
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string BusinessType { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? AddressLine { get; set; }

    public string? City { get; set; }

    public string? State { get; set; }

    public string? PostalCode { get; set; }

    public string? Country { get; set; } = "India";

    public string? PhoneNumber { get; set; }

    public string? ContactEmail { get; set; }

    /// <summary>
    /// Serialized opening hours specification for days of week.
    /// </summary>
    public string? OpeningHoursJson { get; set; }

    public string TimeZone { get; set; } = "Asia/Kolkata";

    public string CurrencyCode { get; set; } = "INR";

    public string OnboardingState { get; set; } = "Created";

    public bool IsActive { get; set; } = true;

    public bool IsVerified { get; set; } = false;

    public string KycStatus { get; set; } = "NotSubmitted"; // "NotSubmitted", "Pending", "Verified", "Rejected"

    public string? GstNumber { get; set; }

    public decimal AnnualRevenueTarget { get; set; } = 1200000.00m;

    // Direct UPI and Advance Payment Settings
    public string? UpiId { get; set; }

    public string? QrCodeImageUrl { get; set; }

    public bool IsAdvancePaymentRequired { get; set; } = false;

    public string? AdvancePaymentType { get; set; } // "Fixed", "Percentage"

    public decimal? AdvancePaymentValue { get; set; }

    // Salon Custom Email SMTP Configuration (Automations & Retention)
    public bool IsEmailConfigured { get; set; } = false;

    public string? SmtpHost { get; set; }

    public int SmtpPort { get; set; } = 587;

    public string? SmtpUsername { get; set; } // Email Key / Username

    public string? SmtpPassword { get; set; } // Email Secret / Password

    public string? SenderEmail { get; set; }

    public string? SenderName { get; set; }

    public bool SmtpEnableSsl { get; set; } = true;

    // Salon Branding & Media
    public string? LogoUrl { get; set; }

    // Salon SaaS Subscription & Platform Billing
    public string SubscriptionTier { get; set; } = "Starter"; // "Starter", "Growth", "LuxuryPro"

    public string SubscriptionBillingCycle { get; set; } = "Monthly"; // "Monthly", "Annual"

    public string SubscriptionStatus { get; set; } = "Active"; // "Active", "Trial", "PastDue", "Cancelled"

    public DateTime? SubscriptionStartedAtUtc { get; set; }

    public DateTime? SubscriptionRenewsAtUtc { get; set; }

    public decimal SubscriptionPrice { get; set; } = 0.00m;

    public bool IsSuspendedByAdmin { get; set; } = false;

    public string? DeactivationReason { get; set; } // "SuperAdminSuspension", "SubscriptionExpired", "TrialExpired"

    public DateTime? TrialEndsAtUtc { get; set; }

    public bool HasUsedTrial { get; set; } = false;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAtUtc { get; set; }

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();

    public ICollection<Service> Services { get; set; } = new List<Service>();

    public ICollection<VendorPayout> Payouts { get; set; } = new List<VendorPayout>();

    public ICollection<VendorComplianceLog> ComplianceLogs { get; set; } = new List<VendorComplianceLog>();

    public ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();

    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public ICollection<Review> Reviews { get; set; } = new List<Review>();

    public ICollection<SalonOffPeakRule> OffPeakRules { get; set; } = new List<SalonOffPeakRule>();

    public ICollection<SubscriptionTransaction> SubscriptionTransactions { get; set; } = new List<SubscriptionTransaction>();
}
