using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        ApplicationDbContext dbContext,
        IEmailService emailService,
        ILogger<NotificationService> logger)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task DispatchAppointmentEventAsync(Appointment appointment, string eventType, CancellationToken cancellationToken = default)
    {
        // Load full appointment details with navigations if needed
        var appt = await _dbContext.Appointments
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Service)
            .Include(a => a.Staff)
            .FirstOrDefaultAsync(a => a.Id == appointment.Id, cancellationToken)
            ?? appointment;

        if (appt.Salon == null)
            appt.Salon = await _dbContext.Salons.FindAsync(new object[] { appt.SalonId }, cancellationToken) ?? new Salon { Name = "Salon" };
        if (appt.Customer == null)
            appt.Customer = await _dbContext.Users.FindAsync(new object[] { appt.CustomerId }, cancellationToken) ?? new User { FullName = "Customer", Email = "" };
        if (appt.Staff == null)
            appt.Staff = await _dbContext.Staff.FindAsync(new object[] { appt.StaffId }, cancellationToken) ?? new Staff { FullName = "Staff Member" };

        var salonAdmins = await _dbContext.Users
            .Where(u => u.SalonId == appt.SalonId && u.Role == "Admin" && u.IsActive)
            .ToListAsync(cancellationToken);

        switch (eventType)
        {
            case "AppointmentCreated":
                await HandleAppointmentCreatedAsync(appt, salonAdmins, cancellationToken);
                break;

            case "AppointmentCancelled":
                await HandleAppointmentCancelledAsync(appt, salonAdmins, cancellationToken);
                break;

            case "AppointmentConfirmed":
            case "AppointmentStatusChanged":
                await HandleAppointmentStatusChangedAsync(appt, salonAdmins, eventType, cancellationToken);
                break;

            default:
                _logger.LogWarning("Unknown appointment notification event type: {EventType}", eventType);
                break;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task HandleAppointmentCreatedAsync(Appointment appt, List<User> salonAdmins, CancellationToken cancellationToken)
    {
        var formattedDate = appt.StartAtUtc.ToString("yyyy-MM-dd HH:mm");

        // 1. Customer InApp Notification
        var customerInApp = new Notification
        {
            RecipientUserId = appt.CustomerId,
            SalonId = appt.SalonId,
            AppointmentId = appt.Id,
            Type = "AppointmentCreated",
            Channel = "InApp",
            Subject = $"Appointment Confirmed: {appt.ServiceNameAtBooking}",
            Message = $"Your appointment for {appt.ServiceNameAtBooking} with {appt.Staff.FullName} at {appt.Salon.Name} is confirmed for {formattedDate} UTC.",
            Status = "Sent",
            SentAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Notifications.Add(customerInApp);

        // 2. Customer Email Notification
        if (!string.IsNullOrWhiteSpace(appt.Customer.Email))
        {
            var customerEmailSubject = $"Appointment Confirmation: {appt.ServiceNameAtBooking} at {appt.Salon.Name}";
            var customerEmailBody = $"<p>Dear {appt.Customer.FullName},</p><p>Your appointment for <strong>{appt.ServiceNameAtBooking}</strong> with {appt.Staff.FullName} at <strong>{appt.Salon.Name}</strong> is confirmed for <strong>{formattedDate} UTC</strong>.</p><p>Price: {appt.PriceAtBooking} {appt.Salon.CurrencyCode}</p><p>Thank you for choosing SalonBook!</p>";

            var emailResult = await _emailService.SendEmailAsync(appt.Customer.Email, customerEmailSubject, customerEmailBody, cancellationToken);

            var customerEmail = new Notification
            {
                RecipientUserId = appt.CustomerId,
                SalonId = appt.SalonId,
                AppointmentId = appt.Id,
                Type = "AppointmentCreated",
                Channel = "Email",
                Subject = customerEmailSubject,
                Message = customerEmailBody,
                Status = emailResult.Success ? "Sent" : (emailResult.Skipped ? "Skipped" : "Failed"),
                SentAtUtc = emailResult.Success ? DateTime.UtcNow : null,
                ErrorMessage = emailResult.ErrorMessage,
                LastErrorCode = emailResult.ErrorCode,
                CreatedAtUtc = DateTime.UtcNow
            };
            _dbContext.Notifications.Add(customerEmail);
        }

        // 3. Salon Admins InApp & Email Notifications
        foreach (var admin in salonAdmins)
        {
            var adminInApp = new Notification
            {
                RecipientUserId = admin.Id,
                SalonId = appt.SalonId,
                AppointmentId = appt.Id,
                Type = "AppointmentCreated",
                Channel = "InApp",
                Subject = $"New Booking: {appt.Customer.FullName} - {appt.ServiceNameAtBooking}",
                Message = $"{appt.Customer.FullName} booked {appt.ServiceNameAtBooking} with {appt.Staff.FullName} for {formattedDate} UTC.",
                Status = "Sent",
                SentAtUtc = DateTime.UtcNow,
                CreatedAtUtc = DateTime.UtcNow
            };
            _dbContext.Notifications.Add(adminInApp);

            if (!string.IsNullOrWhiteSpace(admin.Email))
            {
                var adminEmailSubject = $"[SalonBook] New Appointment: {appt.ServiceNameAtBooking}";
                var adminEmailBody = $"<p>A new appointment has been scheduled:</p><ul><li><strong>Customer:</strong> {appt.Customer.FullName}</li><li><strong>Service:</strong> {appt.ServiceNameAtBooking}</li><li><strong>Staff:</strong> {appt.Staff.FullName}</li><li><strong>Date/Time:</strong> {formattedDate} UTC</li></ul>";

                var adminEmailResult = await _emailService.SendEmailAsync(admin.Email, adminEmailSubject, adminEmailBody, cancellationToken);

                var adminEmail = new Notification
                {
                    RecipientUserId = admin.Id,
                    SalonId = appt.SalonId,
                    AppointmentId = appt.Id,
                    Type = "AppointmentCreated",
                    Channel = "Email",
                    Subject = adminEmailSubject,
                    Message = adminEmailBody,
                    Status = adminEmailResult.Success ? "Sent" : (adminEmailResult.Skipped ? "Skipped" : "Failed"),
                    SentAtUtc = adminEmailResult.Success ? DateTime.UtcNow : null,
                    ErrorMessage = adminEmailResult.ErrorMessage,
                    LastErrorCode = adminEmailResult.ErrorCode,
                    CreatedAtUtc = DateTime.UtcNow
                };
                _dbContext.Notifications.Add(adminEmail);
            }
        }

        // 4. Schedule Reminders (24H and 2H before appointment start)
        var reminder24HTime = appt.StartAtUtc.AddHours(-24);
        if (reminder24HTime > DateTime.UtcNow)
        {
            _dbContext.AppointmentReminders.Add(new AppointmentReminder
            {
                AppointmentId = appt.Id,
                ReminderType = "24Hours",
                ScheduledForUtc = reminder24HTime,
                Status = "Pending",
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        var reminder2HTime = appt.StartAtUtc.AddHours(-2);
        if (reminder2HTime > DateTime.UtcNow)
        {
            _dbContext.AppointmentReminders.Add(new AppointmentReminder
            {
                AppointmentId = appt.Id,
                ReminderType = "2Hours",
                ScheduledForUtc = reminder2HTime,
                Status = "Pending",
                CreatedAtUtc = DateTime.UtcNow
            });
        }
    }

    private async Task HandleAppointmentCancelledAsync(Appointment appt, List<User> salonAdmins, CancellationToken cancellationToken)
    {
        var reason = string.IsNullOrWhiteSpace(appt.CancellationReason) ? "No reason specified" : appt.CancellationReason;

        // Customer InApp
        _dbContext.Notifications.Add(new Notification
        {
            RecipientUserId = appt.CustomerId,
            SalonId = appt.SalonId,
            AppointmentId = appt.Id,
            Type = "AppointmentCancelled",
            Channel = "InApp",
            Subject = $"Appointment Cancelled: {appt.ServiceNameAtBooking}",
            Message = $"Your appointment for {appt.ServiceNameAtBooking} at {appt.Salon.Name} on {appt.StartAtUtc:yyyy-MM-dd HH:mm} UTC has been cancelled. Reason: {reason}",
            Status = "Sent",
            SentAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        });

        // Customer Email
        if (!string.IsNullOrWhiteSpace(appt.Customer.Email))
        {
            var emailSubject = $"Appointment Cancelled: {appt.ServiceNameAtBooking} at {appt.Salon.Name}";
            var emailBody = $"<p>Dear {appt.Customer.FullName},</p><p>Your appointment for <strong>{appt.ServiceNameAtBooking}</strong> on {appt.StartAtUtc:yyyy-MM-dd HH:mm} UTC has been cancelled.</p><p><strong>Reason:</strong> {reason}</p>";
            var emailResult = await _emailService.SendEmailAsync(appt.Customer.Email, emailSubject, emailBody, cancellationToken);

            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = appt.CustomerId,
                SalonId = appt.SalonId,
                AppointmentId = appt.Id,
                Type = "AppointmentCancelled",
                Channel = "Email",
                Subject = emailSubject,
                Message = emailBody,
                Status = emailResult.Success ? "Sent" : (emailResult.Skipped ? "Skipped" : "Failed"),
                SentAtUtc = emailResult.Success ? DateTime.UtcNow : null,
                ErrorMessage = emailResult.ErrorMessage,
                LastErrorCode = emailResult.ErrorCode,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        // Admins InApp
        foreach (var admin in salonAdmins)
        {
            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = admin.Id,
                SalonId = appt.SalonId,
                AppointmentId = appt.Id,
                Type = "AppointmentCancelled",
                Channel = "InApp",
                Subject = $"Appointment Cancelled: {appt.Customer.FullName} - {appt.ServiceNameAtBooking}",
                Message = $"Appointment #{appt.Id} for {appt.Customer.FullName} with {appt.Staff.FullName} was cancelled. Reason: {reason}",
                Status = "Sent",
                SentAtUtc = DateTime.UtcNow,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        // Cancel / Skip all pending reminders for this appointment
        var pendingReminders = await _dbContext.AppointmentReminders
            .Where(r => r.AppointmentId == appt.Id && r.Status == "Pending")
            .ToListAsync(cancellationToken);

        foreach (var reminder in pendingReminders)
        {
            reminder.Status = "Skipped";
            reminder.LastError = "Appointment was cancelled";
            reminder.ProcessedAtUtc = DateTime.UtcNow;
        }
    }

    private async Task HandleAppointmentStatusChangedAsync(Appointment appt, List<User> salonAdmins, string eventType, CancellationToken cancellationToken)
    {
        // Customer InApp
        _dbContext.Notifications.Add(new Notification
        {
            RecipientUserId = appt.CustomerId,
            SalonId = appt.SalonId,
            AppointmentId = appt.Id,
            Type = eventType,
            Channel = "InApp",
            Subject = $"Appointment Update: {appt.ServiceNameAtBooking}",
            Message = $"Your appointment for {appt.ServiceNameAtBooking} at {appt.Salon.Name} status has been updated to '{appt.Status}'.",
            Status = "Sent",
            SentAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        });

        // If status is terminal (Completed, NoShow), skip remaining reminders
        if (appt.Status == "Completed" || appt.Status == "NoShow")
        {
            var pendingReminders = await _dbContext.AppointmentReminders
                .Where(r => r.AppointmentId == appt.Id && r.Status == "Pending")
                .ToListAsync(cancellationToken);

            foreach (var reminder in pendingReminders)
            {
                reminder.Status = "Skipped";
                reminder.LastError = $"Appointment marked as {appt.Status}";
                reminder.ProcessedAtUtc = DateTime.UtcNow;
            }
        }
    }

    public async Task ProcessReminderAsync(int reminderId, CancellationToken cancellationToken = default)
    {
        var reminder = await _dbContext.AppointmentReminders
            .Include(r => r.Appointment)
                .ThenInclude(a => a.Salon)
            .Include(r => r.Appointment)
                .ThenInclude(a => a.Customer)
            .Include(r => r.Appointment)
                .ThenInclude(a => a.Staff)
            .FirstOrDefaultAsync(r => r.Id == reminderId, cancellationToken);

        if (reminder == null)
            return;

        if (reminder.Status != "Pending")
            return;

        var appt = reminder.Appointment;
        if (appt == null || appt.Status == "Cancelled" || appt.Status == "Completed" || appt.Status == "NoShow")
        {
            reminder.Status = "Skipped";
            reminder.LastError = $"Appointment is {appt?.Status ?? "missing"}";
            reminder.ProcessedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var reminderTypeName = reminder.ReminderType == "24Hours" ? "24 hours" : "2 hours";
        var reminderNotificationType = reminder.ReminderType == "24Hours" ? "AppointmentReminder24H" : "AppointmentReminder2H";

        // Create Customer Reminder InApp Notification
        _dbContext.Notifications.Add(new Notification
        {
            RecipientUserId = appt.CustomerId,
            SalonId = appt.SalonId,
            AppointmentId = appt.Id,
            Type = reminderNotificationType,
            Channel = "InApp",
            Subject = $"Reminder: Upcoming Appointment ({reminderTypeName})",
            Message = $"You have an upcoming appointment for {appt.ServiceNameAtBooking} with {appt.Staff.FullName} at {appt.Salon.Name} on {appt.StartAtUtc:yyyy-MM-dd HH:mm} UTC.",
            Status = "Sent",
            SentAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        });

        // Create Customer Reminder Email
        if (!string.IsNullOrWhiteSpace(appt.Customer.Email))
        {
            var emailSubject = $"Reminder: Upcoming Appointment in {reminderTypeName} - {appt.ServiceNameAtBooking}";
            var emailBody = $"<p>Dear {appt.Customer.FullName},</p><p>This is a friendly reminder that you have an upcoming appointment for <strong>{appt.ServiceNameAtBooking}</strong> with {appt.Staff.FullName} at <strong>{appt.Salon.Name}</strong> on <strong>{appt.StartAtUtc:yyyy-MM-dd HH:mm} UTC</strong>.</p><p>We look forward to seeing you!</p>";

            var emailResult = await _emailService.SendEmailAsync(appt.Customer.Email, emailSubject, emailBody, cancellationToken);

            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = appt.CustomerId,
                SalonId = appt.SalonId,
                AppointmentId = appt.Id,
                Type = reminderNotificationType,
                Channel = "Email",
                Subject = emailSubject,
                Message = emailBody,
                Status = emailResult.Success ? "Sent" : (emailResult.Skipped ? "Skipped" : "Failed"),
                SentAtUtc = emailResult.Success ? DateTime.UtcNow : null,
                ErrorMessage = emailResult.ErrorMessage,
                LastErrorCode = emailResult.ErrorCode,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        reminder.Status = "Processed";
        reminder.ProcessedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<NotificationResponse>> GetCustomerNotificationsAsync(int customerId, bool? unreadOnly, int skip, int take, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.RecipientUserId == customerId && n.Channel == "InApp");

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        return await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .Select(n => new NotificationResponse(
                n.Id,
                n.RecipientUserId,
                n.SalonId,
                n.AppointmentId,
                n.Type,
                n.Channel,
                n.Subject,
                n.Message,
                n.Status,
                n.IsRead,
                n.ReadAtUtc,
                n.SentAtUtc,
                n.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetCustomerUnreadCountAsync(int customerId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Notifications
            .AsNoTracking()
            .CountAsync(n => n.RecipientUserId == customerId && n.Channel == "InApp" && !n.IsRead, cancellationToken);
    }

    public async Task<bool> MarkNotificationReadAsync(int notificationId, int userId, CancellationToken cancellationToken = default)
    {
        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientUserId == userId, cancellationToken);

        if (notification == null)
            return false;

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<int> MarkAllCustomerNotificationsReadAsync(int customerId, CancellationToken cancellationToken = default)
    {
        var unread = await _dbContext.Notifications
            .Where(n => n.RecipientUserId == customerId && n.Channel == "InApp" && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count == 0)
            return 0;

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAtUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return unread.Count;
    }

    public async Task<IReadOnlyList<NotificationResponse>> GetAdminNotificationsAsync(int salonId, int adminUserId, bool? unreadOnly, int skip, int take, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.SalonId == salonId && n.RecipientUserId == adminUserId && n.Channel == "InApp");

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        return await query
            .OrderByDescending(n => n.CreatedAtUtc)
            .Skip(skip)
            .Take(take)
            .Select(n => new NotificationResponse(
                n.Id,
                n.RecipientUserId,
                n.SalonId,
                n.AppointmentId,
                n.Type,
                n.Channel,
                n.Subject,
                n.Message,
                n.Status,
                n.IsRead,
                n.ReadAtUtc,
                n.SentAtUtc,
                n.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<int> GetAdminUnreadCountAsync(int salonId, int adminUserId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Notifications
            .AsNoTracking()
            .CountAsync(n => n.SalonId == salonId && n.RecipientUserId == adminUserId && n.Channel == "InApp" && !n.IsRead, cancellationToken);
    }

    public async Task<int> MarkAllAdminNotificationsReadAsync(int salonId, int adminUserId, CancellationToken cancellationToken = default)
    {
        var unread = await _dbContext.Notifications
            .Where(n => n.SalonId == salonId && n.RecipientUserId == adminUserId && n.Channel == "InApp" && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count == 0)
            return 0;

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAtUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return unread.Count;
    }
}

