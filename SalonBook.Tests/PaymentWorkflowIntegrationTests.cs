using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Tests;

public class PaymentWorkflowIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public PaymentWorkflowIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Payment Salon {suffix}",
            BusinessType = "Hair & Beauty",
            FullName = $"Admin {suffix}",
            Email = $"admin_pay_{suffix}@salonbook.com",
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
            Email = $"customer_pay_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    private async Task<int> CreateServiceAsync(string adminToken, string name = "Keratin Treatment", int durationMinutes = 60, decimal price = 1000.00m)
    {
        var req = new CreateServiceRequest
        {
            Name = name,
            Category = "Hair",
            Price = price,
            DurationMinutes = durationMinutes,
            IsActive = true
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/services")
        {
            Content = JsonContent.Create(req)
        };
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var res = await _client.SendAsync(msg);
        res.EnsureSuccessStatusCode();
        var service = await res.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(service);
        return service.Id;
    }

    private async Task<int> CreateStaffWithScheduleAsync(string adminToken, string name = "Senior Stylist Rahul")
    {
        var req = new CreateStaffRequest
        {
            FullName = name,
            Title = "Senior Stylist",
            IsActive = true,
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new() { DayOfWeek = DayOfWeek.Monday, IsWorkingDay = true, StartTime = "09:00", EndTime = "18:00" },
                new() { DayOfWeek = DayOfWeek.Tuesday, IsWorkingDay = true, StartTime = "09:00", EndTime = "18:00" },
                new() { DayOfWeek = DayOfWeek.Wednesday, IsWorkingDay = true, StartTime = "09:00", EndTime = "18:00" },
                new() { DayOfWeek = DayOfWeek.Thursday, IsWorkingDay = true, StartTime = "09:00", EndTime = "18:00" },
                new() { DayOfWeek = DayOfWeek.Friday, IsWorkingDay = true, StartTime = "09:00", EndTime = "18:00" },
                new() { DayOfWeek = DayOfWeek.Saturday, IsWorkingDay = true, StartTime = "09:00", EndTime = "18:00" },
                new() { DayOfWeek = DayOfWeek.Sunday, IsWorkingDay = false, StartTime = "09:00", EndTime = "18:00" }
            }
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, "/api/admin/staff")
        {
            Content = JsonContent.Create(req)
        };
        msg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var res = await _client.SendAsync(msg);
        res.EnsureSuccessStatusCode();
        var staff = await res.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staff);
        return staff.Id;
    }

    private static DateTime GetNextWeekdayUtc(DayOfWeek dayOfWeek, int hour = 10, int minute = 0)
    {
        var target = DateTime.UtcNow.Date.AddDays(7);
        while (target.DayOfWeek != dayOfWeek)
        {
            target = target.AddDays(1);
        }
        var istOffset = TimeSpan.FromHours(5.5);
        var localDateTime = new DateTime(target.Year, target.Month, target.Day, hour, minute, 0, DateTimeKind.Unspecified);
        return DateTime.SpecifyKind(localDateTime - istOffset, DateTimeKind.Utc);
    }

    [Fact]
    public async Task Admin_CanConfigureAndRetrievePaymentSettings_WithFixedAndPercentageAdvance()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();

        // 1. Initial Get
        using var getMsg1 = new HttpRequestMessage(HttpMethod.Get, "/api/admin/salon/payment-settings");
        getMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var getRes1 = await _client.SendAsync(getMsg1);
        Assert.Equal(HttpStatusCode.OK, getRes1.StatusCode);
        var initialSettings = await getRes1.Content.ReadFromJsonAsync<SalonPaymentSettingsResponse>();
        Assert.NotNull(initialSettings);
        Assert.Equal(salonId, initialSettings.SalonId);
        Assert.False(initialSettings.IsAdvancePaymentRequired);

        // 2. Configure Fixed Advance
        var updateReq1 = new UpdateSalonPaymentSettingsRequest
        {
            UpiId = "salon@okhdfcbank",
            QrCodeImageUrl = "/uploads/qr/salon-qr.png",
            IsAdvancePaymentRequired = true,
            AdvancePaymentType = AdvancePaymentTypes.Fixed,
            AdvancePaymentValue = 250.00m
        };
        using var putMsg1 = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/payment-settings")
        {
            Content = JsonContent.Create(updateReq1)
        };
        putMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putRes1 = await _client.SendAsync(putMsg1);
        Assert.Equal(HttpStatusCode.OK, putRes1.StatusCode);
        var updated1 = await putRes1.Content.ReadFromJsonAsync<SalonPaymentSettingsResponse>();
        Assert.NotNull(updated1);
        Assert.Equal("salon@okhdfcbank", updated1.UpiId);
        Assert.Equal("/uploads/qr/salon-qr.png", updated1.QrCodeImageUrl);
        Assert.True(updated1.IsAdvancePaymentRequired);
        Assert.Equal(AdvancePaymentTypes.Fixed, updated1.AdvancePaymentType);
        Assert.Equal(250.00m, updated1.AdvancePaymentValue);

        // 3. Configure Percentage Advance
        var updateReq2 = new UpdateSalonPaymentSettingsRequest
        {
            UpiId = "salon@okicici",
            QrCodeImageUrl = "/uploads/qr/salon-qr2.png",
            IsAdvancePaymentRequired = true,
            AdvancePaymentType = AdvancePaymentTypes.Percentage,
            AdvancePaymentValue = 30.00m
        };
        using var putMsg2 = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/payment-settings")
        {
            Content = JsonContent.Create(updateReq2)
        };
        putMsg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putRes2 = await _client.SendAsync(putMsg2);
        Assert.Equal(HttpStatusCode.OK, putRes2.StatusCode);
        var updated2 = await putRes2.Content.ReadFromJsonAsync<SalonPaymentSettingsResponse>();
        Assert.NotNull(updated2);
        Assert.Equal("salon@okicici", updated2.UpiId);
        Assert.Equal(AdvancePaymentTypes.Percentage, updated2.AdvancePaymentType);
        Assert.Equal(30.00m, updated2.AdvancePaymentValue);
    }

    [Fact]
    public async Task Admin_RejectsInvalidPaymentSettings_PercentageOutOfRange_OrMissingValues()
    {
        var (adminToken, _, _) = await RegisterSalonAndAdminAsync();

        // 1. Percentage > 100
        var invalidReq1 = new UpdateSalonPaymentSettingsRequest
        {
            UpiId = "salon@upi",
            IsAdvancePaymentRequired = true,
            AdvancePaymentType = AdvancePaymentTypes.Percentage,
            AdvancePaymentValue = 150.00m // Invalid!
        };
        using var msg1 = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/payment-settings")
        {
            Content = JsonContent.Create(invalidReq1)
        };
        msg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var res1 = await _client.SendAsync(msg1);
        Assert.Equal(HttpStatusCode.BadRequest, res1.StatusCode);

        // 2. Advance required with null value
        var invalidReq2 = new UpdateSalonPaymentSettingsRequest
        {
            UpiId = "salon@upi",
            IsAdvancePaymentRequired = true,
            AdvancePaymentType = AdvancePaymentTypes.Fixed,
            AdvancePaymentValue = null // Invalid!
        };
        using var msg2 = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/payment-settings")
        {
            Content = JsonContent.Create(invalidReq2)
        };
        msg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var res2 = await _client.SendAsync(msg2);
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);
    }

    [Fact]
    public async Task CustomerBooking_CalculatesAndSnapshots_AdvanceAmountRequired()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var serviceId = await CreateServiceAsync(adminToken, "Bridal Makeup", 90, 2000.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Artist Priya");

        // 1. Configure 25% Advance
        var paymentSettings = new UpdateSalonPaymentSettingsRequest
        {
            UpiId = "bridal@okaxis",
            QrCodeImageUrl = "/uploads/qr/bridal.png",
            IsAdvancePaymentRequired = true,
            AdvancePaymentType = AdvancePaymentTypes.Percentage,
            AdvancePaymentValue = 25.00m // 25% of 2000 = 500
        };
        using var putMsg = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/payment-settings")
        {
            Content = JsonContent.Create(paymentSettings)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putRes = await _client.SendAsync(putMsg);
        putRes.EnsureSuccessStatusCode();

        // 2. Customer books appointment
        var startUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 10, 0);
        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = startUtc
        };
        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        Assert.Equal(HttpStatusCode.Created, bookRes.StatusCode);
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        Assert.Equal(2000.00m, booking.Price);
        Assert.Equal(500.00m, booking.AdvanceAmountRequired);
        Assert.Equal(0.00m, booking.AmountPaid);
        Assert.Equal(PaymentStatuses.Pending, booking.PaymentStatus);
        Assert.Equal("bridal@okaxis", booking.SalonUpiId);
        Assert.Equal("/uploads/qr/bridal.png", booking.SalonQrCodeImageUrl);
    }

    [Fact]
    public async Task Customer_CanSubmitPaymentProof_AndAdminCanVerifyPayment()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var serviceId = await CreateServiceAsync(adminToken, "Hair Spa", 45, 800.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Stylist Anita");

        // 1. Setup Fixed advance of 200
        var paymentSettings = new UpdateSalonPaymentSettingsRequest
        {
            UpiId = "spa@paytm",
            IsAdvancePaymentRequired = true,
            AdvancePaymentType = AdvancePaymentTypes.Fixed,
            AdvancePaymentValue = 200.00m
        };
        using var putMsg = new HttpRequestMessage(HttpMethod.Put, "/api/admin/salon/payment-settings")
        {
            Content = JsonContent.Create(paymentSettings)
        };
        putMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var putRes = await _client.SendAsync(putMsg);
        putRes.EnsureSuccessStatusCode();

        // 2. Customer books
        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Tuesday, 11, 0)
        };
        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        // 3. Customer submits payment reference / UTR
        var proofReq = new SubmitPaymentProofRequest
        {
            PaymentTransactionReference = "UTR20261010998877",
            PaymentMethod = "UPI",
            PaymentProofUrl = "/uploads/proofs/receipt1.jpg",
            AmountPaid = 200.00m
        };
        using var proofMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking.Id}/payment-proof")
        {
            Content = JsonContent.Create(proofReq)
        };
        proofMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var proofRes = await _client.SendAsync(proofMsg);
        Assert.Equal(HttpStatusCode.OK, proofRes.StatusCode);
        var proofUpdated = await proofRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(proofUpdated);
        Assert.Equal("UTR20261010998877", proofUpdated.PaymentTransactionReference);
        Assert.Equal(200.00m, proofUpdated.AmountPaid);
        Assert.NotNull(proofUpdated.PaymentSubmittedAtUtc);

        // 4. Admin verifies payment
        var verifyReq = new VerifyAppointmentPaymentRequest
        {
            PaymentStatus = PaymentStatuses.Paid,
            AmountPaid = 200.00m,
            PaymentMethod = "UPI",
            PaymentTransactionReference = "UTR20261010998877",
            Notes = "Verified in salon bank statement."
        };
        using var verifyMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/appointments/{booking.Id}/verify-payment")
        {
            Content = JsonContent.Create(verifyReq)
        };
        verifyMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var verifyRes = await _client.SendAsync(verifyMsg);
        Assert.Equal(HttpStatusCode.OK, verifyRes.StatusCode);
        var verified = await verifyRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(verified);
        Assert.Equal(PaymentStatuses.Paid, verified.PaymentStatus);
        Assert.Equal(200.00m, verified.AmountPaid);
        Assert.NotNull(verified.PaymentVerifiedAtUtc);
        Assert.NotNull(verified.PaymentVerifiedBy);
        Assert.Equal("Verified in salon bank statement.", verified.PaymentNotes);
    }

    [Fact]
    public async Task PaymentWorkflow_TenantIsolation_And_RoleSecurity_Enforced()
    {
        var (adminTokenA, salonIdA, _) = await RegisterSalonAndAdminAsync();
        var (adminTokenB, salonIdB, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var serviceIdA = await CreateServiceAsync(adminTokenA, "Service A", 30, 500.00m);
        var staffIdA = await CreateStaffWithScheduleAsync(adminTokenA, "Staff A");

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonIdA,
            ServiceId = serviceIdA,
            StaffId = staffIdA,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Wednesday, 14, 0)
        };
        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        // Admin B attempts to verify payment for Salon A appointment -> 404
        var verifyReq = new VerifyAppointmentPaymentRequest
        {
            PaymentStatus = PaymentStatuses.Paid,
            AmountPaid = 500.00m
        };
        using var verifyMsgB = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/appointments/{booking.Id}/verify-payment")
        {
            Content = JsonContent.Create(verifyReq)
        };
        verifyMsgB.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminTokenB);
        var verifyResB = await _client.SendAsync(verifyMsgB);
        Assert.Equal(HttpStatusCode.NotFound, verifyResB.StatusCode);

        // Customer attempts to call Admin verify payment -> 403 Forbidden
        using var custVerifyMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/appointments/{booking.Id}/verify-payment")
        {
            Content = JsonContent.Create(verifyReq)
        };
        custVerifyMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var custVerifyRes = await _client.SendAsync(custVerifyMsg);
        Assert.Equal(HttpStatusCode.Forbidden, custVerifyRes.StatusCode);
    }

    [Fact]
    public async Task Customer_RejectsOverpayment_DuplicateUtr_AndTerminalStatuses()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken1, _) = await RegisterCustomerAsync();
        var (custToken2, _) = await RegisterCustomerAsync();

        var serviceId = await CreateServiceAsync(adminToken, "Facial Glow", 45, 600.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Staff Mona");

        // 1. Book appointment 1
        var bookReq1 = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Thursday, 12, 0)
        };
        using var bookMsg1 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq1)
        };
        bookMsg1.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken1);
        var bookRes1 = await _client.SendAsync(bookMsg1);
        var booking1 = await bookRes1.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking1);

        // 2. Overpayment attempt (AmountPaid > 600) -> 400 Bad Request
        var overpayReq = new SubmitPaymentProofRequest
        {
            PaymentTransactionReference = "UTR_OVERPAY_1",
            AmountPaid = 9999.00m // Exceeds 600
        };
        using var overpayMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking1.Id}/payment-proof")
        {
            Content = JsonContent.Create(overpayReq)
        };
        overpayMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken1);
        var overpayRes = await _client.SendAsync(overpayMsg);
        Assert.Equal(HttpStatusCode.BadRequest, overpayRes.StatusCode);

        // 3. Valid payment submission on appointment 1
        var validProofReq = new SubmitPaymentProofRequest
        {
            PaymentTransactionReference = "UTR_SHARED_12345",
            AmountPaid = 300.00m
        };
        using var validProofMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking1.Id}/payment-proof")
        {
            Content = JsonContent.Create(validProofReq)
        };
        validProofMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken1);
        var validProofRes = await _client.SendAsync(validProofMsg);
        Assert.Equal(HttpStatusCode.OK, validProofRes.StatusCode);

        // 4. Book appointment 2 by customer 2 and attempt same UTR -> 409 Conflict
        var bookReq2 = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Thursday, 15, 0)
        };
        using var bookMsg2 = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq2)
        };
        bookMsg2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken2);
        var bookRes2 = await _client.SendAsync(bookMsg2);
        var booking2 = await bookRes2.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking2);

        var dupUtrReq = new SubmitPaymentProofRequest
        {
            PaymentTransactionReference = "UTR_SHARED_12345", // Duplicate!
            AmountPaid = 300.00m
        };
        using var dupUtrMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking2.Id}/payment-proof")
        {
            Content = JsonContent.Create(dupUtrReq)
        };
        dupUtrMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken2);
        var dupUtrRes = await _client.SendAsync(dupUtrMsg);
        Assert.Equal(HttpStatusCode.Conflict, dupUtrRes.StatusCode);

        // 5. Cancel appointment 2 and attempt payment proof -> 400 Bad Request
        using var cancelMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking2.Id}/cancel");
        cancelMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken2);
        var cancelRes = await _client.SendAsync(cancelMsg);
        cancelRes.EnsureSuccessStatusCode();

        using var proofOnCancelledMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/appointments/{booking2.Id}/payment-proof")
        {
            Content = JsonContent.Create(new SubmitPaymentProofRequest { PaymentTransactionReference = "UTR_AFTER_CANCEL_99" })
        };
        proofOnCancelledMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken2);
        var proofOnCancelledRes = await _client.SendAsync(proofOnCancelledMsg);
        Assert.Equal(HttpStatusCode.BadRequest, proofOnCancelledRes.StatusCode);
    }

    [Fact]
    public async Task PaymentWorkflow_PartialPayment_And_Refund_Transitions()
    {
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, _) = await RegisterCustomerAsync();

        var serviceId = await CreateServiceAsync(adminToken, "Full Package", 60, 1200.00m);
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Staff Tina");

        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            ServiceId = serviceId,
            StaffId = staffId,
            StartAtUtc = GetNextWeekdayUtc(DayOfWeek.Friday, 16, 0)
        };
        using var bookMsg = new HttpRequestMessage(HttpMethod.Post, "/api/appointments")
        {
            Content = JsonContent.Create(bookReq)
        };
        bookMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookRes = await _client.SendAsync(bookMsg);
        var booking = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(booking);

        // 1. Admin marks PartiallyPaid (e.g. ₹400 advance received)
        var partialReq = new VerifyAppointmentPaymentRequest
        {
            PaymentStatus = PaymentStatuses.PartiallyPaid,
            AmountPaid = 400.00m,
            PaymentMethod = "UPI",
            PaymentTransactionReference = "UTR_PARTIAL_400"
        };
        using var partialMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/appointments/{booking.Id}/verify-payment")
        {
            Content = JsonContent.Create(partialReq)
        };
        partialMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var partialRes = await _client.SendAsync(partialMsg);
        Assert.Equal(HttpStatusCode.OK, partialRes.StatusCode);
        var partial = await partialRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(partial);
        Assert.Equal(PaymentStatuses.PartiallyPaid, partial.PaymentStatus);
        Assert.Equal(400.00m, partial.AmountPaid);

        // 2. Admin marks Paid when remainder is settled
        var fullReq = new VerifyAppointmentPaymentRequest
        {
            PaymentStatus = PaymentStatuses.Paid,
            AmountPaid = 1200.00m,
            PaymentMethod = "Cash"
        };
        using var fullMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/appointments/{booking.Id}/verify-payment")
        {
            Content = JsonContent.Create(fullReq)
        };
        fullMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var fullRes = await _client.SendAsync(fullMsg);
        Assert.Equal(HttpStatusCode.OK, fullRes.StatusCode);
        var full = await fullRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(full);
        Assert.Equal(PaymentStatuses.Paid, full.PaymentStatus);
        Assert.Equal(1200.00m, full.AmountPaid);

        // 3. Admin marks Refunded
        var refundReq = new VerifyAppointmentPaymentRequest
        {
            PaymentStatus = PaymentStatuses.Refunded,
            Notes = "Customer cancelled due to emergency, refunded in full."
        };
        using var refundMsg = new HttpRequestMessage(HttpMethod.Post, $"/api/admin/appointments/{booking.Id}/verify-payment")
        {
            Content = JsonContent.Create(refundReq)
        };
        refundMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var refundRes = await _client.SendAsync(refundMsg);
        Assert.Equal(HttpStatusCode.OK, refundRes.StatusCode);
        var refunded = await refundRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(refunded);
        Assert.Equal(PaymentStatuses.Refunded, refunded.PaymentStatus);
    }
}

