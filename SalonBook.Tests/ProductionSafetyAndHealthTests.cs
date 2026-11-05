using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Common;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Tests;

public class ProductionSafetyAndHealthTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ProductionSafetyAndHealthTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> AuthenticateSuperAdminAsync()
    {
        var saEmail = "sa_health_" + Guid.NewGuid().ToString("N") + "@salonbook.com";
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
        return authRes.AccessToken;
    }

    private async Task<string> RegisterCustomerAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterUserRequest
        {
            FullName = $"Customer {suffix}",
            Email = $"cust_health_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return authRes.AccessToken;
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Safety Salon {suffix}",
            BusinessType = "Hair Salon",
            FullName = $"Admin {suffix}",
            Email = $"admin_safety_{suffix}@salonbook.com",
            Password = "SecurePassword123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/admin/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        Assert.NotNull(authRes.User.SalonId);

        return (authRes.AccessToken, authRes.User.SalonId.Value, authRes.User.SalonSlug ?? "");
    }

    [Fact]
    public async Task PublicHealthEndpoint_ReturnsGenericStatus_AndHidesInternalDatabaseSchema()
    {
        var response = await _client.GetAsync("/health");
        
        // Should return 200 OK (if healthy) or 503 Service Unavailable (if degraded)
        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.ServiceUnavailable,
            $"Expected 200 or 503, got {response.StatusCode}");

        var content = await response.Content.ReadAsStringAsync();
        Assert.False(string.IsNullOrWhiteSpace(content));

        using var jsonDoc = JsonDocument.Parse(content);
        var root = jsonDoc.RootElement;

        // Verify public generic properties exist
        Assert.True(root.TryGetProperty("status", out var statusProp));
        var statusStr = statusProp.GetString();
        Assert.True(statusStr == "Healthy" || statusStr == "Degraded");

        Assert.True(root.TryGetProperty("service", out var serviceProp));
        Assert.Equal("SalonBook.Api", serviceProp.GetString());

        Assert.True(root.TryGetProperty("timestamp", out _));

        // Critical safety assertion: internal database details MUST NOT be exposed on public /health
        Assert.False(root.TryGetProperty("database", out _), "Public /health must not expose the 'database' property.");
        Assert.False(content.Contains("missingTables", StringComparison.OrdinalIgnoreCase), "Public /health must not leak 'missingTables'.");
        Assert.False(content.Contains("missingColumns", StringComparison.OrdinalIgnoreCase), "Public /health must not leak 'missingColumns'.");
        Assert.False(content.Contains("missingIndexes", StringComparison.OrdinalIgnoreCase), "Public /health must not leak 'missingIndexes'.");
        Assert.False(content.Contains("missingForeignKeys", StringComparison.OrdinalIgnoreCase), "Public /health must not leak 'missingForeignKeys'.");
        Assert.False(content.Contains("failedOperations", StringComparison.OrdinalIgnoreCase), "Public /health must not leak 'failedOperations'.");
    }

    [Fact]
    public async Task DiagnosticsEndpoint_RejectsAnonymousCaller_With401Unauthorized()
    {
        var response = await _client.GetAsync("/health/diagnostics");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DiagnosticsEndpoint_RejectsCustomerRole_With403Forbidden()
    {
        var customerToken = await RegisterCustomerAsync();

        var request = new HttpRequestMessage(HttpMethod.Get, "/health/diagnostics");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DiagnosticsEndpoint_AllowsSuperAdmin_AndReturnsDiagnosticDetails()
    {
        var superAdminToken = await AuthenticateSuperAdminAsync();

        var request = new HttpRequestMessage(HttpMethod.Get, "/health/diagnostics");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", superAdminToken);

        var response = await _client.SendAsync(request);
        Assert.True(response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.ServiceUnavailable);

        var content = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(content);
        var root = jsonDoc.RootElement;

        Assert.True(root.TryGetProperty("database", out var dbProp));
        Assert.True(dbProp.TryGetProperty("schemaStatus", out _));
        Assert.True(dbProp.TryGetProperty("missingTables", out _));
        Assert.True(dbProp.TryGetProperty("failedOperations", out _));
    }

    [Fact]
    public async Task PublicSalonsEndpoint_WhenSalonHasNoReviews_ReturnsZeroAverageRatingAndZeroReviewCount()
    {
        var (_, _, slug) = await RegisterSalonAndAdminAsync();

        var response = await _client.GetAsync($"/api/salons/{slug}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var salon = await response.Content.ReadFromJsonAsync<PublicSalonResponse>();
        Assert.NotNull(salon);
        Assert.Equal(0, salon.ReviewCount);
        Assert.Equal(0.0, salon.AverageRating);
    }

    [Fact]
    public async Task PublicSalonReviewsEndpoint_WhenSalonHasNoReviews_ReturnsZeroRatingAndZeroTotalReviews()
    {
        var (_, _, slug) = await RegisterSalonAndAdminAsync();

        var response = await _client.GetAsync($"/api/salons/{slug}/reviews");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var summary = await response.Content.ReadFromJsonAsync<SalonReviewSummaryResponse>();
        Assert.NotNull(summary);
        Assert.Equal(0, summary.TotalReviews);
        Assert.Equal(0.0, summary.AverageRating);
        Assert.NotNull(summary.Reviews);
        Assert.Empty(summary.Reviews.Items);
    }
}
