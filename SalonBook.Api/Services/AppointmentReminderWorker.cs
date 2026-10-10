using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;

namespace SalonBook.Api.Services;

public class AppointmentReminderWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AppointmentReminderWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(30);

    public AppointmentReminderWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<AppointmentReminderWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AppointmentReminderWorker background service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDueRemindersAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "An error occurred while processing due appointment reminders.");
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

        _logger.LogInformation("AppointmentReminderWorker background service stopped.");
    }

    public async Task<int> ProcessDueRemindersAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;

        var dueReminderIds = await dbContext.AppointmentReminders
            .AsNoTracking()
            .Where(r => r.Status == "Pending" && r.ScheduledForUtc <= now)
            .OrderBy(r => r.ScheduledForUtc)
            .Take(50)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        if (dueReminderIds.Count == 0)
        {
            return 0;
        }

        _logger.LogInformation("Processing {Count} due appointment reminders.", dueReminderIds.Count);

        var processedCount = 0;
        foreach (var reminderId in dueReminderIds)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            try
            {
                await notificationService.ProcessReminderAsync(reminderId, cancellationToken);
                processedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process appointment reminder ID {ReminderId}.", reminderId);
            }
        }

        return processedCount;
    }
}

