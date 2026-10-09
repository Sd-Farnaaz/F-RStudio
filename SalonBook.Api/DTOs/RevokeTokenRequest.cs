using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class RevokeTokenRequest
{
    [Required(ErrorMessage = "RefreshToken is required.")]
    public string RefreshToken { get; set; } = string.Empty;
}
