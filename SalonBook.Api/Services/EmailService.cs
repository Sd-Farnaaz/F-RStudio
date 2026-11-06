using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using SalonBook.Api.Configurations;
using SalonBook.Api.Models;

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

    public Task<EmailSendResult> SendEmailAsync(string toEmail, string subject, string body, CancellationToken cancellationToken = default)
    {
        return SendEmailAsync(toEmail, subject, body, plainTextBody: null, cancellationToken);
    }

    public Task<EmailSendResult> SendEmailAsync(string toEmail, string subject, string htmlBody, string? plainTextBody, CancellationToken cancellationToken = default)
    {
        if (!_options.IsEnabled || string.IsNullOrWhiteSpace(_options.SmtpHost))
        {
            _logger.LogInformation("Email sending skipped for {ToEmail}: Global SMTP is not enabled or host is not configured.", toEmail);
            return Task.FromResult(new EmailSendResult(
                Success: false,
                ErrorMessage: "Email sending skipped: Global SMTP is unconfigured or disabled.",
                ErrorCode: "SMTP_DISABLED",
                Skipped: true
            ));
        }

        if (string.IsNullOrWhiteSpace(_options.SenderEmail))
        {
            _logger.LogWarning("Email sending skipped for {ToEmail}: Global sender email address is not configured.", toEmail);
            return Task.FromResult(new EmailSendResult(
                Success: false,
                ErrorMessage: "Email sending skipped: Global sender email address is not configured.",
                ErrorCode: "SMTP_SENDER_MISSING",
                Skipped: true
            ));
        }

        return SendCustomEmailAsync(
            host: _options.SmtpHost,
            port: _options.SmtpPort,
            username: _options.SmtpUsername,
            password: _options.SmtpPassword,
            senderEmail: _options.SenderEmail,
            senderName: string.IsNullOrWhiteSpace(_options.SenderName) ? "F&R Beauty Studio" : _options.SenderName,
            enableSsl: _options.EnableSsl,
            toEmail: toEmail,
            subject: subject,
            htmlBody: htmlBody,
            plainTextBody: plainTextBody,
            cancellationToken: cancellationToken
        );
    }

    public async Task<EmailSendResult> SendCustomEmailAsync(
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
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return new EmailSendResult(
                Success: false,
                ErrorMessage: "SMTP host is required.",
                ErrorCode: "SMTP_HOST_MISSING",
                Skipped: true
            );
        }

        if (string.IsNullOrWhiteSpace(senderEmail))
        {
            return new EmailSendResult(
                Success: false,
                ErrorMessage: "Sender email is required.",
                ErrorCode: "SMTP_SENDER_MISSING",
                Skipped: true
            );
        }

        try
        {
            var senderDisplayName = !string.IsNullOrWhiteSpace(senderName)
                ? senderName
                : "F&R Beauty Studio";

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail, senderDisplayName),
                Subject = subject
            };
            mailMessage.To.Add(toEmail);

            if (!string.IsNullOrWhiteSpace(plainTextBody))
            {
                var plainTextView = AlternateView.CreateAlternateViewFromString(plainTextBody, System.Text.Encoding.UTF8, "text/plain");
                var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, System.Text.Encoding.UTF8, "text/html");
                mailMessage.AlternateViews.Add(plainTextView);
                mailMessage.AlternateViews.Add(htmlView);
                mailMessage.Body = plainTextBody;
                mailMessage.IsBodyHtml = false;
            }
            else
            {
                mailMessage.Body = htmlBody;
                mailMessage.IsBodyHtml = true;
            }

            using var smtpClient = new SmtpClient(host, port)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                EnableSsl = enableSsl,
                Credentials = string.IsNullOrWhiteSpace(username)
                    ? CredentialCache.DefaultNetworkCredentials
                    : new NetworkCredential(username, password ?? string.Empty)
            };

            await smtpClient.SendMailAsync(mailMessage, cancellationToken);
            _logger.LogInformation("Successfully sent email via {Host}:{Port} to {ToEmail} with subject '{Subject}'.", host, port, toEmail, subject);
            return new EmailSendResult(Success: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via {Host}:{Port} to {ToEmail} with subject '{Subject}'. Error: {Message}", host, port, toEmail, subject, ex.Message);
            return new EmailSendResult(
                Success: false,
                ErrorMessage: ex.Message,
                ErrorCode: "SMTP_SEND_FAILURE",
                Skipped: false
            );
        }
    }

    public Task<EmailSendResult> SendSalonEmailAsync(
        Salon? salon,
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody = null,
        CancellationToken cancellationToken = default)
    {
        // 1. If the salon has explicitly enabled and configured custom SMTP credentials, use them!
        if (salon != null && 
            salon.IsEmailConfigured && 
            !string.IsNullOrWhiteSpace(salon.SmtpHost) && 
            !string.IsNullOrWhiteSpace(salon.SenderEmail))
        {
            _logger.LogInformation("Sending email for Salon '{SalonName}' using custom salon SMTP ({Host}:{Port}).", salon.Name, salon.SmtpHost, salon.SmtpPort);
            return SendCustomEmailAsync(
                host: salon.SmtpHost,
                port: salon.SmtpPort > 0 ? salon.SmtpPort : 587,
                username: salon.SmtpUsername,
                password: salon.SmtpPassword,
                senderEmail: salon.SenderEmail,
                senderName: string.IsNullOrWhiteSpace(salon.SenderName) ? salon.Name : salon.SenderName,
                enableSsl: salon.SmtpEnableSsl,
                toEmail: toEmail,
                subject: subject,
                htmlBody: htmlBody,
                plainTextBody: plainTextBody,
                cancellationToken: cancellationToken
            );
        }

        // 2. Otherwise fallback to system-wide SMTP settings
        return SendEmailAsync(toEmail, subject, htmlBody, plainTextBody, cancellationToken);
    }
}
