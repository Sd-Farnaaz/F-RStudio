using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SalonBook.Api.Common;
using SalonBook.Api.DTOs;

namespace SalonBook.Tests;

public class AdminCustomerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AdminCustomerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Salon {suffix}",
            BusinessType = "Beauty Salon",
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

    [Fact]
    public async Task CreateCustomer_BySalonAdmin_Succeeds_AndCanBeRetrieved()
    {
        // Arrange
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new CreateCustomerRequest
        {
            FullName = $"Walk-in Client {suffix}",
            Email = $"walkin_{suffix}@domain.com",
            Password = "InitialPassword123!"
        };

        // Act - Create customer
        var response = await _client.PostAsJsonAsync("/api/admin/customers", req);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var customer = await response.Content.ReadFromJsonAsync<CustomerResponse>();
        Assert.NotNull(customer);
        Assert.True(customer.Id > 0);
        Assert.Equal(req.FullName, customer.FullName);
        Assert.Equal(req.Email.ToLowerInvariant(), customer.Email);
        Assert.True(customer.IsActive);
        Assert.True(customer.IsEmailVerified);

        // Verify retrieval by ID
        var getByIdResponse = await _client.GetAsync($"/api/admin/customers/{customer.Id}");
        Assert.Equal(HttpStatusCode.OK, getByIdResponse.StatusCode);
        var fetchedCustomer = await getByIdResponse.Content.ReadFromJsonAsync<CustomerResponse>();
        Assert.NotNull(fetchedCustomer);
        Assert.Equal(customer.Id, fetchedCustomer.Id);
        Assert.Equal(req.FullName, fetchedCustomer.FullName);

        // Verify search listing
        var listResponse = await _client.GetAsync($"/api/admin/customers?search={suffix}");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var pagedResult = await listResponse.Content.ReadFromJsonAsync<PagedResult<CustomerResponse>>();
        Assert.NotNull(pagedResult);
        Assert.Contains(pagedResult.Items, c => c.Id == customer.Id);
    }

    [Fact]
    public async Task CreateCustomer_AllowsCreatedCustomerToLogin()
    {
        // Arrange
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"loginuser_{suffix}@domain.com";
        var password = "CustomerPassword123!";

        var createReq = new CreateCustomerRequest
        {
            FullName = $"Customer {suffix}",
            Email = email,
            Password = password
        };

        var createResponse = await _client.PostAsJsonAsync("/api/admin/customers", createReq);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        // Act - Customer logs in via customer auth endpoint
        _client.DefaultRequestHeaders.Authorization = null;
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/user/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        // Assert
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var authRes = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        Assert.NotEmpty(authRes.AccessToken);
        Assert.Equal(Roles.User, authRes.User.Role);
        Assert.Null(authRes.User.SalonId); // Global customer
    }

    [Fact]
    public async Task CreateCustomer_DuplicateEmail_Returns409Conflict()
    {
        // Arrange
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var email = $"dup_{suffix}@domain.com";

        var req = new CreateCustomerRequest
        {
            FullName = $"First Customer",
            Email = email,
            Password = "Password123!"
        };

        var firstResponse = await _client.PostAsJsonAsync("/api/admin/customers", req);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        // Act - Attempt to create with duplicate email (different case)
        var dupReq = new CreateCustomerRequest
        {
            FullName = $"Second Customer",
            Email = email.ToUpperInvariant(),
            Password = "Password456!"
        };

        var dupResponse = await _client.PostAsJsonAsync("/api/admin/customers", dupReq);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, dupResponse.StatusCode);
    }

    [Fact]
    public async Task CreateCustomer_Unauthenticated_Returns401Unauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var req = new CreateCustomerRequest
        {
            FullName = "Anon Client",
            Email = "anon@test.com",
            Password = "Password123!"
        };

        var response = await _client.PostAsJsonAsync("/api/admin/customers", req);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateCustomer_ByCustomerRole_Returns403Forbidden()
    {
        var (customerToken, _) = await RegisterCustomerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);

        var req = new CreateCustomerRequest
        {
            FullName = "Unauthorized Attempt",
            Email = "unauth@test.com",
            Password = "Password123!"
        };

        var response = await _client.PostAsJsonAsync("/api/admin/customers", req);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateCustomer_InvalidInput_Returns400BadRequest()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Invalid Email
        var invalidEmailReq = new CreateCustomerRequest
        {
            FullName = "Valid Name",
            Email = "not-an-email",
            Password = "Password123!"
        };
        var res1 = await _client.PostAsJsonAsync("/api/admin/customers", invalidEmailReq);
        Assert.Equal(HttpStatusCode.BadRequest, res1.StatusCode);

        // 2. Short Password (< 8 chars)
        var shortPassReq = new CreateCustomerRequest
        {
            FullName = "Valid Name",
            Email = "valid@email.com",
            Password = "short"
        };
        var res2 = await _client.PostAsJsonAsync("/api/admin/customers", shortPassReq);
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);

        // 3. Short FullName (< 2 chars)
        var shortNameReq = new CreateCustomerRequest
        {
            FullName = "A",
            Email = "valid2@email.com",
            Password = "Password123!"
        };
        var res3 = await _client.PostAsJsonAsync("/api/admin/customers", shortNameReq);
        Assert.Equal(HttpStatusCode.BadRequest, res3.StatusCode);
    }
}

