using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class ForgotPasswordRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;
}

public class ForgotPasswordResponse
{
    public string Message { get; set; } = "If your email is registered in our system, you will receive password reset instructions.";

    /// <summary>
    /// Provided only in Development environment for local testing when email delivery service is not configured.
    /// In Production, this is always null.
    /// </summary>
    public string? DevResetToken { get; set; }
}

public class ResetPasswordRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Reset token is required.")]
    public string ResetToken { get; set; } = string.Empty;

    [Required(ErrorMessage = "New password is required.")]
    [StringLength(100, MinimumLength = 8, ErrorMessage = "New password must be at least 8 characters long.")]
    public string NewPassword { get; set; } = string.Empty;
}

