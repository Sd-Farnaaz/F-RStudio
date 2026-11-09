using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SalonBook.Api.Configurations;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public class EmailService : IEmailService
{
    private readonly EmailOptions _options;
    private readonly ILogger<EmailService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public EmailService(
        IOptions<EmailOptions> options, 
        ILogger<EmailService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _options = options.Value;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
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

        var senderDisplayName = !string.IsNullOrWhiteSpace(senderName)
            ? senderName
            : "F&R Beauty Studio";

        var trimmedPassword = password?.Trim();

        // 1. If password/API key starts with "xkeysib-", use Brevo's HTTPS REST API over Port 443
        if (!string.IsNullOrWhiteSpace(trimmedPassword) && trimmedPassword.StartsWith("xkeysib-", StringComparison.OrdinalIgnoreCase))
        {
            return await SendBrevoHttpApiAsync(
                apiKey: trimmedPassword,
                senderEmail: senderEmail,
                senderName: senderDisplayName,
                toEmail: toEmail,
                subject: subject,
                htmlBody: htmlBody,
                plainTextBody: plainTextBody,
                cancellationToken: cancellationToken
            );
        }

        // 2. Intelligent Brevo routing:
        // If password is a Brevo SMTP key (starts with "xsmtpsib-") OR if host was set to api.brevo.com,
        // automatically route to Brevo SMTP relay on port 587 so the connection succeeds.
        var effectiveHost = host;
        var effectivePort = port;
        if (!string.IsNullOrWhiteSpace(trimmedPassword) && trimmedPassword.StartsWith("xsmtpsib-", StringComparison.OrdinalIgnoreCase))
        {
            effectiveHost = "smtp-relay.brevo.com";
            effectivePort = 587;
        }
        else if (!string.IsNullOrWhiteSpace(effectiveHost) && effectiveHost.Contains("api.brevo.com", StringComparison.OrdinalIgnoreCase))
        {
            effectiveHost = "smtp-relay.brevo.com";
            effectivePort = 587;
        }

        try
        {
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

            using var smtpClient = new SmtpClient(effectiveHost, effectivePort)
            {
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                EnableSsl = enableSsl,
                Timeout = 20000,
                Credentials = string.IsNullOrWhiteSpace(username)
                    ? CredentialCache.DefaultNetworkCredentials
                    : new NetworkCredential(username, password ?? string.Empty)
            };

            await smtpClient.SendMailAsync(mailMessage, cancellationToken);
            _logger.LogInformation("Successfully sent email via {Host}:{Port} to {ToEmail} with subject '{Subject}'.", effectiveHost, effectivePort, toEmail, subject);
            return new EmailSendResult(Success: true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via {Host}:{Port} to {ToEmail} with subject '{Subject}'. Error: {Message}", effectiveHost, effectivePort, toEmail, subject, ex.Message);
            var detailedMsg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;

            if (detailedMsg.Contains("timed out", StringComparison.OrdinalIgnoreCase) || detailedMsg.Contains("unreachable", StringComparison.OrdinalIgnoreCase))
            {
                detailedMsg = "SMTP port 587/465 is blocked by Railway's firewall on Hobby/Free plans. Please generate a Brevo REST API Key (starts with xkeysib-) in Brevo > SMTP & API > API Keys, and paste it into the password field to send via Port 443 (HTTPS), which is never blocked.";
            }

            return new EmailSendResult(
                Success: false,
                ErrorMessage: detailedMsg,
                ErrorCode: "SMTP_SEND_FAILURE",
                Skipped: false
            );
        }
    }

    private async Task<EmailSendResult> SendBrevoHttpApiAsync(
        string apiKey,
        string senderEmail,
        string senderName,
        string toEmail,
        string subject,
        string htmlBody,
        string? plainTextBody,
        CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(20);

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
            request.Headers.Add("api-key", apiKey.Trim());
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var payload = new
            {
                sender = new { name = senderName, email = senderEmail },
                to = new[] { new { email = toEmail } },
                subject = subject,
                htmlContent = htmlBody,
                textContent = string.IsNullOrWhiteSpace(plainTextBody) ? null : plainTextBody
            };

            var jsonContent = JsonSerializer.Serialize(payload);
            request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await httpClient.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully sent email via Brevo HTTPS REST API (Port 443) to {ToEmail} with subject '{Subject}'.", toEmail, subject);
                return new EmailSendResult(Success: true);
            }

            _logger.LogWarning("Brevo REST API error ({StatusCode}): {Body}", response.StatusCode, responseBody);

            var userFriendlyMsg = responseBody;
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                if (doc.RootElement.TryGetProperty("message", out var msgProp))
                {
                    userFriendlyMsg = msgProp.GetString() ?? responseBody;
                }
            }
            catch {}

            return new EmailSendResult(
                Success: false,
                ErrorMessage: $"Brevo API error ({response.StatusCode}): {userFriendlyMsg}",
                ErrorCode: "BREVO_API_ERROR"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email via Brevo REST API to {ToEmail}.", toEmail);
            return new EmailSendResult(
                Success: false,
                ErrorMessage: $"Brevo API request failed: {ex.Message}",
                ErrorCode: "BREVO_API_EXCEPTION"
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
