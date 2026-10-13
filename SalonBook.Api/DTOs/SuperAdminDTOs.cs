using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class SuperAdminOverviewResponse
{
    public int TotalSalons { get; set; }
    public int ActiveSalons { get; set; }
    public int PendingVerificationSalons { get; set; }
    public int TotalUsers { get; set; }
    public int TotalCustomers { get; set; }
    public int TotalSalonAdmins { get; set; }
    public int TotalAppointments { get; set; }
    public decimal TotalGrossRevenue { get; set; }
    public string PlatformHealth { get; set; } = "Healthy";
    public List<SuperAdminRecentSalonItem> RecentSalons { get; set; } = new();
}

public class SuperAdminRecentSalonItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BusinessType { get; set; } = string.Empty;
    public string? City { get; set; }
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public string KycStatus { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

public class SuperAdminSalonResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string BusinessType { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? State { get; set; }
    public string? ContactEmail { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public bool IsVerified { get; set; }
    public string KycStatus { get; set; } = string.Empty;
    public string OnboardingState { get; set; } = string.Empty;
    public string? AdminEmail { get; set; }
    public string? AdminFullName { get; set; }
    public int TotalStaff { get; set; }
    public int TotalServices { get; set; }
    public int TotalAppointments { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class SuperAdminSalonDetailResponse : SuperAdminSalonResponse
{
    public string? Description { get; set; }
    public string? AddressLine { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string TimeZone { get; set; } = string.Empty;
    public string CurrencyCode { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class UpdateSalonStatusRequest
{
    [Required]
    public bool IsActive { get; set; }

    public string? Reason { get; set; }
}

public class UpdateSalonKycRequest
{
    [Required(ErrorMessage = "KycStatus is required.")]
    public string KycStatus { get; set; } = "Verified"; // "Verified", "Rejected", "Pending", "NotSubmitted"

    public bool IsVerified { get; set; } = true;

    public string? Notes { get; set; }
}

public class SuperAdminUserResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? SalonId { get; set; }
    public string? SalonName { get; set; }
    public bool IsActive { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }
}

public class UpdateUserStatusRequest
{
    [Required]
    public bool IsActive { get; set; }
}

