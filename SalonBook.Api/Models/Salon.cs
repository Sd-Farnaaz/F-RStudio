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

    // Salon Branding & Media
    public string? LogoUrl { get; set; }

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
}
