using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Common;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Tests;

public class SuperAdminIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SuperAdminIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int UserId)> AuthenticateSuperAdminAsync()
    {
        var saEmail = "sa_" + Guid.NewGuid().ToString("N") + "@salonbook.com";
        var saPass = "SAPassword123!";
        using var scope = _factory.Services.CreateScope();
        var provisioningService = scope.ServiceProvider.GetRequiredService<ISuperAdminProvisioningService>();
        await provisioningService.ProvisionSuperAdminAsync(saEmail, "Super Administrator", saPass);

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/superadmin/login", new LoginRequest
        {
            Email = saEmail,
            Password = saPass
        });
        loginResponse.EnsureSuccessStatusCode();
        var authRes = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    private async Task<(string Token, int SalonId)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"SA Test Salon {suffix}",
            BusinessType = "Hair Salon",
            FullName = $"Admin {suffix}",
            Email = $"admin_sa_{suffix}@salonbook.com",
            Password = "SecurePassword123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/admin/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        Assert.NotNull(authRes.User.SalonId);
        return (authRes.AccessToken, authRes.User.SalonId.Value);
    }

    private async Task<(string Token, int CustomerId)> RegisterCustomerAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterUserRequest
        {
            FullName = $"Customer {suffix}",
            Email = $"cust_sa_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    [Fact]
    public async Task GetOverview_AsSuperAdmin_ReturnsPlatformMetricsAndRecentSalons()
    {
        // Arrange
        var (saToken, _) = await AuthenticateSuperAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", saToken);

        // Act
        var response = await _client.GetAsync("/api/superadmin/overview");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var overview = await response.Content.ReadFromJsonAsync<SuperAdminOverviewResponse>();
        Assert.NotNull(overview);
        Assert.True(overview.TotalSalons >= 0);
        Assert.True(overview.TotalUsers >= 1);
        Assert.Equal("Healthy", overview.PlatformHealth);
        Assert.NotNull(overview.RecentSalons);
    }

    [Fact]
    public async Task ListSalons_AsSuperAdmin_ReturnsPagedSalons_WithSearchAndFilter()
    {
        // Arrange
        var (adminToken, salonId) = await RegisterSalonAndAdminAsync();
        var (saToken, _) = await AuthenticateSuperAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", saToken);

        // Act - List all salons
        var response = await _client.GetAsync("/api/superadmin/salons?page=1&pageSize=20");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var pagedResult = await response.Content.ReadFromJsonAsync<PagedResult<SuperAdminSalonResponse>>();
        Assert.NotNull(pagedResult);
        Assert.True(pagedResult.TotalCount > 0);
        Assert.Contains(pagedResult.Items, s => s.Id == salonId);

        // Verify retrieval by ID
        var detailRes = await _client.GetAsync($"/api/superadmin/salons/{salonId}");
        Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);
        var salonDetail = await detailRes.Content.ReadFromJsonAsync<SuperAdminSalonDetailResponse>();
        Assert.NotNull(salonDetail);
        Assert.Equal(salonId, salonDetail.Id);
        Assert.NotEmpty(salonDetail.Name);
    }

    [Fact]
    public async Task UpdateSalonStatus_AsSuperAdmin_TogglesActiveState()
    {
        // Arrange
        var (_, salonId) = await RegisterSalonAndAdminAsync();
        var (saToken, _) = await AuthenticateSuperAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", saToken);

        // Act - Deactivate salon
        var updateReq = new UpdateSalonStatusRequest
        {
            IsActive = false,
            Reason = "Policy compliance investigation"
        };
        var patchRes = await _client.PatchAsJsonAsync($"/api/superadmin/salons/{salonId}/status", updateReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);

        // Verify salon is now inactive
        var detailRes = await _client.GetAsync($"/api/superadmin/salons/{salonId}");
        Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);
        var detail = await detailRes.Content.ReadFromJsonAsync<SuperAdminSalonDetailResponse>();
        Assert.NotNull(detail);
        Assert.False(detail.IsActive);

        // Reactivate salon
        var reactivateRes = await _client.PatchAsJsonAsync($"/api/superadmin/salons/{salonId}/status", new UpdateSalonStatusRequest { IsActive = true });
        Assert.Equal(HttpStatusCode.OK, reactivateRes.StatusCode);
    }

    [Fact]
    public async Task UpdateSalonKyc_AsSuperAdmin_UpdatesVerificationAndCreatesAudit()
    {
        // Arrange
        var (_, salonId) = await RegisterSalonAndAdminAsync();
        var (saToken, _) = await AuthenticateSuperAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", saToken);

        // Act - Approve KYC
        var kycReq = new UpdateSalonKycRequest
        {
            KycStatus = "Verified",
            IsVerified = true,
            Notes = "GST certificate and address proof verified successfully"
        };
        var patchRes = await _client.PatchAsJsonAsync($"/api/superadmin/salons/{salonId}/kyc", kycReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);
        var updated = await patchRes.Content.ReadFromJsonAsync<SuperAdminSalonDetailResponse>();
        Assert.NotNull(updated);
        Assert.True(updated.IsVerified);
        Assert.Equal("Verified", updated.KycStatus);

        // Test invalid KYC status returns 400
        var invalidReq = new UpdateSalonKycRequest
        {
            KycStatus = "InvalidStatusName",
            IsVerified = true
        };
        var invalidRes = await _client.PatchAsJsonAsync($"/api/superadmin/salons/{salonId}/kyc", invalidReq);
        Assert.Equal(HttpStatusCode.BadRequest, invalidRes.StatusCode);
    }

    [Fact]
    public async Task ListUsers_And_UpdateUserStatus_AsSuperAdmin_Succeeds()
    {
        // Arrange
        var (_, customerId) = await RegisterCustomerAsync();
        var (saToken, saUserId) = await AuthenticateSuperAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", saToken);

        // Act - List users
        var listRes = await _client.GetAsync("/api/superadmin/users?role=user&page=1&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var pagedUsers = await listRes.Content.ReadFromJsonAsync<PagedResult<SuperAdminUserResponse>>();
        Assert.NotNull(pagedUsers);
        Assert.Contains(pagedUsers.Items, u => u.Id == customerId);

        // Act - Deactivate customer
        var patchRes = await _client.PatchAsJsonAsync($"/api/superadmin/users/{customerId}/status", new UpdateUserStatusRequest { IsActive = false });
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);

        // Act - SuperAdmin cannot deactivate self
        var selfDeactivateRes = await _client.PatchAsJsonAsync($"/api/superadmin/users/{saUserId}/status", new UpdateUserStatusRequest { IsActive = false });
        Assert.Equal(HttpStatusCode.BadRequest, selfDeactivateRes.StatusCode);
    }

    [Fact]
    public async Task SuperAdminEndpoints_ForbiddenForSalonAdmin_And_Customer()
    {
        // 1. Unauthenticated -> 401
        _client.DefaultRequestHeaders.Authorization = null;
        var anonRes = await _client.GetAsync("/api/superadmin/overview");
        Assert.Equal(HttpStatusCode.Unauthorized, anonRes.StatusCode);

        // 2. Salon Admin -> 403 Forbidden
        var (adminToken, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var adminRes = await _client.GetAsync("/api/superadmin/overview");
        Assert.Equal(HttpStatusCode.Forbidden, adminRes.StatusCode);

        // 3. Customer -> 403 Forbidden
        var (custToken, _) = await RegisterCustomerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var custRes = await _client.GetAsync("/api/superadmin/overview");
        Assert.Equal(HttpStatusCode.Forbidden, custRes.StatusCode);
    }
}

