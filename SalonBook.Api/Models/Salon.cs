namespace SalonBook.Api.Models;

public class Salon
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string BusinessType { get; set; } = string.Empty;

    public string TimeZone { get; set; } = "Asia/Kolkata";

    public string CurrencyCode { get; set; } = "INR";

    public string OnboardingState { get; set; } = "Created";

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Navigation property
    public ICollection<User> Users { get; set; } = new List<User>();
}

