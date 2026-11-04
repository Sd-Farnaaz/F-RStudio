namespace SalonBook.Api.Configurations;

public class RazorpayOptions
{
    public const string SectionName = "Razorpay";

    public string KeyId { get; set; } = string.Empty;

    public string KeySecret { get; set; } = string.Empty;

    public string WebhookSecret { get; set; } = string.Empty;

    public bool IsSecretConfigured => !string.IsNullOrWhiteSpace(KeySecret);

    public bool IsWebhookConfigured => !string.IsNullOrWhiteSpace(WebhookSecret);
}
