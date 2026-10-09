using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class StaffAndAvailabilityIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public StaffAndAvailabilityIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Urban Cuts {suffix}",
            BusinessType = "Barber",
            FullName = $"Manager {suffix}",
            Email = $"manager_{suffix}@salonbook.com",
            Password = "SecurePassword123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/admin/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        Assert.NotNull(authRes.User.SalonId);

        return (authRes.AccessToken, authRes.User.SalonId.Value, authRes.User.SalonSlug ?? "");
    }

    private async Task<string> RegisterCustomerAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterUserRequest
        {
            FullName = $"Customer {suffix}",
            Email = $"cust_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return authRes.AccessToken;
    }

    [Fact]
    public async Task Admin_CanCreateListUpdateAndActivateDeactivateStaff()
    {
        var (token, salonId, _) = await RegisterSalonAndAdminAsync();

        // 1. Create Staff
        var createReq = new CreateStaffRequest
        {
            FullName = "John Barber",
            Email = "john.barber@example.com",
            PhoneNumber = "+919876543210",
            Title = "Master Stylist",
            IsActive = true
        };

        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createMsg);

        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(created);
        Assert.Equal("John Barber", created.FullName);
        Assert.Equal(salonId, created.SalonId);
        Assert.NotEmpty(created.Schedules); // Default schedule populated

        var staffId = created.Id;

        // 2. Get Staff by ID
        using var getMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/staff/{staffId}");
        getMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getRes = await _client.SendAsync(getMsg);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var fetched = await getRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(fetched);
        Assert.Equal(staffId, fetched.Id);

        // 3. Update Staff
        var updateReq = new UpdateStaffRequest
        {
            FullName = "Johnathan Barber Sr.",
            Email = "johnathan@example.com",
            PhoneNumber = "+919876543299",
            Title = "Lead Barber",
            IsActive = true
        };
        using var putMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/staff/{staffId}")
        {
            Content = JsonContent.Create(updateReq)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putRes = await _client.SendAsync(putMsg);
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updated = await putRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Johnathan Barber Sr.", updated.FullName);
        Assert.Equal("Lead Barber", updated.Title);

        // 4. Update Status (Deactivate)
        using var patchMsg = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/staff/{staffId}/status")
        {
            Content = JsonContent.Create(new UpdateStaffStatusRequest { IsActive = false })
        };
        patchMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var patchRes = await _client.SendAsync(patchMsg);
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);
        var deactivated = await patchRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(deactivated);
        Assert.False(deactivated.IsActive);

        // 5. List Staff
        using var listMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/staff?search=Johnathan");
        listMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var listRes = await _client.SendAsync(listMsg);
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var paged = await listRes.Content.ReadFromJsonAsync<PagedResult<StaffResponse>>();
        Assert.NotNull(paged);
        Assert.Contains(paged.Items, s => s.Id == staffId);

        // 6. Delete Staff
        using var delMsg = new HttpRequestMessage(HttpMethod.Delete, $"/api/admin/staff/{staffId}");
        delMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var delRes = await _client.SendAsync(delMsg);
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        // Verify deleted
        using var getAfterDel = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/staff/{staffId}");
        getAfterDel.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getAfterDelRes = await _client.SendAsync(getAfterDel);
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelRes.StatusCode);
    }

    [Fact]
    public async Task Admin_CanUpdateStaffSchedule_WithValidBreaks()
    {
        var (token, _, _) = await RegisterSalonAndAdminAsync();

        // Create staff
        var createReq = new CreateStaffRequest { FullName = "Alice Stylist" };
        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createMsg);
        createRes.EnsureSuccessStatusCode();
        var staff = await createRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staff);

        // Update schedule with custom working hours and lunch break
        var scheduleReq = new UpdateStaffScheduleRequest
        {
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    IsWorkingDay = true,
                    StartTime = "10:00",
                    EndTime = "19:00",
                    Breaks = new List<StaffBreakDTO>
                    {
                        new() { StartTime = "13:30", EndTime = "14:30", Title = "Lunch" },
                        new() { StartTime = "16:30", EndTime = "17:00", Title = "Tea Break" }
                    }
                },
                new()
                {
                    DayOfWeek = DayOfWeek.Tuesday,
                    IsWorkingDay = false,
                    StartTime = "09:00",
                    EndTime = "18:00"
                }
            }
        };

        using var putSchedMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/staff/{staff.Id}/schedule")
        {
            Content = JsonContent.Create(scheduleReq)
        };
        putSchedMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putSchedRes = await _client.SendAsync(putSchedMsg);

        Assert.Equal(HttpStatusCode.OK, putSchedRes.StatusCode);
        var updatedSchedule = await putSchedRes.Content.ReadFromJsonAsync<List<StaffDayScheduleResponse>>();
        Assert.NotNull(updatedSchedule);
        var monday = updatedSchedule.FirstOrDefault(s => s.DayOfWeek == DayOfWeek.Monday);
        Assert.NotNull(monday);
        Assert.True(monday.IsWorkingDay);
        Assert.Equal("10:00", monday.StartTime);
        Assert.Equal("19:00", monday.EndTime);
        Assert.Equal(2, monday.Breaks.Count);
    }

    [Fact]
    public async Task ScheduleValidation_RejectsInvalidTimes_OverlappingBreaks_AndBreaksOutsideWorkingHours()
    {
        var (token, _, _) = await RegisterSalonAndAdminAsync();

        var createReq = new CreateStaffRequest { FullName = "Bob Stylist" };
        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createMsg);
        createRes.EnsureSuccessStatusCode();
        var staff = await createRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staff);

        // 1. Start time >= End time
        var invalidTimesReq = new UpdateStaffScheduleRequest
        {
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    IsWorkingDay = true,
                    StartTime = "18:00",
                    EndTime = "09:00" // End before Start
                }
            }
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/staff/{staff.Id}/schedule")
        {
            Content = JsonContent.Create(invalidTimesReq)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.BadRequest, res1.StatusCode);

        // 2. Break outside working hours
        var breakOutsideReq = new UpdateStaffScheduleRequest
        {
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "17:00",
                    Breaks = new List<StaffBreakDTO>
                    {
                        new() { StartTime = "17:00", EndTime = "18:00", Title = "Late Break" } // past 17:00
                    }
                }
            }
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/staff/{staff.Id}/schedule")
        {
            Content = JsonContent.Create(breakOutsideReq)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);

        // 3. Overlapping breaks
        var overlappingBreaksReq = new UpdateStaffScheduleRequest
        {
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
                        new() { StartTime = "13:00", EndTime = "14:00" },
                        new() { StartTime = "13:30", EndTime = "14:30" } // Overlaps 13:00-14:00
                    }
                }
            }
        };
        using var msg3 = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/staff/{staff.Id}/schedule")
        {
            Content = JsonContent.Create(overlappingBreaksReq)
        };
        msg3.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res3 = await _client.SendAsync(msg3);
        Assert.Equal(HttpStatusCode.BadRequest, res3.StatusCode);
    }

    [Fact]
    public async Task CrossTenant_And_RoleSecurity_EnforcesStrictIsolation()
    {
        var (tokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (tokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();
        var customerToken = await RegisterCustomerAsync();

        // Admin A creates staff
        var createReq = new CreateStaffRequest { FullName = "Exclusive Stylist A" };
        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var createRes = await _client.SendAsync(createMsg);
        createRes.EnsureSuccessStatusCode();
        var staffA = await createRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staffA);

        // Admin B attempts GET staff A -> 404
        using var getMsgB = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/staff/{staffA.Id}");
        getMsgB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var getResB = await _client.SendAsync(getMsgB);
        Assert.Equal(HttpStatusCode.NotFound, getResB.StatusCode);

        // Admin B attempts PUT staff A -> 404
        using var putMsgB = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/staff/{staffA.Id}")
        {
            Content = JsonContent.Create(new UpdateStaffRequest { FullName = "Hacked Staff" })
        };
        putMsgB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var putResB = await _client.SendAsync(putMsgB);
        Assert.Equal(HttpStatusCode.NotFound, putResB.StatusCode);

        // Customer attempts GET /api/admin/staff -> 403 Forbidden
        using var custMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/staff");
        custMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var custRes = await _client.SendAsync(custMsg);
        Assert.Equal(HttpStatusCode.Forbidden, custRes.StatusCode);
    }

    [Fact]
    public async Task PublicAvailability_CalculatesAccurateSlots_ExcludesBreaks_AndFiltersInactiveStaffAndServices()
    {
        var (token, salonId, slug) = await RegisterSalonAndAdminAsync();

        // 1. Create an active 30-min Service
        var serviceReq = new CreateServiceRequest
        {
            Name = "Precision Haircut",
            Category = "Hair",
            Price = 400.00m,
            DurationMinutes = 30,
            IsActive = true
        };
        using var svcMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(serviceReq)
        };
        svcMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var svcRes = await _client.SendAsync(svcMsg);
        svcRes.EnsureSuccessStatusCode();
        var service = await svcRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(service);

        // 2. Create Staff with 09:00 - 12:00 schedule and 10:00 - 10:30 break on a future Monday
        var futureMonday = DateTime.UtcNow.AddDays(7);
        while (futureMonday.DayOfWeek != DayOfWeek.Monday)
        {
            futureMonday = futureMonday.AddDays(1);
        }
        var targetDateStr = futureMonday.ToString("yyyy-MM-dd");

        var createStaffReq = new CreateStaffRequest
        {
            FullName = "David Barber",
            IsActive = true,
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new()
                {
                    DayOfWeek = DayOfWeek.Monday,
                    IsWorkingDay = true,
                    StartTime = "09:00",
                    EndTime = "12:00",
                    Breaks = new List<StaffBreakDTO>
                    {
                        new() { StartTime = "10:00", EndTime = "10:30", Title = "Morning Break" }
                    }
                }
            }
        };
        using var staffMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(createStaffReq)
        };
        staffMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var staffRes = await _client.SendAsync(staffMsg);
        staffRes.EnsureSuccessStatusCode();
        var staff = await staffRes.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staff);

        // 3. Query Public Availability for that Monday
        var availRes = await _client.GetAsync($"/api/salons/{slug}/availability?serviceId={service.Id}&date={targetDateStr}");
        Assert.Equal(HttpStatusCode.OK, availRes.StatusCode);
        var avail = await availRes.Content.ReadFromJsonAsync<SalonAvailabilityResponse>();

        Assert.NotNull(avail);
        Assert.Equal(targetDateStr, avail.Date);
        Assert.Equal(service.Id, avail.ServiceId);
        Assert.NotEmpty(avail.Slots);

        // Expected slots: 09:00-09:30, 09:15-09:45, 09:30-10:00, (10:00-10:30 is break -> excluded), 10:30-11:00, 10:45-11:15, 11:00-11:30, 11:15-11:45, 11:30-12:00.
        // Verify 10:00 slot that overlaps break is NOT present
        Assert.DoesNotContain(avail.Slots, s => s.StartTime == "10:00" || s.StartTime == "10:15");
        Assert.Contains(avail.Slots, s => s.StartTime == "09:00");
        Assert.Contains(avail.Slots, s => s.StartTime == "10:30");

        // 4. Inactive service -> 404
        // Deactivate service
        using var deactSvcMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/services/{service.Id}")
        {
            Content = JsonContent.Create(new UpdateServiceRequest
            {
                Name = "Precision Haircut",
                Category = "Hair",
                Price = 400.00m,
                DurationMinutes = 30,
                IsActive = false // Inactive
            })
        };
        deactSvcMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var deactSvcRes = await _client.SendAsync(deactSvcMsg);
        deactSvcRes.EnsureSuccessStatusCode();

        var inactAvailRes = await _client.GetAsync($"/api/salons/{slug}/availability?serviceId={service.Id}&date={targetDateStr}");
        Assert.Equal(HttpStatusCode.NotFound, inactAvailRes.StatusCode);
    }
}

