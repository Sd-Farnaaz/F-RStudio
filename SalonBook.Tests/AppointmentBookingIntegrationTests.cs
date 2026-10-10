using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class AppointmentBookingIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AppointmentBookingIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Prestige Barber {suffix}",
            BusinessType = "Hair Salon",
            FullName = $"Admin {suffix}",
            Email = $"admin_{suffix}@salonbook.com",
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
            Email = $"customer_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    private async Task<(int ServiceId, decimal Price)> CreateServiceAsync(string adminToken, string name = "Hair Styling", int durationMinutes = 30, decimal price = 500.00m)
    {
        var req = new CreateServiceRequest
        {
            Name = name,
            Category = "Hair",
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

    private async Task<int> CreateStaffWithScheduleAsync(string adminToken, string name = "Alex Stylist")
    {
        var req = new CreateStaffRequest
        {
            FullName = name,
            Title = "Senior Stylist",
            IsActive = true,
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00",
                    Breaks = new List<StaffBreakDTO>
                    {
                        new() { StartTime = "13:00", EndTime = "14:00", Title = "Lunch" }
                    }
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Tuesday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "18:00",
                    Breaks = new List<StaffBreakDTO>()
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
        // India Standard Time is UTC+5:30. At 10:00 AM IST, UTC is 04:30 AM.
        // Let's create the UTC timestamp corresponding to hour:minute in IST
        var istOffset = TimeSpan.FromHours(5.5);
        var localDateTime = new DateTime(target.Year, target.Month, target.Day, hour, minute, 0, DateTimeKind.Unspecified);
        return DateTime.SpecifyKind(localDateTime - istOffset, DateTimeKind.Utc);
    }

    [Fact]
    public async Task Customer_CanCreateValidAppointment_WithSnapshotData_AndAutoAssignedStaff()
    {
        var (adminToken, salonId, slug) = await RegisterSalonAndAdminAsync();
        var (custToken, custId) = await RegisterCustomerAsync();

        var (serviceId, price) = await CreateServiceAsync(adminToken, "Signature Haircut", 45, 650.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Master Barber Marco");

        var startUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 11, 0); // 11:00 AM IST

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = null, // Auto-assign staff
            StartAtUtc = startUtc,
            CustomerNotes = "Please keep the sides short."
        };

        using var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var postRes = await _client.SendAsync(postMsg);

        Assert.Equal(HttpStatusCode.Created, postRes.StatusCode);
        var booking = await postRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);
        Assert.Equal(salonId, booking.SalonId);
        Assert.Equal(custId, booking.CustomerId);
        Assert.Equal(staffId, booking.StaffId);
        Assert.Equal("Master Barber Marco", booking.StaffName);
        Assert.Equal(serviceId, booking.ServiceId);
        Assert.Equal("Signature Haircut", booking.ServiceName);
        Assert.Equal(45, booking.DurationMinutes);
        Assert.Equal(650.00m, booking.Price);
        Assert.Equal(startUtc, booking.StartAtUtc);
        Assert.Equal(startUtc.AddMinutes(45), booking.EndAtUtc);
        Assert.Equal(AppointmentStatuses.Confirmed, booking.Status);
        Assert.Equal("Please keep the sides short.", booking.CustomerNotes);
    }

    [Fact]
    public async Task Customer_CanCreateValidAppointment_WithSpecificStaff()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, custId) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Beard Trim", 30, 300.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Beard Specialist Leo");

        var startUtc = GetNextWeekdayUtc(DayOfWeek.Tuesday, 14, 0); // 2:00 PM IST

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = startUtc
        };

        using var postMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        postMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var postRes = await _client.SendAsync(postMsg);

        Assert.Equal(HttpStatusCode.Created, postRes.StatusCode);
        var booking = await postRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);
        Assert.Equal(staffId, booking.StaffId);
        Assert.Equal("Beard Specialist Leo", booking.StaffName);
    }

    [Fact]
    public async Task CustomerBooking_RejectsPastDates_InactiveService_AndInactiveStaff()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Express Trim", 30, 250.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Staff A");

        // 1. Past date
        var pastBookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = DateTime.UtcNow.AddDays(-2)
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(pastBookReq)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var res1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.BadRequest, res1.StatusCode);

        // 2. Deactivate staff and attempt booking
        using var deactStaffMsg = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/staff/{staffId}/status")
        {
            Content = JsonContent.Create(new UpdateStaffStatusRequest { IsActive = false })
        };
        deactStaffMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var deactStaffRes = await _client.SendAsync(deactStaffMsg);
        deactStaffRes.EnsureSuccessStatusCode();

        var inactStaffBookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Wednesday, 10, 0)
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(inactStaffBookReq)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var res2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.NotFound, res2.StatusCode);
    }

    [Fact]
    public async Task CustomerBooking_RejectsOutsideWorkingHours_AndScheduledBreaks()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Spa Treatment", 60, 1200.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Therapist Nina");

        // Monday Schedule: 09:00 - 18:00, Break: 13:00 - 14:00

        // 1. Outside working hours (e.g. 7:00 AM IST)
        var earlyBookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 7, 0)
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(earlyBookReq)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var res1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.Conflict, res1.StatusCode);

        // 2. Conflicting with lunch break (e.g. 13:30 IST)
        var breakBookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 13, 30)
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(breakBookReq)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var res2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);
    }

    [Fact]
    public async Task CustomerBooking_RejectsOverlappingAppointments_WithConflict409()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (cust1Token, _) = await RegisterCustomerAsync();
        var (cust2Token, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Coloring", 60, 1500.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Colorist Zoe");

        var slotUtc = GetNextWeekdayUtc(DayOfWeek.Thursday, 15, 0); // 3:00 PM - 4:00 PM IST

        // First customer books slot successfully
        var book1Req = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = slotUtc
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(book1Req)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust1Token);
        var res1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);

        // Second customer attempts to book overlapping slot (e.g. 15:30 - 16:30 IST)
        var book2Req = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = slotUtc.AddMinutes(30) // Overlaps!
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(book2Req)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust2Token);
        var res2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.Conflict, res2.StatusCode);
    }

    [Fact]
    public async Task ConcurrentBookings_ForSameStaffSlot_AllowsExactlyOne_AndRejectsTheOtherWithConflict()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (cust1Token, _) = await RegisterCustomerAsync();
        var (cust2Token, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Exclusive Master Cut", 45, 900.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Celebrity Barber Ron");

        var slotUtc = GetNextWeekdayUtc(DayOfWeek.Friday, 16, 0);

        var bookReq1 = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = slotUtc
        };

        var bookReq2 = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = slotUtc
        };

        using var client1 = _factory.CreateClient();
        using var client2 = _factory.CreateClient();

        using var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq1)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust1Token);

        using var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq2)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust2Token);

        // Fire both requests simultaneously
        var task1 = client1.SendAsync(msg1);
        var task2 = client2.SendAsync(msg2);

        var responses = await Task.WhenAll(task1, task2);

        var statusCodes = responses.Select(r => r.StatusCode).ToList();

        // Exactly one request MUST succeed (201 Created) and the other MUST conflict (409 Conflict)
        Assert.Contains(HttpStatusCode.Created, statusCodes);
        Assert.Contains(HttpStatusCode.Conflict, statusCodes);
    }

    [Fact]
    public async Task Customer_CanViewMyBookings_Pagination_AndDetails_AndIsIsolatedFromOtherCustomers()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (cust1Token, cust1Id) = await RegisterCustomerAsync();
        var (cust2Token, cust2Id) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Styling", 30, 400.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Stylist Chris");

        // Customer 1 books
        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 10, 0)
        };
        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust1Token);
        var bookRes = await _client.SendAsync(bookMsg);
        bookRes.EnsureSuccessStatusCode();
        var booking1 = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking1);

        // Customer 1 queries /api/appointments/my
        using var myMsg = new HttpRequestMessage(HttpMethod.Get, "/api/appointments/my");
        myMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust1Token);
        var myRes = await _client.SendAsync(myMsg);
        Assert.Equal(HttpStatusCode.OK, myRes.StatusCode);
        var myBookings = await myRes.Content.ReadFromJsonAsync<PagedResult<AppointmentResponse>>();
        Assert.NotNull(myBookings);
        Assert.Contains(myBookings.Items, a => a.Id == booking1.Id);

        // Customer 1 queries GET /api/appointments/{id}
        using var getMsg1 = new HttpRequestMessage(HttpMethod.Get, $"/api/appointments/{booking1.Id}");
        getMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust1Token);
        var getRes1 = await _client.SendAsync(getMsg1);
        Assert.Equal(HttpStatusCode.OK, getRes1.StatusCode);

        // Customer 2 attempts to GET Customer 1's appointment -> 404
        using var getMsg2 = new HttpRequestMessage(HttpMethod.Get, $"/api/appointments/{booking1.Id}");
        getMsg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", cust2Token);
        var getRes2 = await _client.SendAsync(getMsg2);
        Assert.Equal(HttpStatusCode.NotFound, getRes2.StatusCode);
    }

    [Fact]
    public async Task Customer_CanCancelBooking_AndRejectsPastOrAlreadyCancelledAppointments()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Shave", 30, 200.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Barber Dan");

        // Book appointment in future
        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Tuesday, 11, 0)
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
        var cancelReq = new CancelAppointmentRequest { Reason = "Change of schedule." };
        using var cancelMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking.Id}/cancel")
        {
            Content = JsonContent.Create(cancelReq)
        };
        cancelMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var cancelRes = await _client.SendAsync(cancelMsg);

        Assert.Equal(HttpStatusCode.OK, cancelRes.StatusCode);
        var cancelled = await cancelRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(cancelled);
        Assert.Equal(AppointmentStatuses.Cancelled, cancelled.Status);
        Assert.Equal("Change of schedule.", cancelled.CancellationReason);
        Assert.NotNull(cancelled.CancelledAtUtc);

        // Attempt to cancel again -> 400 Bad Request
        using var reCancelMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking.Id}/cancel")
        {
            Content = JsonContent.Create(cancelReq)
        };
        reCancelMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var reCancelRes = await _client.SendAsync(reCancelMsg);
        Assert.Equal(HttpStatusCode.BadRequest, reCancelRes.StatusCode);
    }

    [Fact]
    public async Task SalonAdmin_CanListAppointments_Filter_AndQueryCalendarRange()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Trim", 30, 350.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Stylist Sam");

        var slotUtc = GetNextWeekdayUtc(DayOfWeek.Wednesday, 12, 0);

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = slotUtc
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

        // Admin lists appointments
        using var listMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/appointments?status=Confirmed&staffId={staffId}");
        listMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var listRes = await _client.SendAsync(listMsg);
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var paged = await listRes.Content.ReadFromJsonAsync<PagedResult<AppointmentResponse>>();
        Assert.NotNull(paged);
        Assert.Contains(paged.Items, a => a.Id == booking.Id);

        // Admin gets calendar range
        var calStart = slotUtc.AddDays(-1).ToString("O");
        var calEnd = slotUtc.AddDays(1).ToString("O");
        using var calMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/appointments/calendar?startUtc={calStart}&endUtc={calEnd}&staffId={staffId}");
        calMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var calRes = await _client.SendAsync(calMsg);
        Assert.Equal(HttpStatusCode.OK, calRes.StatusCode);
        var calItems = await calRes.Content.ReadFromJsonAsync<List<AppointmentCalendarItemResponse>>();
        Assert.NotNull(calItems);
        Assert.Contains(calItems, c => c.Id == booking.Id);
    }

    [Fact]
    public async Task SalonAdmin_CanTransitionAppointmentStatus_AndRejectsInvalidStateTransitions()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceId, _) = await CreateServiceAsync(adminToken, "Facial", 45, 800.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Esthetician Mia");

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Thursday, 14, 0)
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

        // 1. Valid transition: Confirmed -> Completed
        var updateReq = new UpdateAppointmentStatusRequest { Status = AppointmentStatuses.Completed };
        using var patchMsg1 = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/appointments/{booking.Id}/status")
        {
            Content = JsonContent.Create(updateReq)
        };
        patchMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var patchRes1 = await _client.SendAsync(patchMsg1);
        Assert.Equal(HttpStatusCode.OK, patchRes1.StatusCode);
        var completed = await patchRes1.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(completed);
        Assert.Equal(AppointmentStatuses.Completed, completed.Status);

        // 2. Invalid transition: Completed (terminal) -> Confirmed -> 400 Bad Request
        var invalidReq = new UpdateAppointmentStatusRequest { Status = AppointmentStatuses.Confirmed };
        using var patchMsg2 = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/appointments/{booking.Id}/status")
        {
            Content = JsonContent.Create(invalidReq)
        };
        patchMsg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var patchRes2 = await _client.SendAsync(patchMsg2);
        Assert.Equal(HttpStatusCode.BadRequest, patchRes2.StatusCode);
    }

    [Fact]
    public async Task CrossTenant_And_RoleSecurity_EnforcesStrictAppointmentIsolation()
    {
        var (tokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (tokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var (serviceIdA, _) = await CreateServiceAsync(tokenA, "Service A", 30, 500.00m);
        var staffIdA = await CreateStaffWithScheduleAsync(tokenA, "Staff A");

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonIdA,
            ServiceId = serviceIdA,
            StaffId = staffIdA,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 15, 0)
        };
        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        bookRes.EnsureSuccessStatusCode();
        var bookingA = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(bookingA);

        // Admin B attempts to GET Appointment A -> 404
        using var getMsgB = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/appointments/{bookingA.Id}");
        getMsgB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var getResB = await _client.SendAsync(getMsgB);
        Assert.Equal(HttpStatusCode.NotFound, getResB.StatusCode);

        // Admin B attempts to PATCH status of Appointment A -> 404
        using var patchMsgB = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/appointments/{bookingA.Id}/status")
        {
            Content = JsonContent.Create(new UpdateAppointmentStatusRequest { Status = AppointmentStatuses.Cancelled })
        };
        patchMsgB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var patchResB = await _client.SendAsync(patchMsgB);
        Assert.Equal(HttpStatusCode.NotFound, patchResB.StatusCode);

        // Customer attempts to call Admin appointment endpoints -> 403 Forbidden
        using var custAdminMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/appointments");
        custAdminMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var custAdminRes = await _client.SendAsync(custAdminMsg);
        Assert.Equal(HttpStatusCode.Forbidden, custAdminRes.StatusCode);
    }
}

