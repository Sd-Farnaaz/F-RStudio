using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class ServiceImageAndDashboardAnalyticsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ServiceImageAndDashboardAnalyticsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Analytics Salon {suffix}",
            BusinessType = "Hair & Spa",
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

    private static byte[] CreateValidPngBytes(int size = 100)
    {
        var pngSignature = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
        var totalSize = Math.Max(size, pngSignature.Length);
        var bytes = new byte[totalSize];
        Array.Copy(pngSignature, bytes, pngSignature.Length);
        return bytes;
    }

    #region Part A: Service Image Management Tests

    [Fact]
    public async Task ServiceImage_UploadValidPng_Succeeds_AndExposesPublicly()
    {
        var (adminToken, salonId, slug) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Create a service
        var createServiceReq = new CreateServiceRequest
        {
            Name = "Luxury Haircut",
            Category = "Haircare",
            Price = 1500m,
            DurationMinutes = 45
        };
        var createRes = await _client.PostAsJsonAsync("/api/admin/services", createServiceReq);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createdService = await createRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(createdService);

        // 2. Upload service image
        var pngBytes = CreateValidPngBytes(256);
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "file", "service-photo.png");

        var uploadRes = await _client.PostAsync($"/api/admin/services/{createdService.Id}/image", content);
        Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
        var updatedService = await uploadRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(updatedService);
        Assert.NotNull(updatedService.ImageUrl);
        Assert.StartsWith($"/uploads/salons/{salonId}/services/{createdService.Id}/", updatedService.ImageUrl);

        // 3. Verify public service catalog includes ImageUrl
        _client.DefaultRequestHeaders.Authorization = null;
        var publicServicesRes = await _client.GetAsync($"/api/salons/{slug}/services");
        Assert.Equal(HttpStatusCode.OK, publicServicesRes.StatusCode);
        var publicList = await publicServicesRes.Content.ReadFromJsonAsync<PagedResult<PublicServiceResponse>>();
        Assert.NotNull(publicList);
        var publicItem = publicList.Items.FirstOrDefault(s => s.Id == createdService.Id);
        Assert.NotNull(publicItem);
        Assert.Equal(updatedService.ImageUrl, publicItem.ImageUrl);
    }

    [Fact]
    public async Task ServiceImage_SpoofedExtension_FailsValidation()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var createRes = await _client.PostAsJsonAsync("/api/admin/services", new CreateServiceRequest
        {
            Name = "Beard Trim",
            Category = "Grooming",
            Price = 500m,
            DurationMinutes = 20
        });
        var service = await createRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(service);

        // Fake image
        var fakeBytes = System.Text.Encoding.UTF8.GetBytes("not an image binary file");
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fakeBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "file", "fake.png");

        var uploadRes = await _client.PostAsync($"/api/admin/services/{service.Id}/image", content);
        Assert.Equal(HttpStatusCode.BadRequest, uploadRes.StatusCode);
    }

    [Fact]
    public async Task ServiceImage_Delete_ClearsImageUrl()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var createRes = await _client.PostAsJsonAsync("/api/admin/services", new CreateServiceRequest
        {
            Name = "Facial",
            Category = "Skincare",
            Price = 2000m,
            DurationMinutes = 60
        });
        var service = await createRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(service);

        // Upload
        using (var content = new MultipartFormDataContent())
        {
            var fileContent = new ByteArrayContent(CreateValidPngBytes(200));
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            content.Add(fileContent, "file", "facial.png");
            var uploadRes = await _client.PostAsync($"/api/admin/services/{service.Id}/image", content);
            Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
        }

        // Delete Image
        var deleteRes = await _client.DeleteAsync($"/api/admin/services/{service.Id}/image");
        Assert.Equal(HttpStatusCode.OK, deleteRes.StatusCode);
        var updated = await deleteRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(updated);
        Assert.Null(updated.ImageUrl);
    }

    [Fact]
    public async Task ServiceImage_CrossTenantAccess_ForbiddenOrNotFound()
    {
        var (adminTokenA, _, _) = await RegisterSalonAndAdminAsync();
        var (adminTokenB, _, _) = await RegisterSalonAndAdminAsync();

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenA);
        var createRes = await _client.PostAsJsonAsync("/api/admin/services", new CreateServiceRequest
        {
            Name = "Salon A Service",
            Category = "Special",
            Price = 1000m,
            DurationMinutes = 30
        });
        var serviceA = await createRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(serviceA);

        // Admin B attempts to upload image for Salon A's service
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenB);
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(CreateValidPngBytes(200));
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "file", "hacked.png");

        var crossUploadRes = await _client.PostAsync($"/api/admin/services/{serviceA.Id}/image", content);
        Assert.Equal(HttpStatusCode.NotFound, crossUploadRes.StatusCode);
    }

    #endregion

    #region Part B: Real Dashboard Analytics Tests

    [Fact]
    public async Task DashboardAnalytics_ReturnsAccurateMetricsAndFinancials()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (_, customerId1) = await RegisterCustomerAsync();
        var (_, customerId2) = await RegisterCustomerAsync();

        // Seed data in db directly for controlled test assertions
        int service1Id, service2Id, staffId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var staff = new Staff
            {
                SalonId = salonId,
                FullName = "Expert Stylist",
                IsActive = true
            };
            db.Staff.Add(staff);

            var s1 = new Service
            {
                SalonId = salonId,
                Name = "Signature Haircut",
                Category = "Haircare",
                Price = 1000m,
                DurationMinutes = 30,
                IsActive = true
            };
            var s2 = new Service
            {
                SalonId = salonId,
                Name = "Spa Pedicure",
                Category = "Nails",
                Price = 1500m,
                DurationMinutes = 45,
                IsActive = true
            };
            db.Services.AddRange(s1, s2);
            await db.SaveChangesAsync();

            staffId = staff.Id;
            service1Id = s1.Id;
            service2Id = s2.Id;

            var baseTime = DateTime.UtcNow.Date.AddHours(10);

            // Appointment 1: Completed, Paid 1000, Verified
            db.Appointments.Add(new Appointment
            {
                SalonId = salonId,
                CustomerId = customerId1,
                StaffId = staffId,
                ServiceId = service1Id,
                ServiceNameAtBooking = s1.Name,
                DurationMinutesAtBooking = 30,
                StartAtUtc = baseTime.AddDays(-2),
                EndAtUtc = baseTime.AddDays(-2).AddMinutes(30),
                Status = "Completed",
                PriceAtBooking = 1000m,
                AdvanceAmountRequired = 200m,
                AmountPaid = 1000m,
                PaymentStatus = PaymentStatuses.Paid,
                PaymentVerifiedAtUtc = DateTime.UtcNow
            });

            // Appointment 2: Confirmed, PartiallyPaid 300 (Advance), Unverified
            db.Appointments.Add(new Appointment
            {
                SalonId = salonId,
                CustomerId = customerId2,
                StaffId = staffId,
                ServiceId = service1Id,
                ServiceNameAtBooking = s1.Name,
                DurationMinutesAtBooking = 30,
                StartAtUtc = baseTime.AddDays(-1),
                EndAtUtc = baseTime.AddDays(-1).AddMinutes(30),
                Status = "Confirmed",
                PriceAtBooking = 1000m,
                AdvanceAmountRequired = 300m,
                AmountPaid = 300m,
                PaymentStatus = PaymentStatuses.PartiallyPaid,
                PaymentVerifiedAtUtc = null
            });

            // Appointment 3: Cancelled, Refunded 500
            db.Appointments.Add(new Appointment
            {
                SalonId = salonId,
                CustomerId = customerId1,
                StaffId = staffId,
                ServiceId = service2Id,
                ServiceNameAtBooking = s2.Name,
                DurationMinutesAtBooking = 45,
                StartAtUtc = baseTime.AddDays(-3),
                EndAtUtc = baseTime.AddDays(-3).AddMinutes(45),
                Status = "Cancelled",
                PriceAtBooking = 1500m,
                AdvanceAmountRequired = 500m,
                AmountPaid = 500m,
                PaymentStatus = PaymentStatuses.Refunded
            });

            // Appointment 4: Upcoming tomorrow, Confirmed
            db.Appointments.Add(new Appointment
            {
                SalonId = salonId,
                CustomerId = customerId2,
                StaffId = staffId,
                ServiceId = service2Id,
                ServiceNameAtBooking = s2.Name,
                DurationMinutesAtBooking = 45,
                StartAtUtc = DateTime.UtcNow.AddDays(2),
                EndAtUtc = DateTime.UtcNow.AddDays(2).AddMinutes(45),
                Status = "Confirmed",
                PriceAtBooking = 1500m,
                AdvanceAmountRequired = 0m,
                AmountPaid = 0m,
                PaymentStatus = PaymentStatuses.NotRequired
            });

            await db.SaveChangesAsync();
        }

        // Act - Call Dashboard Summary API
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var fromDate = DateTime.UtcNow.AddDays(-7).ToString("o");
        var toDate = DateTime.UtcNow.AddDays(7).ToString("o");
        var response = await _client.GetAsync($"/api/admin/dashboard/summary?fromUtc={fromDate}&toUtc={toDate}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<AdminDashboardSummaryResponse>();
        Assert.NotNull(summary);

        Assert.Equal(4, summary.TotalAppointments);
        Assert.Equal(1, summary.CompletedAppointments);
        Assert.Equal(1, summary.CancelledAppointments);
        Assert.Equal(1, summary.UpcomingAppointments);
        Assert.Equal(2, summary.TotalCustomers); // customerId1 and customerId2

        // Revenue checks
        // Non-cancelled appointments: Appt 1 (1000), Appt 2 (1000), Appt 4 (1500) -> TotalBookingValue = 3500
        Assert.Equal(3500m, summary.Revenue.TotalBookingValue);
        // Collected: Appt 1 (1000) + Appt 2 (300) = 1300
        Assert.Equal(1300m, summary.Revenue.TotalCollectedRevenue);
        // Verified: Appt 1 (1000)
        Assert.Equal(1000m, summary.Revenue.TotalVerifiedRevenue);
        // Pending: Appt 2 (1000-300=700) + Appt 4 (1500-0=1500) = 2200
        Assert.Equal(2200m, summary.Revenue.TotalPendingRevenue);
        // Refunded: Appt 3 (500)
        Assert.Equal(500m, summary.Revenue.TotalRefundedAmount);

        // Popular services check
        Assert.NotEmpty(summary.PopularServices);
        var topService = summary.PopularServices.First();
        Assert.Equal("Signature Haircut", topService.ServiceName);
        Assert.Equal(2, topService.BookingCount);

        // Trends check
        Assert.NotEmpty(summary.Trends);
    }

    [Fact]
    public async Task DashboardAnalytics_InvalidDateRange_Returns400BadRequest()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var fromDate = DateTime.UtcNow.AddDays(5).ToString("o");
        var toDate = DateTime.UtcNow.AddDays(1).ToString("o");

        var response = await _client.GetAsync($"/api/admin/dashboard?fromUtc={fromDate}&toUtc={toDate}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DashboardAnalytics_EmptyPeriod_ReturnsZeroesWithoutErrors()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var fromDate = DateTime.UtcNow.AddYears(-5).ToString("o");
        var toDate = DateTime.UtcNow.AddYears(-4).ToString("o");

        var response = await _client.GetAsync($"/api/admin/dashboard/summary?fromUtc={fromDate}&toUtc={toDate}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<AdminDashboardSummaryResponse>();
        Assert.NotNull(summary);
        Assert.Equal(0, summary.TotalAppointments);
        Assert.Equal(0m, summary.Revenue.TotalBookingValue);
        Assert.Equal(0m, summary.Revenue.TotalCollectedRevenue);
        Assert.Empty(summary.PopularServices);
    }

    [Fact]
    public async Task DashboardAnalytics_TenantIsolation_OnlyReturnsOwnData()
    {
        var (adminTokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (adminTokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();
        var (_, customerId) = await RegisterCustomerAsync();

        // Seed 1 appointment for Salon A
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var staffA = new Staff { SalonId = salonIdA, FullName = "Staff A", IsActive = true };
            var serviceA = new Service { SalonId = salonIdA, Name = "Service A", Category = "A", Price = 500m, IsActive = true };
            db.Staff.Add(staffA);
            db.Services.Add(serviceA);
            await db.SaveChangesAsync();

            db.Appointments.Add(new Appointment
            {
                SalonId = salonIdA,
                CustomerId = customerId,
                StaffId = staffA.Id,
                ServiceId = serviceA.Id,
                ServiceNameAtBooking = serviceA.Name,
                DurationMinutesAtBooking = 30,
                StartAtUtc = DateTime.UtcNow.AddDays(-1),
                EndAtUtc = DateTime.UtcNow.AddDays(-1).AddMinutes(30),
                Status = "Completed",
                PriceAtBooking = 500m,
                AmountPaid = 500m,
                PaymentStatus = PaymentStatuses.Paid
            });
            await db.SaveChangesAsync();
        }

        // Salon B Admin calls dashboard
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenB);
        var resB = await _client.GetAsync("/api/admin/dashboard/summary");
        Assert.Equal(HttpStatusCode.OK, resB.StatusCode);
        var summaryB = await resB.Content.ReadFromJsonAsync<AdminDashboardSummaryResponse>();
        Assert.NotNull(summaryB);
        Assert.Equal(0, summaryB.TotalAppointments);
        Assert.Equal(0m, summaryB.Revenue.TotalCollectedRevenue);
    }

    [Fact]
    public async Task DashboardAnalytics_UnauthenticatedAndCustomerRole_Rejected()
    {
        // 1. Unauthenticated
        _client.DefaultRequestHeaders.Authorization = null;
        var anonRes = await _client.GetAsync("/api/admin/dashboard");
        Assert.Equal(HttpStatusCode.Unauthorized, anonRes.StatusCode);

        // 2. Customer Role
        var (customerToken, _) = await RegisterCustomerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var custRes = await _client.GetAsync("/api/admin/dashboard");
        Assert.Equal(HttpStatusCode.Forbidden, custRes.StatusCode);
    }

    #endregion
}
