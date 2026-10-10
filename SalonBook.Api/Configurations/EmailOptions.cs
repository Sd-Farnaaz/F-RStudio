namespace SalonBook.Api.Configurations;

public class EmailOptions
{
    public const string SectionName = "Email";

    public bool IsEnabled { get; set; } = false;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUsername { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public string SenderEmail { get; set; } = "noreply@salonbook.local";
    public string SenderName { get; set; } = "SalonBook Notifications";
    public bool EnableSsl { get; set; } = true;
}

