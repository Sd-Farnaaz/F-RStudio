using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class SalonSmtpConfigResponse
{
    public bool IsConfigured { get; set; }

    public string SmtpHost { get; set; } = string.Empty;

    public int SmtpPort { get; set; } = 587;

    public string SmtpUsername { get; set; } = string.Empty;

    public bool HasPassword { get; set; }

    public string SenderEmail { get; set; } = string.Empty;

    public string SenderName { get; set; } = string.Empty;

    public bool SmtpEnableSsl { get; set; } = true;

    public string CurrentTier { get; set; } = string.Empty;

    public bool IsAutomationAllowed { get; set; }
}

public class UpdateSalonSmtpConfigRequest
{
    [MaxLength(255)]
    public string? SmtpHost { get; set; }

    [Range(1, 65535)]
    public int SmtpPort { get; set; } = 587;

    [MaxLength(255)]
    public string? SmtpUsername { get; set; }

    [MaxLength(500)]
    public string? SmtpPassword { get; set; }

    [EmailAddress]
    [MaxLength(255)]
    public string? SenderEmail { get; set; }

    [MaxLength(255)]
    public string? SenderName { get; set; }

    public bool SmtpEnableSsl { get; set; } = true;

    public bool IsConfigured { get; set; } = true;
}

public class TestEmailSmtpRequest
{
    [Required]
    [EmailAddress]
    public string RecipientEmail { get; set; } = string.Empty;

    public string? SmtpHost { get; set; }

    public int? SmtpPort { get; set; }

    public string? SmtpUsername { get; set; }

    public string? SmtpPassword { get; set; }

    public string? SenderEmail { get; set; }

    public string? SenderName { get; set; }

    public bool? SmtpEnableSsl { get; set; }
}

public class TestEmailSmtpResponse
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public string? ErrorCode { get; set; }
}
