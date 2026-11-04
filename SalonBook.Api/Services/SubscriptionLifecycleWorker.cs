using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public class SubscriptionLifecycleWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionLifecycleWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(60);

    public SubscriptionLifecycleWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<SubscriptionLifecycleWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SubscriptionLifecycleWorker background service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessSubscriptionLifecycleAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error occurred while executing SubscriptionLifecycleWorker.");
            }

            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("SubscriptionLifecycleWorker background service stopped.");
    }

    public async Task ProcessSubscriptionLifecycleAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var now = DateTime.UtcNow;

        // 1. Process Expired Subscriptions & Trials
        var expiredSalons = await dbContext.Salons
            .Include(s => s.Users)
            .Where(s => (s.SubscriptionStatus == "Active" || s.SubscriptionStatus == "Trial") &&
                        s.SubscriptionRenewsAtUtc.HasValue &&
                        s.SubscriptionRenewsAtUtc.Value <= now)
            .ToListAsync(cancellationToken);

        foreach (var salon in expiredSalons)
        {
            var isTrial = salon.SubscriptionStatus == "Trial" || salon.SubscriptionTier == "Starter";
            var previousStatus = salon.SubscriptionStatus;

            salon.SubscriptionStatus = "Expired";
            salon.UpdatedAtUtc = now;

            // Only mark inactive if not independently suspended by SuperAdmin
            if (!salon.IsSuspendedByAdmin)
            {
                salon.IsActive = false;
                salon.DeactivationReason = isTrial ? "TrialExpired" : "SubscriptionExpired";
            }

            // Notify salon admin
            var adminUser = salon.Users.FirstOrDefault(u => u.Role == "Admin");
            if (adminUser != null)
            {
                var subject = isTrial ? "Starter Trial Expired: Action Required" : $"{salon.SubscriptionTier} Subscription Expired";
                var message = isTrial
                    ? $"Your 30-day Starter trial for '{salon.Name}' ended on {salon.SubscriptionRenewsAtUtc:dd MMM yyyy}. New appointment bookings and catalog additions are paused. Please upgrade to Growth or Pro on the Plan & Billing page to resume full operations."
                    : $"Your {salon.SubscriptionTier} plan ended on {salon.SubscriptionRenewsAtUtc:dd MMM yyyy}. Salon operations have been paused. Please renew your subscription to restore your limits and features immediately.";

                // Avoid duplicate unread notification
                var hasRecentNotice = await dbContext.Notifications.AnyAsync(n =>
                    n.SalonId == salon.Id &&
                    n.RecipientUserId == adminUser.Id &&
                    n.Type == "SubscriptionExpired" &&
                    n.CreatedAtUtc >= now.AddDays(-1), cancellationToken);

                if (!hasRecentNotice)
                {
                    dbContext.Notifications.Add(new Notification
                    {
                        RecipientUserId = adminUser.Id,
                        SalonId = salon.Id,
                        Type = "SubscriptionExpired",
                        Channel = "InApp",
                        Subject = subject,
                        Message = message,
                        Status = "Sent",
                        SentAtUtc = now,
                        CreatedAtUtc = now
                    });
                }
            }

            _logger.LogInformation("Salon ID {SalonId} ({SalonName}) transitioned to Expired. Active: {IsActive}, Reason: {Reason}",
                salon.Id, salon.Name, salon.IsActive, salon.DeactivationReason);
        }

        // 2. Process Expiry Warnings (3 days before expiration)
        var warningThreshold = now.AddDays(3);
        var expiringSalons = await dbContext.Salons
            .Include(s => s.Users)
            .Where(s => (s.SubscriptionStatus == "Active" || s.SubscriptionStatus == "Trial") &&
                        s.SubscriptionRenewsAtUtc.HasValue &&
                        s.SubscriptionRenewsAtUtc.Value > now &&
                        s.SubscriptionRenewsAtUtc.Value <= warningThreshold)
            .ToListAsync(cancellationToken);

        foreach (var salon in expiringSalons)
        {
            var adminUser = salon.Users.FirstOrDefault(u => u.Role == "Admin");
            if (adminUser != null)
            {
                var hasRecentWarning = await dbContext.Notifications.AnyAsync(n =>
                    n.SalonId == salon.Id &&
                    n.RecipientUserId == adminUser.Id &&
                    n.Type == "SubscriptionExpiringSoon" &&
                    n.CreatedAtUtc >= now.AddDays(-2), cancellationToken);

                if (!hasRecentWarning)
                {
                    var daysLeft = Math.Max(1, (int)Math.Ceiling((salon.SubscriptionRenewsAtUtc!.Value - now).TotalDays));
                    dbContext.Notifications.Add(new Notification
                    {
                        RecipientUserId = adminUser.Id,
                        SalonId = salon.Id,
                        Type = "SubscriptionExpiringSoon",
                        Channel = "InApp",
                        Subject = $"Subscription Ending in {daysLeft} Day{(daysLeft > 1 ? "s" : "")}",
                        Message = $"Your {salon.SubscriptionTier} subscription period expires on {salon.SubscriptionRenewsAtUtc:dd MMM yyyy}. Visit the Plan & Billing page to ensure continuous service.",
                        Status = "Sent",
                        SentAtUtc = now,
                        CreatedAtUtc = now
                    });
                }
            }
        }

        if (expiredSalons.Count > 0 || expiringSalons.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
