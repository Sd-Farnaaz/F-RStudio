using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class UpdateSalonProfileRequest
{
    [Required(ErrorMessage = "Salon name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Salon name must be between 2 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Business type is required.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Business type must be between 2 and 50 characters.")]
    public string BusinessType { get; set; } = string.Empty;

    [StringLength(250, ErrorMessage = "Address line cannot exceed 250 characters.")]
    public string? AddressLine { get; set; }

    [StringLength(100, ErrorMessage = "City cannot exceed 100 characters.")]
    public string? City { get; set; }

    [StringLength(100, ErrorMessage = "State cannot exceed 100 characters.")]
    public string? State { get; set; }

    [StringLength(20, ErrorMessage = "Postal code cannot exceed 20 characters.")]
    public string? PostalCode { get; set; }

    [StringLength(100, ErrorMessage = "Country cannot exceed 100 characters.")]
    public string? Country { get; set; }

    [StringLength(30, ErrorMessage = "Phone number cannot exceed 30 characters.")]
    public string? PhoneNumber { get; set; }

    [EmailAddress(ErrorMessage = "Invalid contact email address format.")]
    [StringLength(256, ErrorMessage = "Contact email cannot exceed 256 characters.")]
    public string? ContactEmail { get; set; }

    [StringLength(2000, ErrorMessage = "Opening hours JSON cannot exceed 2000 characters.")]
    public string? OpeningHoursJson { get; set; }

    [StringLength(100, ErrorMessage = "Timezone cannot exceed 100 characters.")]
    public string? TimeZone { get; set; }

    [StringLength(3, MinimumLength = 3, ErrorMessage = "Currency code must be exactly 3 characters.")]
    public string? CurrencyCode { get; set; }
}

public class SalonProfileResponse
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

    public string? Country { get; set; }

    public string? PhoneNumber { get; set; }

    public string? ContactEmail { get; set; }

    public string? OpeningHoursJson { get; set; }

    public string TimeZone { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;

    public string OnboardingState { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}

public class PublicSalonResponse
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

    public string? Country { get; set; }

    public string? PhoneNumber { get; set; }

    public string? ContactEmail { get; set; }

    public string? OpeningHoursJson { get; set; }

    public string TimeZone { get; set; } = string.Empty;

    public string CurrencyCode { get; set; } = string.Empty;
}

