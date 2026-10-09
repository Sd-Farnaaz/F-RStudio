using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SalonBook.Api.DTOs;

namespace SalonBook.Tests;

public class SalonProfileAndServicesIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SalonProfileAndServicesIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Elite Studio {suffix}",
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

    private async Task<string> RegisterCustomerAsync()
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
        return authRes.AccessToken;
    }

    [Fact]
    public async Task Admin_CanGetAndModifyOwnSalonProfile()
    {
        var (token, salonId, slug) = await RegisterSalonAndAdminAsync();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/salon/profile");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getRes = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var profile = await getRes.Content.ReadFromJsonAsync<SalonProfileResponse>();
        Assert.NotNull(profile);
        Assert.Equal(salonId, profile.Id);

        // Update profile
        var updateReq = new UpdateSalonProfileRequest
        {
            Name = "Updated Elite Studio",
            Description = "Top notch hair styling and spa",
            BusinessType = "Unisex Salon",
            AddressLine = "42 MG Road",
            City = "Bangalore",
            State = "Karnataka",
            PostalCode = "560001",
            Country = "India",
            PhoneNumber = "+919876500000",
            ContactEmail = "contact@elitestudio.com",
            OpeningHoursJson = "{\"Monday\":\"9:00 - 20:00\"}",
            TimeZone = "Asia/Kolkata",
            CurrencyCode = "INR"
        };

        using var putRequest = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/profile")
        {
            Content = JsonContent.Create(updateReq)
        };
        putRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putRes = await _client.SendAsync(putRequest);

        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updatedProfile = await putRes.Content.ReadFromJsonAsync<SalonProfileResponse>();
        Assert.NotNull(updatedProfile);
        Assert.Equal("Updated Elite Studio", updatedProfile.Name);
        Assert.Equal("Bangalore", updatedProfile.City);
        Assert.Equal("+919876500000", updatedProfile.PhoneNumber);
        Assert.NotNull(updatedProfile.UpdatedAtUtc);
    }

    [Fact]
    public async Task Customer_CannotAccessOrModify_AdminSalonProfile()
    {
        var customerToken = await RegisterCustomerAsync();

        using var getRequest = new HttpRequestMessage(HttpMethod.Get, "/api/admin/salon/profile");
        getRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var getRes = await _client.SendAsync(getRequest);

        Assert.Equal(HttpStatusCode.Forbidden, getRes.StatusCode);

        using var putRequest = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/profile")
        {
            Content = JsonContent.Create(new UpdateSalonProfileRequest
            {
                Name = "Hacked Salon",
                BusinessType = "Barber",
                TimeZone = "Asia/Kolkata",
                CurrencyCode = "INR"
            })
        };
        putRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var putRes = await _client.SendAsync(putRequest);

        Assert.Equal(HttpStatusCode.Forbidden, putRes.StatusCode);
    }

    [Fact]
    public async Task Admin_CanCreateListUpdateActivateDeactivateAndDelete_Services()
    {
        var (token, salonId, _) = await RegisterSalonAndAdminAsync();

        // 1. Create service
        var createReq = new CreateServiceRequest
        {
            Name = "Signature Haircut",
            Description = "Includes hair wash and blow dry",
            Category = "Hair",
            Price = 450.00m,
            DurationMinutes = 45,
            IsActive = true
        };

        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var createRes = await _client.SendAsync(createMsg);

        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(created);
        Assert.Equal("Signature Haircut", created.Name);
        Assert.Equal(450.00m, created.Price);
        Assert.Equal(45, created.DurationMinutes);
        Assert.True(created.IsActive);
        Assert.Equal(salonId, created.SalonId);

        var serviceId = created.Id;

        // 2. Get Service by ID
        using var getMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/services/{serviceId}");
        getMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getRes = await _client.SendAsync(getMsg);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var fetched = await getRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(fetched);
        Assert.Equal(serviceId, fetched.Id);

        // 3. Update Service
        var updateReq = new UpdateServiceRequest
        {
            Name = "Luxury Haircut & Styling",
            Description = "Updated description",
            Category = "Hair Styling",
            Price = 550.00m,
            DurationMinutes = 60,
            IsActive = true
        };

        using var updateMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/services/{serviceId}")
        {
            Content = JsonContent.Create(updateReq)
        };
        updateMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var updateRes = await _client.SendAsync(updateMsg);
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updated = await updateRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Luxury Haircut & Styling", updated.Name);
        Assert.Equal(550.00m, updated.Price);
        Assert.Equal(60, updated.DurationMinutes);

        // 4. Change Status (Deactivate)
        using var patchMsg = new HttpRequestMessage(HttpMethod.Patch, $"/api/admin/services/{serviceId}/status")
        {
            Content = JsonContent.Create(new UpdateServiceStatusRequest { IsActive = false })
        };
        patchMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var patchRes = await _client.SendAsync(patchMsg);
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);
        var deactivated = await patchRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(deactivated);
        Assert.False(deactivated.IsActive);

        // 5. List Services
        using var listMsg = new HttpRequestMessage(HttpMethod.Get, "/api/admin/services");
        listMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var listRes = await _client.SendAsync(listMsg);
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var paged = await listRes.Content.ReadFromJsonAsync<PagedResult<ServiceResponse>>();
        Assert.NotNull(paged);
        Assert.True(paged.TotalCount >= 1);
        Assert.Contains(paged.Items, s => s.Id == serviceId);

        // 6. Delete Service
        using var deleteMsg = new HttpRequestMessage(HttpMethod.Delete, $"/api/admin/services/{serviceId}");
        deleteMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var deleteRes = await _client.SendAsync(deleteMsg);
        Assert.Equal(HttpStatusCode.OK, deleteRes.StatusCode);

        // Verify deleted
        using var getAfterDelete = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/services/{serviceId}");
        getAfterDelete.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getAfterDeleteRes = await _client.SendAsync(getAfterDelete);
        Assert.Equal(HttpStatusCode.NotFound, getAfterDeleteRes.StatusCode);
    }

    [Fact]
    public async Task Service_Validation_RejectsInvalidPriceAndDuration()
    {
        var (token, _, _) = await RegisterSalonAndAdminAsync();

        // Negative price
        var negPriceReq = new CreateServiceRequest
        {
            Name = "Test Service",
            Category = "Hair",
            Price = -50.00m,
            DurationMinutes = 30
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(negPriceReq)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.BadRequest, res1.StatusCode);

        // Zero / below minimum duration
        var zeroDurationReq = new CreateServiceRequest
        {
            Name = "Test Service 2",
            Category = "Hair",
            Price = 100.00m,
            DurationMinutes = 2 // less than 5 min limit
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(zeroDurationReq)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);

        // Above maximum duration (> 480 min)
        var excessiveDurationReq = new CreateServiceRequest
        {
            Name = "Test Service 3",
            Category = "Hair",
            Price = 100.00m,
            DurationMinutes = 500
        };
        using var msg3 = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(excessiveDurationReq)
        };
        msg3.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res3 = await _client.SendAsync(msg3);
        Assert.Equal(HttpStatusCode.BadRequest, res3.StatusCode);
    }

    [Fact]
    public async Task CrossTenant_Isolation_AdminCannotAccessOrMutateAnotherSalonsService()
    {
        var (tokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (tokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();

        // Admin A creates a service
        var createReq = new CreateServiceRequest
        {
            Name = "Salon A Secret Treatment",
            Category = "Specialty",
            Price = 1200.00m,
            DurationMinutes = 90
        };
        using var createMsg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(createReq)
        };
        createMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var createRes = await _client.SendAsync(createMsg);
        createRes.EnsureSuccessStatusCode();
        var serviceA = await createRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(serviceA);

        // Admin B tries to GET service A -> 404
        using var getMsg = new HttpRequestMessage(HttpMethod.Get, $"/api/admin/services/{serviceA.Id}");
        getMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var getRes = await _client.SendAsync(getMsg);
        Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);

        // Admin B tries to PUT service A -> 404
        using var putMsg = new HttpRequestMessage(HttpMethod.Put, $"/api/admin/services/{serviceA.Id}")
        {
            Content = JsonContent.Create(new UpdateServiceRequest
            {
                Name = "Hacked Service",
                Category = "Hacked",
                Price = 1.00m,
                DurationMinutes = 30,
                IsActive = true
            })
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var putRes = await _client.SendAsync(putMsg);
        Assert.Equal(HttpStatusCode.NotFound, putRes.StatusCode);

        // Admin B tries to DELETE service A -> 404
        using var delMsg = new HttpRequestMessage(HttpMethod.Delete, $"/api/admin/services/{serviceA.Id}");
        delMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);
        var delRes = await _client.SendAsync(delMsg);
        Assert.Equal(HttpStatusCode.NotFound, delRes.StatusCode);
    }

    [Fact]
    public async Task PublicEndpoints_AllowDiscovery_AndFilterInactiveSalonsAndServices()
    {
        var (token, salonId, slug) = await RegisterSalonAndAdminAsync();

        // Update profile with City
        var updateReq = new UpdateSalonProfileRequest
        {
            Name = "Royal Hair Lounge",
            BusinessType = "Hair Salon",
            City = "Pune",
            State = "Maharashtra",
            TimeZone = "Asia/Kolkata",
            CurrencyCode = "INR"
        };
        using var putRequest = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/profile")
        {
            Content = JsonContent.Create(updateReq)
        };
        putRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var putRes = await _client.SendAsync(putRequest);
        putRes.EnsureSuccessStatusCode();

        // Create 1 active service and 1 inactive service
        var actServiceReq = new CreateServiceRequest
        {
            Name = "Active Facial",
            Category = "Skincare",
            Price = 800.00m,
            DurationMinutes = 60,
            IsActive = true
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(actServiceReq)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res1 = await _client.SendAsync(msg1);
        res1.EnsureSuccessStatusCode();

        var inactServiceReq = new CreateServiceRequest
        {
            Name = "Draft Service",
            Category = "Special",
            Price = 1500.00m,
            DurationMinutes = 120,
            IsActive = false
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(inactServiceReq)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var res2 = await _client.SendAsync(msg2);
        res2.EnsureSuccessStatusCode();

        // 1. GET /api/salons (Public list)
        var publicSalonsRes = await _client.GetAsync($"/api/salons?city=Pune&search=Royal");
        Assert.Equal(HttpStatusCode.OK, publicSalonsRes.StatusCode);
        var pagedSalons = await publicSalonsRes.Content.ReadFromJsonAsync<PagedResult<PublicSalonResponse>>();
        Assert.NotNull(pagedSalons);
        Assert.Contains(pagedSalons.Items, s => s.Slug == slug);

        // 2. GET /api/salons/{slug}
        var getSlugRes = await _client.GetAsync($"/api/salons/{slug}");
        Assert.Equal(HttpStatusCode.OK, getSlugRes.StatusCode);
        var salonDetail = await getSlugRes.Content.ReadFromJsonAsync<PublicSalonResponse>();
        Assert.NotNull(salonDetail);
        Assert.Equal("Royal Hair Lounge", salonDetail.Name);
        Assert.Equal("Pune", salonDetail.City);

        // 3. GET /api/salons/{slug}/services (Public service catalog)
        var getServicesRes = await _client.GetAsync($"/api/salons/{slug}/services");
        Assert.Equal(HttpStatusCode.OK, getServicesRes.StatusCode);
        var servicesPaged = await getServicesRes.Content.ReadFromJsonAsync<PagedResult<PublicServiceResponse>>();
        Assert.NotNull(servicesPaged);
        Assert.Contains(servicesPaged.Items, s => s.Name == "Active Facial");
        Assert.DoesNotContain(servicesPaged.Items, s => s.Name == "Draft Service"); // Inactive services excluded

        // 4. Unknown slug -> 404
        var notFoundRes = await _client.GetAsync("/api/salons/non-existent-salon-xyz-12345");
        Assert.Equal(HttpStatusCode.NotFound, notFoundRes.StatusCode);
    }
}
