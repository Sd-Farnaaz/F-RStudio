using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class RegisterAdminRequest
{
    [Required(ErrorMessage = "Salon name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Salon name must be between 2 and 150 characters.")]
    public string SalonName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Business type is required.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Business type must be between 2 and 50 characters.")]
    public string BusinessType { get; set; } = string.Empty;

    [StringLength(100)]
    public string TimeZone { get; set; } = "Asia/Kolkata";

    [StringLength(3, MinimumLength = 3)]
    public string CurrencyCode { get; set; } = "INR";

    [Required(ErrorMessage = "Full name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 150 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
    public string Password { get; set; } = string.Empty;

    // Optional Salon & Owner Details
    [StringLength(250)]
    public string? AddressLine { get; set; }

    [StringLength(100)]
    public string? City { get; set; }

    [StringLength(100)]
    public string? State { get; set; }

    [StringLength(20)]
    public string? PostalCode { get; set; }

    [StringLength(100)]
    public string? Country { get; set; } = "India";

    /// <summary>
    /// Optional salon logo or owner/self photo passed as a base64 Data URL.
    /// </summary>
    public string? PhotoBase64 { get; set; }

    [StringLength(500)]
    public string? LogoUrl { get; set; }
}

