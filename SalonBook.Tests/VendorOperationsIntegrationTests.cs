using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class VendorOperationsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public VendorOperationsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Studio {suffix}",
            BusinessType = "Barber & Spa",
            FullName = $"Owner {suffix}",
            Email = $"owner_{suffix}@salonbook.com",
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
    public async Task GetRevenueAnalytics_ReturnsAccurateMonthlyBreakdownAndMilestones()
    {
        var (token, salonId, _) = await RegisterSalonAndAdminAsync();

        // Seed some payouts directly via DbContext
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.VendorPayouts.AddRange(
                new VendorPayout
                {
                    SalonId = salonId,
                    EscrowTransactionId = $"TXN-{Guid.NewGuid():N}",
                    Amount = 1000.00m,
                    CommissionAmount = 100.00m,
                    NetAmount = 900.00m,
                    Status = "Disbursed",
                    UtrNumber = "UTR1234567890",
                    BankReleaseAtUtc = DateTime.UtcNow.AddDays(-2),
                    DisbursedAtUtc = DateTime.UtcNow.AddDays(-1),
                    CreatedAtUtc = DateTime.UtcNow
                },
                new VendorPayout
                {
                    SalonId = salonId,
                    EscrowTransactionId = $"TXN-{Guid.NewGuid():N}",
                    Amount = 500.00m,
                    CommissionAmount = 50.00m,
                    NetAmount = 450.00m,
                    Status = "Pending",
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await dbContext.SaveChangesAsync();
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/analytics/revenue?months=6");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var analytics = await response.Content.ReadFromJsonAsync<VendorRevenueAnalyticsResponse>();
        Assert.NotNull(analytics);
        Assert.Equal("INR", analytics.CurrencyCode);
        Assert.Equal(900.00m, analytics.TotalRealizedRevenue);
        Assert.Equal(450.00m, analytics.TotalPendingPipeline);
        Assert.True(analytics.AnnualTarget > 0);
        Assert.NotEmpty(analytics.MonthlyBreakdown);
        Assert.NotEmpty(analytics.Milestones);
    }

    [Fact]
    public async Task GetPayoutsAndEscrowLedger_ReturnsSettlementDetailsAndEnforcesTenantIsolation()
    {
        var (tokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (tokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();

        var txnA = $"ESCROW-A-{Guid.NewGuid():N}";
        var txnB = $"ESCROW-B-{Guid.NewGuid():N}";

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            dbContext.VendorPayouts.AddRange(
                new VendorPayout
                {
                    SalonId = salonIdA,
                    EscrowTransactionId = txnA,
                    Amount = 2500.00m,
                    CommissionAmount = 250.00m,
                    NetAmount = 2250.00m,
                    Status = "Disbursed",
                    UtrNumber = "UTR-A-99999",
                    BankReleaseAtUtc = DateTime.UtcNow.AddDays(-3),
                    DisbursedAtUtc = DateTime.UtcNow.AddDays(-2),
                    CreatedAtUtc = DateTime.UtcNow
                },
                new VendorPayout
                {
                    SalonId = salonIdB,
                    EscrowTransactionId = txnB,
                    Amount = 1500.00m,
                    CommissionAmount = 150.00m,
                    NetAmount = 1350.00m,
                    Status = "Pending",
                    CreatedAtUtc = DateTime.UtcNow
                }
            );
            await dbContext.SaveChangesAsync();
        }

        // Vendor A queries /api/vendors/payouts
        using var reqA = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/payouts");
        reqA.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var resA = await _client.SendAsync(reqA);
        Assert.Equal(HttpStatusCode.OK, resA.StatusCode);
        var payoutsA = await resA.Content.ReadFromJsonAsync<PagedResult<VendorPayoutResponse>>();
        Assert.NotNull(payoutsA);
        Assert.Contains(payoutsA.Items, p => p.EscrowTransactionId == txnA);
        Assert.DoesNotContain(payoutsA.Items, p => p.EscrowTransactionId == txnB);

        // Vendor A queries /api/vendors/escrow-ledger
        using var reqLedger = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/escrow-ledger");
        reqLedger.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenA);
        var resLedger = await _client.SendAsync(reqLedger);
        Assert.Equal(HttpStatusCode.OK, resLedger.StatusCode);
        var ledger = await resLedger.Content.ReadFromJsonAsync<EscrowLedgerResponse>();
        Assert.NotNull(ledger);
        Assert.Equal(2250.00m, ledger.TotalDisbursed);
        Assert.Equal(0.00m, ledger.TotalEscrowHold);
        Assert.Contains(ledger.Transactions.Items, p => p.EscrowTransactionId == txnA);
    }

    [Fact]
    public async Task GetAuditTrailAndComplianceHistory_ReturnsKycLogAndDisputes()
    {
        var (token, salonId, _) = await RegisterSalonAndAdminAsync();

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var salon = await dbContext.Salons.FindAsync(salonId);
            if (salon != null)
            {
                salon.KycStatus = "Verified";
                salon.IsVerified = true;
                salon.GstNumber = "27AAAAA0000A1Z5";
            }

            dbContext.VendorComplianceLogs.AddRange(
                new VendorComplianceLog
                {
                    SalonId = salonId,
                    EventType = "KYC_Verification",
                    Status = "Approved",
                    DocumentType = "GST_Certificate",
                    DocumentUrl = "/uploads/kyc/gst_cert.pdf",
                    ReviewedBy = "superadmin@salonbook.com",
                    ReviewedAtUtc = DateTime.UtcNow.AddDays(-5),
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-6)
                },
                new VendorComplianceLog
                {
                    SalonId = salonId,
                    EventType = "Dispute_Raised",
                    Status = "Resolved",
                    DisputeDetails = "Customer disputed service cancellation refund.",
                    CustomerIdentifier = "cust_54321@test.com",
                    DisputedAmount = 450.00m,
                    ReviewedBy = "superadmin@salonbook.com",
                    ReviewedAtUtc = DateTime.UtcNow.AddDays(-1),
                    CreatedAtUtc = DateTime.UtcNow.AddDays(-2)
                }
            );
            await dbContext.SaveChangesAsync();
        }

        // Query /api/vendors/audit-trail
        using var reqAudit = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/audit-trail");
        reqAudit.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resAudit = await _client.SendAsync(reqAudit);

        Assert.Equal(HttpStatusCode.OK, resAudit.StatusCode);
        var auditTrail = await resAudit.Content.ReadFromJsonAsync<ComplianceAuditTrailResponse>();
        Assert.NotNull(auditTrail);
        Assert.True(auditTrail.KycStatus.IsVerified);
        Assert.Equal("Verified", auditTrail.KycStatus.KycStatus);
        Assert.Equal("27AAAAA0000A1Z5", auditTrail.KycStatus.GstNumber);
        Assert.Contains(auditTrail.AuditLogs, l => l.EventType == "KYC_Verification");
        Assert.Contains(auditTrail.Disputes, d => d.EventType == "Dispute_Raised");

        // Query alias /api/vendors/compliance-history
        using var reqComp = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/compliance-history");
        reqComp.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resComp = await _client.SendAsync(reqComp);
        Assert.Equal(HttpStatusCode.OK, resComp.StatusCode);
    }

    [Fact]
    public async Task UploadMedia_SucceedsForValidFile_AndRejectsInvalidFileType()
    {
        var (token, salonId, _) = await RegisterSalonAndAdminAsync();

        // 1. Successful PDF upload
        using var form = new MultipartFormDataContent();
        var fileBytes = Encoding.UTF8.GetBytes("%PDF-1.4 simulated pdf document content for kyc");
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(fileContent, "file", "gst_registration.pdf");
        form.Add(new StringContent("kyc"), "category");

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/vendors/media/upload")
        {
            Content = form
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var uploadResult = await response.Content.ReadFromJsonAsync<MediaUploadResponse>();
        Assert.NotNull(uploadResult);
        Assert.StartsWith("/uploads/kyc/", uploadResult.FileUrl);
        Assert.Equal("gst_registration.pdf", uploadResult.OriginalFileName);
        Assert.Equal("kyc", uploadResult.Category);

        // 2. Reject unsupported file extension (e.g. .exe)
        using var invalidForm = new MultipartFormDataContent();
        var exeBytes = Encoding.UTF8.GetBytes("fake executable binary");
        var exeContent = new ByteArrayContent(exeBytes);
        invalidForm.Add(exeContent, "file", "malware.exe");

        using var invalidRequest = new HttpRequestMessage(HttpMethod.Post, "/api/vendors/media/upload")
        {
            Content = invalidForm
        };
        invalidRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var invalidRes = await _client.SendAsync(invalidRequest);

        Assert.Equal(HttpStatusCode.BadRequest, invalidRes.StatusCode);
    }

    [Fact]
    public async Task Customer_CannotAccess_VendorOperationsEndpoints()
    {
        var customerToken = await RegisterCustomerAsync();

        using var reqAnalytics = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/analytics/revenue");
        reqAnalytics.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var resAnalytics = await _client.SendAsync(reqAnalytics);
        Assert.Equal(HttpStatusCode.Forbidden, resAnalytics.StatusCode);

        using var reqPayouts = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/payouts");
        reqPayouts.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var resPayouts = await _client.SendAsync(reqPayouts);
        Assert.Equal(HttpStatusCode.Forbidden, resPayouts.StatusCode);

        using var reqAudit = new HttpRequestMessage(HttpMethod.Get, "/api/vendors/audit-trail");
        reqAudit.Headers.Authorization = new AuthenticationHeaderValue("Bearer", customerToken);
        var resAudit = await _client.SendAsync(reqAudit);
        Assert.Equal(HttpStatusCode.Forbidden, resAudit.StatusCode);
    }
}

