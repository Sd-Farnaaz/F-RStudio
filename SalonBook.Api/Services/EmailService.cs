using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using SalonBook.Api.Configurations;

namespace SalonBook.Api.Services;

public class EmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IOptions<EmailOptions> options, ILogger<EmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<EmailSendResult> SendEmailAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default)
    {
        if (!_options.IsEnabled || string.IsNullOrWhiteSpace(_options.SmtpHost))
        {
            _logger.LogInformation("Email sending skipped for {ToEmail}: SMTP is not enabled or host is not configured.", toEmail);
            return new EmailSendResult(
                Success: false,
                ErrorMessage: "Email sending skipped: SMTP is unconfigured or disabled.",
                ErrorCode: "SMTP_DISABLED",
                Skipped: true
            );
        }

        try
        {
            using var mailMessage = new MailMessage
            {
                From = new MailAddress(_options.SenderEmail, _options.SenderName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            mailMessage.To.Add(toEmail);

            using var smtpClient = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
            {
                EnableSsl = _options.EnableSsl,
                Credentials = string.IsNullOrWhiteSpace(_options.SmtpUsername)
                    ? CredentialCache.DefaultNetworkCredentials
                    : new NetworkCredential(_options.SmtpUsername, _options.SmtpPassword)
            };

            await smtpClient.SendMailAsync(mailMessage, cancellationToken);
            _logger.LogInformation("Successfully sent email to {ToEmail} with subject '{Subject}'.", toEmail, subject);
            return new EmailSendResult(Success: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail} with subject '{Subject}'.", toEmail, subject);
            return new EmailSendResult(
                Success: false,
                ErrorMessage: ex.Message,
                ErrorCode: "SMTP_SEND_FAILURE",
                Skipped: false
            );
        }
    }
}

