using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/automation")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminAutomationController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AdminAutomationController> _logger;

    public AdminAutomationController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IEmailService emailService,
        ILogger<AdminAutomationController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _emailService = emailService;
        _logger = logger;
    }

    private async Task<(bool Allowed, IActionResult? Result, Salon? Salon)> CheckAutomationAccessAsync(CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return (false, Forbid(), null);

        var salon = await _dbContext.Salons.FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
        if (salon == null) return (false, NotFound(new { message = "Salon not found." }), null);

        var tier = salon.SubscriptionTier ?? SubscriptionPlanCatalog.Starter;
        var isAllowed = tier.Equals(SubscriptionPlanCatalog.Growth, StringComparison.OrdinalIgnoreCase) ||
                        tier.Equals(SubscriptionPlanCatalog.Pro, StringComparison.OrdinalIgnoreCase) ||
                        tier.Equals(SubscriptionPlanCatalog.LuxuryPro, StringComparison.OrdinalIgnoreCase);

        if (!isAllowed)
        {
            return (false, StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Automations & Client Retention is only available on Growth Studio and Pro plans. Please upgrade your salon subscription on the Plan & Billing page to access automated email reminders, re-engagement campaigns, dynamic discounts, and SMTP relay.",
                upgradeRequired = true,
                currentTier = tier
            }), salon);
        }

        return (true, null, salon);
    }

    /// <summary>
    /// Live Automated Email and In-App delivery log feed.
    /// </summary>
    [HttpGet("reminders/logs")]
    [ProducesResponseType(typeof(List<AutomatedMessageLogResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessageLogs([FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var (allowed, result, _) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;
        limit = Math.Clamp(limit, 1, 100);

        var notifications = await _dbContext.Notifications
            .AsNoTracking()
            .Include(n => n.Recipient)
            .Where(n => n.SalonId == salonId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var logs = notifications.Select(n => new AutomatedMessageLogResponse
        {
            Id = n.Id,
            RecipientUserId = n.RecipientUserId,
            RecipientName = n.Recipient?.FullName ?? "Valued Client",
            RecipientContact = n.Recipient?.Email ?? "",
            AppointmentId = n.AppointmentId,
            Type = n.Type,
            Channel = n.Channel,
            Subject = n.Subject,
            Message = n.Message,
            Status = n.Status,
            SentAtUtc = n.SentAtUtc,
            CreatedAtUtc = n.CreatedAtUtc
        }).ToList();

        return Ok(logs);
    }

    /// <summary>
    /// Identify past clients who haven't booked in >= 6 weeks (42 days) for retention campaigns.
    /// </summary>
    [HttpGet("reengagement/candidates")]
    [ProducesResponseType(typeof(List<ReEngagementCandidateResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReEngagementCandidates([FromQuery] int minWeeks = 6, CancellationToken cancellationToken = default)
    {
        var (allowed, result, _) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;
        var thresholdDays = Math.Max(14, minWeeks * 7);
        var cutoffDate = DateTime.UtcNow.AddDays(-thresholdDays);
        var now = DateTime.UtcNow;

        // Find customer IDs with completed appointments at this salon
        var completedAppointments = await _dbContext.Appointments
            .AsNoTracking()
            .Include(a => a.Customer)
            .Where(a => a.SalonId == salonId && a.Status == AppointmentStatuses.Completed)
            .ToListAsync(cancellationToken);

        // Group by customer
        var grouped = completedAppointments
            .GroupBy(a => a.CustomerId)
            .ToList();

        // Check for upcoming bookings
        var customerIdsWithUpcoming = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.SalonId == salonId &&
                        a.StartAtUtc >= now &&
                        (a.Status == AppointmentStatuses.Confirmed || a.Status == AppointmentStatuses.Pending))
            .Select(a => a.CustomerId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var upcomingSet = new HashSet<int>(customerIdsWithUpcoming);
        var candidates = new List<ReEngagementCandidateResponse>();

        foreach (var group in grouped)
        {
            var customerId = group.Key;
            if (upcomingSet.Contains(customerId)) continue; // Already booked upcoming visit

            var latestVisit = group.OrderByDescending(a => a.StartAtUtc).First();
            if (latestVisit.StartAtUtc <= cutoffDate)
            {
                var daysSince = (int)(now - latestVisit.StartAtUtc).TotalDays;
                var customer = latestVisit.Customer;

                candidates.Add(new ReEngagementCandidateResponse
                {
                    CustomerId = customerId,
                    CustomerName = customer?.FullName ?? "Valued Client",
                    CustomerEmail = customer?.Email ?? "",
                    CustomerPhone = null,
                    LastVisitDate = latestVisit.StartAtUtc,
                    DaysSinceLastVisit = daysSince,
                    WeeksSinceLastVisit = daysSince / 7,
                    TotalPastVisits = group.Count(),
                    LastServiceName = latestVisit.ServiceNameAtBooking
                });
            }
        }

        return Ok(candidates.OrderByDescending(c => c.DaysSinceLastVisit).ToList());
    }

    /// <summary>
    /// Broadcast an automated Email "We Miss You" loyalty campaign to selected lapsed clients.
    /// </summary>
    [HttpPost("reengagement/dispatch")]
    [ProducesResponseType(typeof(ReEngagementResultResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> DispatchReEngagementCampaign([FromBody] SendReEngagementRequest request, CancellationToken cancellationToken)
    {
        var (allowed, result, salon) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;
        var targetCustomerIds = request.CustomerIds?.Distinct().ToList() ?? new List<int>();
        if (targetCustomerIds.Count == 0)
        {
            return BadRequest(new { message = "At least one customer must be selected." });
        }

        var customers = await _dbContext.Users
            .Where(u => targetCustomerIds.Contains(u.Id))
            .ToListAsync(cancellationToken);

        var coupon = string.IsNullOrWhiteSpace(request.CouponCode) ? "MISSYOU10" : request.CouponCode.Trim().ToUpperInvariant();
        var discPct = request.DiscountPercentage > 0 ? request.DiscountPercentage : 10.00m;
        var channel = "Email"; // Email only, WhatsApp removed

        int sentCount = 0;

        foreach (var customer in customers)
        {
            var defaultMsg = $"❤️ We miss you at {salon!.Name}, {customer.FullName}! It's been a while since your last visit. Treat yourself with {discPct:0}% off your next booking using code '{coupon}'.\n✨ Book online: https://f-rstudio.onrender.com/salons/{salon.Slug}\nSee you soon!";
            var msgText = string.IsNullOrWhiteSpace(request.CustomMessage) 
                ? defaultMsg 
                : request.CustomMessage.Replace("{CustomerName}", customer.FullName).Replace("{SalonName}", salon.Name).Replace("{Coupon}", coupon);

            var subject = $"❤️ We Miss You at {salon.Name}! Here's {discPct:0}% Off";

            // If customer has email, dispatch email via salon SMTP or fallback
            if (!string.IsNullOrWhiteSpace(customer.Email))
            {
                var htmlBody = $@"
<div style=""font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e8dfdf; border-radius: 16px; background-color: #ffffff; color: #2D1527;"">
    <div style=""text-align: center; margin-bottom: 24px;"">
        <h1 style=""font-family: Georgia, serif; color: #592B38; font-size: 26px; margin: 0;"">{salon.Name}</h1>
        <p style=""color: #B66B70; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 6px;"">Exclusive Client Privilege</p>
    </div>
    <div style=""background-color: #FAF5F5; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #F2E6E6;"">
        <p style=""color: #333333; font-size: 15px; line-height: 1.7; margin: 0;"">
            {msgText.Replace("\n", "<br/>")}
        </p>
    </div>
    <div style=""text-align: center; margin: 28px 0;"">
        <div style=""display: inline-block; background-color: #592B38; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 15px; letter-spacing: 0.5px;"">
            PROMO CODE: {coupon} ({discPct:0}% OFF)
        </div>
    </div>
    <p style=""font-size: 12px; color: #8A7B82; text-align: center; margin-top: 28px; border-top: 1px solid #F2E6E6; pt-4;"">
        Sent by {salon.Name} • F&R Beauty Studio Automated Client Care
    </p>
</div>";

                await _emailService.SendSalonEmailAsync(salon, customer.Email, subject, htmlBody, msgText, cancellationToken);
            }

            var notification = new Notification
            {
                RecipientUserId = customer.Id,
                SalonId = salonId,
                Type = "ReEngagement6Weeks",
                Channel = channel,
                Subject = subject,
                Message = msgText,
                Status = "Sent",
                SentAtUtc = DateTime.UtcNow,
                CreatedAtUtc = DateTime.UtcNow
            };

            _dbContext.Notifications.Add(notification);
            sentCount++;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new ReEngagementResultResponse
        {
            TotalTargeted = targetCustomerIds.Count,
            SuccessfullySent = sentCount,
            CouponCode = coupon,
            DiscountPercentage = discPct,
            DispatchedAtUtc = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Retrieve salon custom Email SMTP configuration.
    /// </summary>
    [HttpGet("smtp")]
    [ProducesResponseType(typeof(SalonSmtpConfigResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSmtpConfig(CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue) return Forbid();

        var salon = await _dbContext.Salons.AsNoTracking().FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
        if (salon == null) return NotFound(new { message = "Salon not found." });

        var tier = salon.SubscriptionTier ?? SubscriptionPlanCatalog.Starter;
        var isAllowed = tier.Equals(SubscriptionPlanCatalog.Growth, StringComparison.OrdinalIgnoreCase) ||
                        tier.Equals(SubscriptionPlanCatalog.Pro, StringComparison.OrdinalIgnoreCase) ||
                        tier.Equals(SubscriptionPlanCatalog.LuxuryPro, StringComparison.OrdinalIgnoreCase);

        return Ok(new SalonSmtpConfigResponse
        {
            IsConfigured = salon.IsEmailConfigured,
            SmtpHost = salon.SmtpHost ?? string.Empty,
            SmtpPort = salon.SmtpPort > 0 ? salon.SmtpPort : 587,
            SmtpUsername = salon.SmtpUsername ?? string.Empty,
            HasPassword = !string.IsNullOrWhiteSpace(salon.SmtpPassword),
            SenderEmail = salon.SenderEmail ?? salon.ContactEmail ?? string.Empty,
            SenderName = salon.SenderName ?? salon.Name,
            SmtpEnableSsl = salon.SmtpEnableSsl,
            CurrentTier = tier,
            IsAutomationAllowed = isAllowed
        });
    }

    /// <summary>
    /// Save or update salon custom Email SMTP configuration. Available for Growth Studio and Pro plans.
    /// </summary>
    [HttpPut("smtp")]
    [ProducesResponseType(typeof(SalonSmtpConfigResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSmtpConfig([FromBody] UpdateSalonSmtpConfigRequest request, CancellationToken cancellationToken)
    {
        var (allowed, result, salon) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        salon!.SmtpHost = request.SmtpHost?.Trim();
        salon.SmtpPort = request.SmtpPort > 0 ? request.SmtpPort : 587;
        salon.SmtpUsername = request.SmtpUsername?.Trim();

        // Only overwrite secret/password if provided
        if (!string.IsNullOrWhiteSpace(request.SmtpPassword))
        {
            salon.SmtpPassword = request.SmtpPassword;
        }

        salon.SenderEmail = request.SenderEmail?.Trim();
        salon.SenderName = request.SenderName?.Trim();
        salon.SmtpEnableSsl = request.SmtpEnableSsl;
        salon.IsEmailConfigured = request.IsConfigured;
        salon.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Salon ID {SalonId} updated email SMTP configuration. Host: {Host}, Sender: {Sender}",
            salon.Id, salon.SmtpHost, salon.SenderEmail);

        return Ok(new SalonSmtpConfigResponse
        {
            IsConfigured = salon.IsEmailConfigured,
            SmtpHost = salon.SmtpHost ?? string.Empty,
            SmtpPort = salon.SmtpPort,
            SmtpUsername = salon.SmtpUsername ?? string.Empty,
            HasPassword = !string.IsNullOrWhiteSpace(salon.SmtpPassword),
            SenderEmail = salon.SenderEmail ?? string.Empty,
            SenderName = salon.SenderName ?? salon.Name,
            SmtpEnableSsl = salon.SmtpEnableSsl,
            CurrentTier = salon.SubscriptionTier ?? "Growth",
            IsAutomationAllowed = true
        });
    }

    /// <summary>
    /// Test live SMTP connection by sending a real verification email.
    /// </summary>
    [HttpPost("smtp/test")]
    [ProducesResponseType(typeof(TestEmailSmtpResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> TestSmtpConfig([FromBody] TestEmailSmtpRequest request, CancellationToken cancellationToken)
    {
        var (allowed, result, salon) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var host = !string.IsNullOrWhiteSpace(request.SmtpHost) ? request.SmtpHost.Trim() : salon!.SmtpHost;
        var port = request.SmtpPort.HasValue && request.SmtpPort.Value > 0 ? request.SmtpPort.Value : salon!.SmtpPort;
        var username = request.SmtpUsername != null ? request.SmtpUsername.Trim() : salon!.SmtpUsername;
        var password = !string.IsNullOrWhiteSpace(request.SmtpPassword) ? request.SmtpPassword : salon!.SmtpPassword;
        var senderEmail = !string.IsNullOrWhiteSpace(request.SenderEmail) ? request.SenderEmail.Trim() : salon!.SenderEmail;
        var senderName = !string.IsNullOrWhiteSpace(request.SenderName) ? request.SenderName.Trim() : (salon!.SenderName ?? salon.Name);
        var enableSsl = request.SmtpEnableSsl ?? salon!.SmtpEnableSsl;

        if (string.IsNullOrWhiteSpace(host))
        {
            return BadRequest(new TestEmailSmtpResponse
            {
                Success = false,
                Message = "SMTP Host is missing. Please enter a valid SMTP host (e.g. smtp.gmail.com or smtp-relay.brevo.com)."
            });
        }

        if (string.IsNullOrWhiteSpace(senderEmail))
        {
            return BadRequest(new TestEmailSmtpResponse
            {
                Success = false,
                Message = "Sender Email is missing. Please enter your sender email address."
            });
        }

        var toEmail = !string.IsNullOrWhiteSpace(request.RecipientEmail)
            ? request.RecipientEmail.Trim()
            : _currentUserService.Email ?? salon!.ContactEmail;

        if (string.IsNullOrWhiteSpace(toEmail))
        {
            return BadRequest(new TestEmailSmtpResponse
            {
                Success = false,
                Message = "Recipient email address is required to receive the test email."
            });
        }

        var subject = $"[Test Connection] F&R Studio Email SMTP Configuration ({salon!.Name})";
        var htmlBody = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;"">
    <h2 style=""color: #592B38; margin: 0 0 12px 0; font-family: Georgia, serif;"">✅ SMTP Connection Verified!</h2>
    <p style=""font-size: 14px; color: #4a5568; line-height: 1.6;"">
        Congratulations! Your custom email SMTP relay connection for <strong>{salon.Name}</strong> is functioning correctly.
    </p>
    <div style=""background: #FAF5F5; padding: 18px; border-radius: 10px; font-size: 13px; color: #4a5568; margin: 20px 0; border: 1px solid #F0E6E6;"">
        <div style=""margin-bottom: 6px;""><strong>Host:</strong> {host}:{port}</div>
        <div style=""margin-bottom: 6px;""><strong>Username / Key:</strong> {(string.IsNullOrWhiteSpace(username) ? "(None / Anonymous)" : username)}</div>
        <div style=""margin-bottom: 6px;""><strong>Sender:</strong> {senderName} &lt;{senderEmail}&gt;</div>
        <div style=""margin-bottom: 6px;""><strong>SSL / TLS:</strong> {(enableSsl ? "Enabled" : "Disabled")}</div>
        <div><strong>Timestamp:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</div>
    </div>
    <p style=""font-size: 12px; color: #718096; margin: 0; line-height: 1.5;"">
        This automated test confirms that booking notifications, 24h & 2h appointment reminders, and customer re-engagement campaigns can now be delivered directly to your clients.
    </p>
</div>";

        var sendResult = await _emailService.SendCustomEmailAsync(
            host: host,
            port: port,
            username: username,
            password: password,
            senderEmail: senderEmail,
            senderName: senderName,
            enableSsl: enableSsl,
            toEmail: toEmail,
            subject: subject,
            htmlBody: htmlBody,
            plainTextBody: $"SMTP Connection Verified for {salon.Name}! Host: {host}:{port}, Sender: {senderEmail}",
            cancellationToken: cancellationToken
        );

        if (sendResult.Success)
        {
            return Ok(new TestEmailSmtpResponse
            {
                Success = true,
                Message = $"Test email sent successfully to {toEmail} via {host}:{port}!"
            });
        }

        return BadRequest(new TestEmailSmtpResponse
        {
            Success = false,
            Message = $"SMTP connection or delivery failed: {sendResult.ErrorMessage}",
            ErrorCode = sendResult.ErrorCode
        });
    }

    /// <summary>
    /// List all Off-Peak Dynamic Pricing / Flash Discount rules for the salon.
    /// </summary>
    [HttpGet("discounts")]
    [ProducesResponseType(typeof(List<OffPeakRuleDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOffPeakRules(CancellationToken cancellationToken)
    {
        var (allowed, result, _) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;
        var rules = await _dbContext.SalonOffPeakRules
            .AsNoTracking()
            .Where(r => r.SalonId == salonId)
            .OrderBy(r => r.StartTime)
            .Select(r => new OffPeakRuleDTO
            {
                Id = r.Id,
                SalonId = r.SalonId,
                Name = r.Name,
                DaysOfWeek = r.DaysOfWeek,
                StartTime = r.StartTime,
                EndTime = r.EndTime,
                DiscountPercentage = r.DiscountPercentage,
                IsActive = r.IsActive,
                CreatedAtUtc = r.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(rules);
    }

    /// <summary>
    /// Create a new Off-Peak / Flash Discount rule (e.g. Tuesday & Wednesday 10 AM - 1 PM, 20% off).
    /// </summary>
    [HttpPost("discounts")]
    [ProducesResponseType(typeof(OffPeakRuleDTO), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateOffPeakRule([FromBody] CreateOffPeakRuleRequest request, CancellationToken cancellationToken)
    {
        var (allowed, result, _) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Rule name is required." });
        }

        if (string.IsNullOrWhiteSpace(request.DaysOfWeek))
        {
            return BadRequest(new { message = "At least one day of week is required." });
        }

        if (request.DiscountPercentage <= 0 || request.DiscountPercentage > 90)
        {
            return BadRequest(new { message = "Discount percentage must be between 1% and 90%." });
        }

        var rule = new SalonOffPeakRule
        {
            SalonId = salonId,
            Name = request.Name.Trim(),
            DaysOfWeek = request.DaysOfWeek.Trim(),
            StartTime = string.IsNullOrWhiteSpace(request.StartTime) ? "10:00" : request.StartTime.Trim(),
            EndTime = string.IsNullOrWhiteSpace(request.EndTime) ? "13:00" : request.EndTime.Trim(),
            DiscountPercentage = request.DiscountPercentage,
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.SalonOffPeakRules.Add(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var dto = new OffPeakRuleDTO
        {
            Id = rule.Id,
            SalonId = rule.SalonId,
            Name = rule.Name,
            DaysOfWeek = rule.DaysOfWeek,
            StartTime = rule.StartTime,
            EndTime = rule.EndTime,
            DiscountPercentage = rule.DiscountPercentage,
            IsActive = rule.IsActive,
            CreatedAtUtc = rule.CreatedAtUtc
        };

        return CreatedAtAction(nameof(GetOffPeakRules), new { id = rule.Id }, dto);
    }

    /// <summary>
    /// Update an existing Off-Peak rule.
    /// </summary>
    [HttpPut("discounts/{id}")]
    [ProducesResponseType(typeof(OffPeakRuleDTO), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateOffPeakRule(int id, [FromBody] UpdateOffPeakRuleRequest request, CancellationToken cancellationToken)
    {
        var (allowed, result, _) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;

        var rule = await _dbContext.SalonOffPeakRules
            .FirstOrDefaultAsync(r => r.Id == id && r.SalonId == salonId, cancellationToken);

        if (rule == null)
        {
            return NotFound(new { message = "Off-peak rule not found." });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { message = "Rule name is required." });
        }

        rule.Name = request.Name.Trim();
        rule.DaysOfWeek = request.DaysOfWeek.Trim();
        rule.StartTime = request.StartTime.Trim();
        rule.EndTime = request.EndTime.Trim();
        rule.DiscountPercentage = request.DiscountPercentage;
        rule.IsActive = request.IsActive;
        rule.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new OffPeakRuleDTO
        {
            Id = rule.Id,
            SalonId = rule.SalonId,
            Name = rule.Name,
            DaysOfWeek = rule.DaysOfWeek,
            StartTime = rule.StartTime,
            EndTime = rule.EndTime,
            DiscountPercentage = rule.DiscountPercentage,
            IsActive = rule.IsActive,
            CreatedAtUtc = rule.CreatedAtUtc
        });
    }

    /// <summary>
    /// Delete an Off-Peak rule.
    /// </summary>
    [HttpDelete("discounts/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteOffPeakRule(int id, CancellationToken cancellationToken)
    {
        var (allowed, result, _) = await CheckAutomationAccessAsync(cancellationToken);
        if (!allowed) return result!;

        var salonId = _currentUserService.SalonId!.Value;

        var rule = await _dbContext.SalonOffPeakRules
            .FirstOrDefaultAsync(r => r.Id == id && r.SalonId == salonId, cancellationToken);

        if (rule == null)
        {
            return NotFound(new { message = "Off-peak rule not found." });
        }

        _dbContext.SalonOffPeakRules.Remove(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
