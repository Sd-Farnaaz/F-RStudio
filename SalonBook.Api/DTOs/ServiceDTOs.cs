using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CreateServiceRequest
{
    [Required(ErrorMessage = "Service name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Service name must be between 2 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Category must be between 2 and 50 characters.")]
    public string Category { get; set; } = string.Empty;

    [Range(0, 1000000, ErrorMessage = "Price must be a non-negative value.")]
    public decimal Price { get; set; }

    [Range(5, 480, ErrorMessage = "Duration must be between 5 and 480 minutes.")]
    public int DurationMinutes { get; set; } = 30;

    public bool IsActive { get; set; } = true;
}

public class UpdateServiceRequest
{
    [Required(ErrorMessage = "Service name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Service name must be between 2 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Category is required.")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "Category must be between 2 and 50 characters.")]
    public string Category { get; set; } = string.Empty;

    [Range(0, 1000000, ErrorMessage = "Price must be a non-negative value.")]
    public decimal Price { get; set; }

    [Range(5, 480, ErrorMessage = "Duration must be between 5 and 480 minutes.")]
    public int DurationMinutes { get; set; } = 30;

    public bool IsActive { get; set; } = true;
}

public class UpdateServiceStatusRequest
{
    public bool IsActive { get; set; }
}

public class ServiceResponse
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Category { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public int DurationMinutes { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}

public class PublicServiceResponse
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Category { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public int DurationMinutes { get; set; }

    public string? ImageUrl { get; set; }
}

