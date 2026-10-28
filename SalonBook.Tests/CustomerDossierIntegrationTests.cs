using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SalonBook.Api.DTOs;
using Xunit;

namespace SalonBook.Tests;

public class CustomerDossierIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CustomerDossierIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int CustomerId)> RegisterCustomerAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterUserRequest
        {
            FullName = $"Dossier Client {suffix}",
            Email = $"dossier_client_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    [Fact]
    public async Task CustomerDossier_RequiresAuthentication()
    {
        var response = await _client.GetAsync("/api/customer/dossier");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CustomerDossier_CanRetrieveAndUpsertDossier()
    {
        var (token, customerId) = await RegisterCustomerAsync();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/customer/dossier");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var getRes = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);

        var initialDossier = await getRes.Content.ReadFromJsonAsync<CustomerDossierResponse>();
        Assert.NotNull(initialDossier);
        Assert.Equal(customerId, initialDossier.CustomerId);

        // Update Dossier with allergies and notes
        var updateReq = new UpdateCustomerDossierRequest
        {
            Allergies = "Sensitive to high-ammonia hair color and strong perfumes",
            SkinOrHairNotes = "Fine curly hair, high porosity, dry scalp",
            EmergencyContactName = "Alex Sharma",
            EmergencyContactPhone = "+91 98765 00000"
        };

        var putMsg = new HttpRequestMessage(HttpMethod.Put, "/api/customer/dossier")
        {
            Content = JsonContent.Create(updateReq)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var putRes = await _client.SendAsync(putMsg);
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);

        var updatedDossier = await putRes.Content.ReadFromJsonAsync<CustomerDossierResponse>();
        Assert.NotNull(updatedDossier);
        Assert.Equal("Sensitive to high-ammonia hair color and strong perfumes", updatedDossier.Allergies);
        Assert.Equal("Fine curly hair, high porosity, dry scalp", updatedDossier.SkinOrHairNotes);
        Assert.Equal("Alex Sharma", updatedDossier.EmergencyContactName);
        Assert.Equal("+91 98765 00000", updatedDossier.EmergencyContactPhone);
    }

    [Fact]
    public async Task CustomerDossier_CanRetrieveCareReminders()
    {
        var (token, _) = await RegisterCustomerAsync();

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/customer/dossier/care-reminders");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var reminders = await res.Content.ReadFromJsonAsync<List<CustomerCareReminderResponse>>();
        Assert.NotNull(reminders);
    }
}
