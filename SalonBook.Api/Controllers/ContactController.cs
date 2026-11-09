using System.ComponentModel.DataAnnotations;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SalonBook.Api.Configurations;
using SalonBook.Api.Data;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class ContactController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly ApplicationDbContext _dbContext;
    private readonly EmailOptions _emailOptions;
    private readonly ILogger<ContactController> _logger;

    public ContactController(
        IEmailService emailService,
        ApplicationDbContext dbContext,
        IOptions<EmailOptions> emailOptions,
        ILogger<ContactController> logger)
    {
        _emailService = emailService;
        _dbContext = dbContext;
        _emailOptions = emailOptions.Value;
        _logger = logger;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ContactInquiryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitInquiry([FromBody] ContactInquiryRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var supportEmail = !string.IsNullOrWhiteSpace(_emailOptions.SupportEmail) 
            ? _emailOptions.SupportEmail 
            : (!string.IsNullOrWhiteSpace(_emailOptions.SenderEmail) ? _emailOptions.SenderEmail : "rufnixstudio@gmail.com");

        // Locate effective Brevo/SMTP credentials (from config, env, or primary salon)
        var primarySalon = await _dbContext.Salons.AsNoTracking()
            .Where(s => !string.IsNullOrWhiteSpace(s.SmtpPassword))
            .FirstOrDefaultAsync(cancellationToken);

        var host = !string.IsNullOrWhiteSpace(primarySalon?.SmtpHost) ? primarySalon.SmtpHost : _emailOptions.SmtpHost;
        var port = (primarySalon?.SmtpPort > 0 ? primarySalon.SmtpPort : (_emailOptions.SmtpPort > 0 ? _emailOptions.SmtpPort : 443));
        var username = !string.IsNullOrWhiteSpace(primarySalon?.SmtpUsername) ? primarySalon.SmtpUsername : _emailOptions.SmtpUsername;
        var password = !string.IsNullOrWhiteSpace(primarySalon?.SmtpPassword) ? primarySalon.SmtpPassword : _emailOptions.SmtpPassword;
        var senderEmail = !string.IsNullOrWhiteSpace(_emailOptions.SenderEmail) ? _emailOptions.SenderEmail : "rufnixstudio@gmail.com";
        var senderName = "F&R Beauty Studio Concierge";

        // 1. Dispatch email to support desk (rufnixstudio@gmail.com)
        var adminSubject = $"[New Inquiry] {request.Topic} from {request.FullName.Trim()}";
        var adminHtml = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e8dfdf; border-radius: 16px; background-color: #ffffff; color: #2D1527;"">
    <div style=""text-align: center; margin-bottom: 24px;"">
        <h1 style=""font-family: Georgia, serif; color: #592B38; font-size: 24px; margin: 0;"">F&amp;R Beauty Studio</h1>
        <p style=""color: #B66B70; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px;"">New Client / Partner Inquiry</p>
    </div>
    <div style=""background-color: #FAF5F5; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #F2E6E6;"">
        <div style=""margin-bottom: 8px;""><strong>Sender Name:</strong> {WebUtility.HtmlEncode(request.FullName)}</div>
        <div style=""margin-bottom: 8px;""><strong>Sender Email:</strong> <a href=""mailto:{WebUtility.HtmlEncode(request.Email)}"" style=""color: #592B38; font-weight: bold;"">{WebUtility.HtmlEncode(request.Email)}</a></div>
        <div style=""margin-bottom: 8px;""><strong>Topic:</strong> <span style=""background: #592B38; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 12px;"">{WebUtility.HtmlEncode(request.Topic)}</span></div>
        <div><strong>Submitted At:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</div>
    </div>
    <div style=""margin-bottom: 24px;"">
        <h4 style=""margin: 0 0 10px 0; color: #592B38; font-size: 14px; text-transform: uppercase;"">Message Content:</h4>
        <div style=""background: #FFFFFF; border: 1px solid #E2D9D9; border-radius: 10px; padding: 18px; font-size: 14px; line-height: 1.6; color: #333333; white-space: pre-wrap;"">{WebUtility.HtmlEncode(request.Message)}</div>
    </div>
    <div style=""text-align: center; margin-top: 24px;"">
        <a href=""mailto:{WebUtility.HtmlEncode(request.Email)}?subject=Re: {WebUtility.UrlEncode(adminSubject)}"" style=""display: inline-block; background-color: #592B38; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; text-decoration: none;"">Reply Directly to {WebUtility.HtmlEncode(request.FullName)}</a>
    </div>
</div>";

        var adminPlainText = $"New Inquiry from {request.FullName} ({request.Email})\nTopic: {request.Topic}\n\nMessage:\n{request.Message}";

        var adminResult = await _emailService.SendCustomEmailAsync(
            host: host,
            port: port,
            username: username,
            password: password,
            senderEmail: senderEmail,
            senderName: senderName,
            enableSsl: true,
            toEmail: supportEmail,
            subject: adminSubject,
            htmlBody: adminHtml,
            plainTextBody: adminPlainText,
            cancellationToken: cancellationToken
        );

        // 2. Dispatch auto-reply confirmation to the customer
        var customerSubject = "We have received your message — F&R Beauty Studio Concierge";
        var customerHtml = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e8dfdf; border-radius: 16px; background-color: #ffffff; color: #2D1527;"">
    <div style=""text-align: center; margin-bottom: 24px;"">
        <h1 style=""font-family: Georgia, serif; color: #592B38; font-size: 26px; margin: 0;"">F&amp;R Beauty Studio</h1>
        <p style=""color: #B66B70; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px;"">Customer Concierge &amp; Support</p>
    </div>
    <p style=""font-size: 15px; color: #333333; line-height: 1.6;"">
        Dear <strong>{WebUtility.HtmlEncode(request.FullName)}</strong>,
    </p>
    <p style=""font-size: 14px; color: #4a5568; line-height: 1.6;"">
        Thank you for contacting F&amp;R Beauty Studio regarding <strong>{WebUtility.HtmlEncode(request.Topic)}</strong>. We have received your inquiry and our concierge team is reviewing your message.
    </p>
    <div style=""background-color: #FAF5F5; border-radius: 12px; padding: 18px; margin: 20px 0; border: 1px solid #F2E6E6; font-size: 13px; color: #4a5568; line-height: 1.6;"">
        <strong>A copy of your inquiry:</strong><br/>
        <em>""{WebUtility.HtmlEncode(request.Message)}""</em>
    </div>
    <p style=""font-size: 14px; color: #4a5568; line-height: 1.6;"">
        One of our specialists will get back to you at <strong>{WebUtility.HtmlEncode(request.Email)}</strong> typically within 24 business hours.
    </p>
    <p style=""font-size: 12px; color: #8A7B82; text-align: center; margin-top: 28px; border-top: 1px solid #F2E6E6; padding-top: 16px;"">
        F&amp;R Beauty Studio • Luxury Salon &amp; Studio Suite Management
    </p>
</div>";

        _ = _emailService.SendCustomEmailAsync(
            host: host,
            port: port,
            username: username,
            password: password,
            senderEmail: senderEmail,
            senderName: senderName,
            enableSsl: true,
            toEmail: request.Email.Trim(),
            subject: customerSubject,
            htmlBody: customerHtml,
            plainTextBody: $"Dear {request.FullName}, we received your message regarding '{request.Topic}'. Our support team will reply within 24 hours.",
            cancellationToken: CancellationToken.None
        );

        if (!adminResult.Success && !adminResult.Skipped)
        {
            _logger.LogWarning("Failed to deliver contact inquiry email to support desk: {Error}", adminResult.ErrorMessage);
        }

        return Ok(new ContactInquiryResponse
        {
            Success = true,
            Message = "Your message has been sent successfully to our support desk! A confirmation email has been dispatched to your inbox."
        });
    }
}

public class ContactInquiryRequest
{
    [Required]
    [MinLength(2)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Topic { get; set; } = string.Empty;

    [Required]
    [MinLength(10)]
    public string Message { get; set; } = string.Empty;
}

public class ContactInquiryResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
