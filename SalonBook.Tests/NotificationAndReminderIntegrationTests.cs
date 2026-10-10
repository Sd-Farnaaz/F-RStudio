using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SalonBook.Api.Common;
using SalonBook.Api.Configurations;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Tests;

public class NotificationAndReminderIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public NotificationAndReminderIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Notification Salon {suffix}",
            BusinessType = "Hair Salon",
            FullName = $"Admin {suffix}",
            Email = $"admin_notif_{suffix}@salonbook.com",
            Password = "SecurePassword123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/admin/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        Assert.NotNull(authRes.User.SalonId);

        return (authRes.AccessToken, authRes.User.SalonId.Value, authRes.User.SalonSlug ?? "");
    }

    private async Task<(string Token, int CustomerId)> RegisterCustomerAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterUserRequest
        {
            FullName = $"Customer {suffix}",
            Email = $"customer_notif_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    private async Task<(int ServiceId, decimal Price)> CreateServiceAsync(string adminToken, string name = "Spa Facial", int durationMinutes = 30, decimal price = 800.00m)
    {
        var req = new CreateServiceRequest
        {
            Name = name,
            Category = "Skincare",
            Price = price,
            DurationMinutes = durationMinutes,
            IsActive = true
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(req)
        };
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var res = await _client.SendAsync(msg);
        res.EnsureSuccessStatusCode();
        var service = await res.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(service);
        return (service.Id, service.Price);
    }

    private async Task<int> CreateStaffWithScheduleAsync(string adminToken, string name = "Stylist Elena")
    {
        var req = new CreateStaffRequest
        {
            FullName = name,
            Title = "Master Stylist",
            IsActive = true,
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00",
                    Breaks = new List<StaffBreakDTO>()
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Tuesday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00"
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Wednesday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00"
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Thursday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00"
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Friday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00"
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Saturday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00"
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Sunday,
                    IsWorkingDay = false,
                    StartTime = "09:00",
                    EndTime = "18:00"
                }
            }
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(req)
        };
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var res = await _client.SendAsync(msg);
        res.EnsureSuccessStatusCode();
        var staff = await res.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staff);
        return staff.Id;
    }

    private static DateTime GetNextWeekdayUtc(DayOfWeek dayOfWeek, int hour = 10, int minute = 0)
    {
        var target = DateTime.UtcNow.Date.AddDays(7);
        while (target.DayOfWeek != dayOfWeek)
        {
            target = target.AddDays(1);
        }
        var istOffset = TimeSpan.FromHours(5.5);
        var localDateTime = new DateTime(target.Year, target.Month, target.Day, hour, minute, 0, DateTimeKind.Unspecified);
        return DateTime.SpecifyKind(localDateTime - istOffset, DateTimeKind.Utc);
    }

    [Fact]
    public async Task EmailService_WhenDisabled_GracefullySkipsAndReturnsDiagnosticInfo()
    {
        var options = Options.Create(new EmailOptions
        {
            IsEnabled = false,
            SmtpHost = ""
        });

        var emailService = new EmailService(options, NullLogger<EmailService>.Instance);
        var result = await emailService.SendEmailAsync("test@example.com", "Test Subject", "Test Body");

        Assert.False(result.Success);
        Assert.True(result.Skipped);
        Assert.Equal("SMTP_DISABLED", result.ErrorCode);
        Assert.Contains("skipped", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task BookingAppointment_GeneratesInAppAndEmailNotifications_AndSchedulesReminders()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, custId) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Deluxe Pedicure", 45, 950.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Technician Clara");

        var startUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 11, 0);

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = startUtc,
            CustomerNotes = "First time client"
        };

        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        Assert.Equal(HttpStatusCode.Created, bookRes.StatusCode);
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        // Verify Customer InApp Notifications via endpoint
        using var custNotifMsg = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/my");
        custNotifMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var custNotifRes = await _client.SendAsync(custNotifMsg);
        Assert.Equal(HttpStatusCode.OK, custNotifRes.StatusCode);
        var custNotifs = await custNotifRes.Content.ReadFromJsonAsync<List<NotificationResponse>>();
        Assert.NotNull(custNotifs);
        Assert.Contains(custNotifs, n => n.Type == "AppointmentCreated" && n.AppointmentId == booking.Id);

        // Verify Admin InApp Notifications via endpoint
        using var adminNotifMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/notifications");
        adminNotifMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var adminNotifRes = await _client.SendAsync(adminNotifMsg);
        Assert.Equal(HttpStatusCode.OK, adminNotifRes.StatusCode);
        var adminNotifs = await adminNotifRes.Content.ReadFromJsonAsync<List<NotificationResponse>>();
        Assert.NotNull(adminNotifs);
        Assert.Contains(adminNotifs, n => n.Type == "AppointmentCreated" && n.AppointmentId == booking.Id);

        // Verify Database entries directly: Email notifications and Reminders
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var emailNotifs = await db.Notifications
            .Where(n => n.AppointmentId == booking.Id && n.Channel == "Email")
            .ToListAsync();
        Assert.NotEmpty(emailNotifs);

        var reminders = await db.AppointmentReminders
            .Where(r => r.AppointmentId == booking.Id)
            .ToListAsync();
        Assert.NotEmpty(reminders);
        Assert.Contains(reminders, r => r.ReminderType == "24Hours" && r.Status == "Pending");
        Assert.Contains(reminders, r => r.ReminderType == "2Hours" && r.Status == "Pending");
    }

    [Fact]
    public async Task CancellingAppointment_DispatchesCancellationNotifications_AndSkipsPendingReminders()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, custId) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Hot Stone Massage", 60, 1500.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Therapist Paul");

        var startUtc = GetNextWeekdayUtc(DayOfWeek.Tuesday, 14, 0);

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = startUtc
        };

        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        bookRes.EnsureSuccessStatusCode();
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        // Cancel appointment
        var cancelReq = new CancelAppointmentRequest { Reason = "Emergency out of town" };
        using var cancelMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking.Id}/cancel")
        {
            Content = JsonContent.Create(cancelReq)
        };
        cancelMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var cancelRes = await _client.SendAsync(cancelMsg);
        Assert.Equal(HttpStatusCode.OK, cancelRes.StatusCode);

        // Verify Customer Cancellation Notification
        using var custNotifMsg = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/my");
        custNotifMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var custNotifRes = await _client.SendAsync(custNotifMsg);
        var custNotifs = await custNotifRes.Content.ReadFromJsonAsync<List<NotificationResponse>>();
        Assert.NotNull(custNotifs);
        Assert.Contains(custNotifs, n => n.Type == "AppointmentCancelled" && n.AppointmentId == booking.Id);

        // Verify Pending Reminders are marked Skipped in database
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var reminders = await db.AppointmentReminders
            .Where(r => r.AppointmentId == booking.Id)
            .ToListAsync();
        Assert.NotEmpty(reminders);
        Assert.All(reminders, r => Assert.Equal("Skipped", r.Status));
    }

    [Fact]
    public async Task ReminderWorker_ProcessesDuePendingReminders_AndGeneratesNotifications()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, custId) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Deep Conditioning", 30, 450.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Stylist Gina");

        var startUtc = GetNextWeekdayUtc(DayOfWeek.Wednesday, 15, 0);

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = startUtc
        };

        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        bookRes.EnsureSuccessStatusCode();
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        // Manually adjust one reminder to be due in the past
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var reminder = await db.AppointmentReminders
                .FirstAsync(r => r.AppointmentId == booking.Id && r.ReminderType == "24Hours");

            reminder.ScheduledForUtc = DateTime.UtcNow.AddMinutes(-5);
            await db.SaveChangesAsync();
        }

        // Run worker processing
        using (var scope = _factory.Services.CreateScope())
        {
            var worker = new AppointmentReminderWorker(
                scope.ServiceProvider.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<AppointmentReminderWorker>.Instance);

            var processedCount = await worker.ProcessDueRemindersAsync();
            Assert.True(processedCount >= 1);
        }

        // Verify reminder is now Processed and notification was sent
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var reminder = await db.AppointmentReminders
                .FirstAsync(r => r.AppointmentId == booking.Id && r.ReminderType == "24Hours");

            Assert.Equal("Processed", reminder.Status);
            Assert.NotNull(reminder.ProcessedAtUtc);

            var reminderNotif = await db.Notifications
                .FirstOrDefaultAsync(n => n.AppointmentId == booking.Id && n.Type == "AppointmentReminder24H" && n.RecipientUserId == custId);
            Assert.NotNull(reminderNotif);
        }
    }

    [Fact]
    public async Task CustomerNotificationsApi_UnreadCount_And_MarkAsRead_Operations()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Beard Trim Deluxe", 30, 400.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Barber Jack");

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Thursday, 16, 0)
        };

        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        bookRes.EnsureSuccessStatusCode();

        // 1. Check unread count
        using var countMsg = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/unread-count");
        countMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var countRes = await _client.SendAsync(countMsg);
        Assert.Equal(HttpStatusCode.OK, countRes.StatusCode);
        var unread = await countRes.Content.ReadFromJsonAsync<UnreadNotificationCountResponse>();
        Assert.NotNull(unread);
        Assert.True(unread.UnreadCount > 0);

        // 2. Retrieve notification ID
        using var notifMsg = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/my?unreadOnly=true");
        notifMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var notifRes = await _client.SendAsync(notifMsg);
        var notifs = await notifRes.Content.ReadFromJsonAsync<List<NotificationResponse>>();
        Assert.NotNull(notifs);
        Assert.NotEmpty(notifs);

        var targetNotifId = notifs.First().Id;

        // 3. Mark single notification as read
        using var readSingleMsg = new HttpRequestMessage(HttpMethod.Patch, $"/api/notifications/{targetNotifId}/read");
        readSingleMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var readSingleRes = await _client.SendAsync(readSingleMsg);
        Assert.Equal(HttpStatusCode.NoContent, readSingleRes.StatusCode);

        // 4. Mark all notifications as read
        using var readAllMsg = new HttpRequestMessage(HttpMethod.Post, "/api/notifications/read-all");
        readAllMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var readAllRes = await _client.SendAsync(readAllMsg);
        Assert.Equal(HttpStatusCode.OK, readAllRes.StatusCode);
        var markAllResult = await readAllRes.Content.ReadFromJsonAsync<MarkAllNotificationsReadResponse>();
        Assert.NotNull(markAllResult);

        // 5. Unread count should now be 0
        using var finalCountMsg = new HttpRequestMessage(HttpMethod.Get, "/api/notifications/unread-count");
        finalCountMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var finalCountRes = await _client.SendAsync(finalCountMsg);
        var finalUnread = await finalCountRes.Content.ReadFromJsonAsync<UnreadNotificationCountResponse>();
        Assert.NotNull(finalUnread);
        Assert.Equal(0, finalUnread.UnreadCount);
    }

    [Fact]
    public async Task AdminNotificationsApi_UnreadCount_And_MarkAsRead_And_TenantIsolation()
    {
        var (adminTokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (adminTokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceIdA, _) = await CreateServiceAsync(adminTokenA, "Express Manicure", 30, 300.00m);
        var staffIdA = await CreateStaffWithScheduleAsync(adminTokenA, "Staff Maria");

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonIdA,
            ServiceId = serviceIdA,
            StaffId = staffIdA,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Friday, 11, 0)
        };

        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        bookRes.EnsureSuccessStatusCode();

        // Admin A should have notifications
        using var adminAMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/notifications");
        adminAMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenA);
        var adminARes = await _client.SendAsync(adminAMsg);
        Assert.Equal(HttpStatusCode.OK, adminARes.StatusCode);
        var notifsA = await adminARes.Content.ReadFromJsonAsync<List<NotificationResponse>>();
        Assert.NotNull(notifsA);
        Assert.NotEmpty(notifsA);

        var notifAId = notifsA.First().Id;

        // Admin B should NOT have notifications from Salon A
        using var adminBMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/notifications");
        adminBMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenB);
        var adminBRes = await _client.SendAsync(adminBMsg);
        Assert.Equal(HttpStatusCode.OK, adminBRes.StatusCode);
        var notifsB = await adminBRes.Content.ReadFromJsonAsync<List<NotificationResponse>>();
        Assert.NotNull(notifsB);
        Assert.DoesNotContain(notifsB, n => n.Id == notifAId);

        // Admin B cannot mark Admin A's notification as read -> 404
        using var badReadMsg = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/notifications/{notifAId}/read");
        badReadMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenB);
        var badReadRes = await _client.SendAsync(badReadMsg);
        Assert.Equal(HttpStatusCode.NotFound, badReadRes.StatusCode);

        // Admin A can mark all as read
        using var readAllMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/notifications/read-all");
        readAllMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenA);
        var readAllRes = await _client.SendAsync(readAllMsg);
        Assert.Equal(HttpStatusCode.OK, readAllRes.StatusCode);
    }
}

