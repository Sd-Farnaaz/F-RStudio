namespace SalonBook.Api.Services;

public record EmailSendResult(
    bool Success,
    string? ErrorMessage = null,
    string? ErrorCode = null,
    bool Skipped = false
);

public interface IEmailService
{
    Task<EmailSendResult> SendEmailAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default);
}

