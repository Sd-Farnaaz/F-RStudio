using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class RefreshTokenRequest
{
    [Required(ErrorMessage = "RefreshToken is required.")]
    public string RefreshToken { get; set; } = string.Empty;
}

