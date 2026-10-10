using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SalonBook.Api.Common;
using SalonBook.Api.DTOs;

namespace SalonBook.Tests;

public class SalonLogoAndImageUploadIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SalonLogoAndImageUploadIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Branded Salon {suffix}",
            BusinessType = "Hair & Beauty",
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
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A followed by dummy data
        var pngSignature = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
        var totalSize = Math.Max(size, pngSignature.Length);
        var bytes = new byte[totalSize];
        Array.Copy(pngSignature, bytes, pngSignature.Length);
        return bytes;
    }

    private static byte[] CreateValidJpegBytes(int size = 100)
    {
        // JPEG signature: FF D8 FF E0 ...
        var jpegSignature = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01 };
        var totalSize = Math.Max(size, jpegSignature.Length);
        var bytes = new byte[totalSize];
        Array.Copy(jpegSignature, bytes, jpegSignature.Length);
        return bytes;
    }

    private static byte[] CreateValidWebPBytes(int size = 100)
    {
        // WebP signature: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
        var webpSignature = new byte[] { 0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50 };
        var totalSize = Math.Max(size, webpSignature.Length);
        var bytes = new byte[totalSize];
        Array.Copy(webpSignature, bytes, webpSignature.Length);
        return bytes;
    }

    [Fact]
    public async Task UploadLogo_ValidPngImage_Succeeds_AndExposesPublicly()
    {
        // Arrange
        var (adminToken, salonId, slug) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var pngBytes = CreateValidPngBytes(256);
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "file", "salon-logo.png");

        // Act - Upload Logo
        var uploadResponse = await _client.PostAsync("/api/admin/salon/profile/logo", content);

        // Assert
        Assert.Equal(HttpStatusCode.OK, uploadResponse.StatusCode);
        var profile = await uploadResponse.Content.ReadFromJsonAsync<SalonProfileResponse>();
        Assert.NotNull(profile);
        Assert.NotNull(profile.LogoUrl);
        Assert.StartsWith($"/uploads/salons/{salonId}/", profile.LogoUrl);
        Assert.EndsWith(".png", profile.LogoUrl);

        // Verify public exposure via slug
        _client.DefaultRequestHeaders.Authorization = null;
        var publicResponse = await _client.GetAsync($"/api/salons/{slug}");
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
        var publicProfile = await publicResponse.Content.ReadFromJsonAsync<PublicSalonResponse>();
        Assert.NotNull(publicProfile);
        Assert.Equal(profile.LogoUrl, publicProfile.LogoUrl);
    }

    [Fact]
    public async Task UploadLogo_ValidJpegAndWebP_Succeeds()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. JPEG
        var jpegBytes = CreateValidJpegBytes(300);
        using (var jpegContent = new MultipartFormDataContent())
        {
            var fileContent = new ByteArrayContent(jpegBytes);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            jpegContent.Add(fileContent, "file", "brand.jpg");

            var jpegResponse = await _client.PostAsync("/api/admin/salon/profile/logo", jpegContent);
            Assert.Equal(HttpStatusCode.OK, jpegResponse.StatusCode);
            var profile = await jpegResponse.Content.ReadFromJsonAsync<SalonProfileResponse>();
            Assert.NotNull(profile?.LogoUrl);
            Assert.EndsWith(".jpg", profile.LogoUrl);
        }

        // 2. WebP
        var webpBytes = CreateValidWebPBytes(300);
        using (var webpContent = new MultipartFormDataContent())
        {
            var fileContent = new ByteArrayContent(webpBytes);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/webp");
            webpContent.Add(fileContent, "file", "brand.webp");

            var webpResponse = await _client.PostAsync("/api/admin/salon/profile/logo", webpContent);
            Assert.Equal(HttpStatusCode.OK, webpResponse.StatusCode);
            var profile = await webpResponse.Content.ReadFromJsonAsync<SalonProfileResponse>();
            Assert.NotNull(profile?.LogoUrl);
            Assert.EndsWith(".webp", profile.LogoUrl);
        }
    }

    [Fact]
    public async Task UploadLogo_SpoofedExtension_FailsMagicByteValidation()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // Fake image with .png extension but plaintext body
        var fakeBytes = System.Text.Encoding.UTF8.GetBytes("<?php echo 'malicious script'; ?>");
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fakeBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "file", "fake-logo.png");

        var response = await _client.PostAsync("/api/admin/salon/profile/logo", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid image file content", body);
    }

    [Fact]
    public async Task UploadLogo_OversizedFile_Returns400BadRequest()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 5.5MB file with valid PNG header
        var oversizedBytes = CreateValidPngBytes((int)(5.5 * 1024 * 1024));
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(oversizedBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(fileContent, "file", "huge-logo.png");

        var response = await _client.PostAsync("/api/admin/salon/profile/logo", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("exceeds the allowed limit", body);
    }

    [Fact]
    public async Task UploadLogo_DisallowedFileType_Returns400BadRequest()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var pdfBytes = System.Text.Encoding.UTF8.GetBytes("%PDF-1.4 dummy pdf");
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "file", "document.pdf");

        var response = await _client.PostAsync("/api/admin/salon/profile/logo", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("not supported", body);
    }

    [Fact]
    public async Task UploadLogo_Unauthenticated_Returns401Unauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var pngBytes = CreateValidPngBytes(100);
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pngBytes);
        content.Add(fileContent, "file", "logo.png");

        var response = await _client.PostAsync("/api/admin/salon/profile/logo", content);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UploadLogo_ByCustomerRole_Returns403Forbidden()
    {
        var (customerToken, _) = await RegisterCustomerAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);

        var pngBytes = CreateValidPngBytes(100);
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pngBytes);
        content.Add(fileContent, "file", "logo.png");

        var response = await _client.PostAsync("/api/admin/salon/profile/logo", content);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteLogo_RemovesLogo_AndClearsUrl()
    {
        var (adminToken, salonId, slug) = await RegisterSalonAndAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // 1. Upload logo
        var pngBytes = CreateValidPngBytes(200);
        using (var content = new MultipartFormDataContent())
        {
            var fileContent = new ByteArrayContent(pngBytes);
            content.Add(fileContent, "file", "logo.png");
            var uploadRes = await _client.PostAsync("/api/admin/salon/profile/logo", content);
            Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
        }

        // 2. Delete logo
        var deleteResponse = await _client.DeleteAsync("/api/admin/salon/profile/logo");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        var profile = await deleteResponse.Content.ReadFromJsonAsync<SalonProfileResponse>();
        Assert.NotNull(profile);
        Assert.Null(profile.LogoUrl);

        // 3. Verify public view is updated
        _client.DefaultRequestHeaders.Authorization = null;
        var publicResponse = await _client.GetAsync($"/api/salons/{slug}");
        Assert.Equal(HttpStatusCode.OK, publicResponse.StatusCode);
        var publicProfile = await publicResponse.Content.ReadFromJsonAsync<PublicSalonResponse>();
        Assert.NotNull(publicProfile);
        Assert.Null(publicProfile.LogoUrl);
    }

    [Fact]
    public async Task TenantIsolation_AdminCannotModifyOtherSalonsLogo()
    {
        var (adminTokenA, salonIdA, slugA) = await RegisterSalonAndAdminAsync();
        var (adminTokenB, salonIdB, slugB) = await RegisterSalonAndAdminAsync();

        // Admin A uploads logo
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenA);
        var pngBytesA = CreateValidPngBytes(200);
        using (var contentA = new MultipartFormDataContent())
        {
            var fileContentA = new ByteArrayContent(pngBytesA);
            contentA.Add(fileContentA, "file", "logoA.png");
            var resA = await _client.PostAsync("/api/admin/salon/profile/logo", contentA);
            Assert.Equal(HttpStatusCode.OK, resA.StatusCode);
        }

        // Admin B uploads logo for Salon B
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenB);
        var pngBytesB = CreateValidPngBytes(200);
        using (var contentB = new MultipartFormDataContent())
        {
            var fileContentB = new ByteArrayContent(pngBytesB);
            contentB.Add(fileContentB, "file", "logoB.png");
            var resB = await _client.PostAsync("/api/admin/salon/profile/logo", contentB);
            Assert.Equal(HttpStatusCode.OK, resB.StatusCode);
            var profileB = await resB.Content.ReadFromJsonAsync<SalonProfileResponse>();
            Assert.NotNull(profileB?.LogoUrl);
            Assert.StartsWith($"/uploads/salons/{salonIdB}/", profileB.LogoUrl);
        }

        // Verify Salon A's logo remains intact
        _client.DefaultRequestHeaders.Authorization = null;
        var publicResA = await _client.GetAsync($"/api/salons/{slugA}");
        var publicProfileA = await publicResA.Content.ReadFromJsonAsync<PublicSalonResponse>();
        Assert.NotNull(publicProfileA?.LogoUrl);
        Assert.StartsWith($"/uploads/salons/{salonIdA}/", publicProfileA.LogoUrl);
    }
}

