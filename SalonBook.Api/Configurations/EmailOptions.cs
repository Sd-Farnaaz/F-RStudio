namespace SalonBook.Api.Configurations;

public class EmailOptions
{
    public const string SectionName = "Email";

    public bool IsEnabled { get; set; } = false;
    public string SmtpHost { get; set; } = "smtp-relay.brevo.com";
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderName { get; set; } = "F&R Beauty Studio";
    public bool EnableSsl { get; set; } = true;

    // Brand and Template Configuration
    public string? LogoUrl { get; set; } = "https://drive.google.com/thumbnail?id=16DzxD4lir8jaDDqvYVNTdTwC7LgUyU13&sz=w500";
    public string? SupportEmail { get; set; } = "rufnixstudio@gmail.com";
    public string? WebAppBaseUrl { get; set; }
}
