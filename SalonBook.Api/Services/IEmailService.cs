using SalonBook.Api.Models;

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
    Task<EmailSendResult> SendEmailAsync(string toEmail, string subject, string htmlBody, string? plainTextBody, CancellationToken cancellationToken = default);

    Task<EmailSendResult> SendCustomEmailAsync(
        string host,
        int port,
        string? username,
        string? password,
        string senderEmail,
        string? senderName,
        bool enableSsl,
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default);

    Task<EmailSendResult> SendSalonEmailAsync(
        Salon? salon,
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default);
}
