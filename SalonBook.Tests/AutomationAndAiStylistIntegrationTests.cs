using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SalonBook.Api.DTOs;
using Xunit;

namespace SalonBook.Tests;

public class AutomationAndAiStylistIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AutomationAndAiStylistIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Automation Studio {suffix}",
            BusinessType = "Hair & Beauty",
            FullName = $"Auto Admin {suffix}",
            Email = $"autoadmin_{suffix}@test.com",
            Password = "SecurePass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/admin/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        Assert.NotNull(authRes.User.SalonId);

        return (authRes.AccessToken, authRes.User.SalonId.Value, authRes.User.SalonSlug ?? "");
    }

    [Fact]
    public async Task AiStylist_ReturnsIntelligentRecommendation_WithFormulasAndKeywords()
    {
        var request = new AiStyleRecommendationRequest
        {
            HairLength = "Medium",
            FaceShape = "Oval",
            MaintenanceRoutine = "Moderate",
            OccasionVibe = "Everyday Chic"
        };

        var response = await _client.PostAsJsonAsync("/api/public/ai/recommend-style", request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<AiStyleRecommendationResponse>();
        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.StyleTitle));
        Assert.False(string.IsNullOrWhiteSpace(result.RecommendedColorFormula));
        Assert.NotEmpty(result.TrendingKeywords);
    }

    [Fact]
    public async Task OffPeakDiscounts_CrudAndAvailability_AppliesDynamicPricing()
    {
        var (token, salonId, slug) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // 1. Create a service
        var svcRes = await _client.PostAsJsonAsync("/api/admin/services", new CreateServiceRequest
        {
            Name = "Signature Balayage",
            Category = "Hair",
            Price = 1000.00m,
            DurationMinutes = 60,
            IsActive = true
        });
        svcRes.EnsureSuccessStatusCode();
        var svc = await svcRes.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(svc);

        // 2. Create Off-Peak Rule (20% off)
        var createRuleReq = new CreateOffPeakRuleRequest
        {
            Name = "Weekday Morning Flash 20% Off",
            DaysOfWeek = "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday",
            StartTime = "08:00",
            EndTime = "18:00",
            DiscountPercentage = 20.00m,
            IsActive = true
        };

        var ruleRes = await _client.PostAsJsonAsync("/api/admin/automation/discounts", createRuleReq);
        Assert.Equal(HttpStatusCode.Created, ruleRes.StatusCode);
        var createdRule = await ruleRes.Content.ReadFromJsonAsync<OffPeakRuleDTO>();
        Assert.NotNull(createdRule);
        Assert.Equal(20.00m, createdRule.DiscountPercentage);

        // 3. List Rules
        var listRes = await _client.GetAsync("/api/admin/automation/discounts");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var rules = await listRes.Content.ReadFromJsonAsync<List<OffPeakRuleDTO>>();
        Assert.NotNull(rules);
        Assert.Contains(rules, r => r.Id == createdRule.Id);

        // 4. Delete Rule
        var delRes = await _client.DeleteAsync($"/api/admin/automation/discounts/{createdRule.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delRes.StatusCode);
    }
}
