using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using SalonBook.Api.DTOs;

namespace SalonBook.Tests;

public class SalonDailyOperationsIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public SalonDailyOperationsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string Token, int SalonId, string Slug)> RegisterSalonAndAdminAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var req = new RegisterAdminRequest
        {
            SalonName = $"Daily Ops Studio {suffix}",
            BusinessType = "Hair Salon",
            FullName = $"Admin {suffix}",
            Email = $"opsadmin_{suffix}@salonbook.com",
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
            FullName = $"Client {suffix}",
            Email = $"client_{suffix}@test.com",
            Password = "CustomerPass123!"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/user/register", req);
        response.EnsureSuccessStatusCode();
        var authRes = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authRes);
        return (authRes.AccessToken, authRes.User.Id);
    }

    private async Task<int> CreateStaffWithScheduleAsync(string adminToken, string name)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var req = new CreateStaffRequest
        {
            FullName = name,
            Title = "Senior Stylist",
            IsActive = true,
            WeeklySchedule = new List<StaffDayScheduleDTO>
            {
                new() { DayOfWeek = DayOfWeek.Monday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
                new() { DayOfWeek = DayOfWeek.Tuesday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
                new() { DayOfWeek = DayOfWeek.Wednesday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
                new() { DayOfWeek = DayOfWeek.Thursday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
                new() { DayOfWeek = DayOfWeek.Friday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
                new() { DayOfWeek = DayOfWeek.Saturday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
                new() { DayOfWeek = DayOfWeek.Sunday, IsWorkingDay = true, StartTime = "08:00", EndTime = "20:00" },
            }
        };
        var res = await _client.PostAsJsonAsync("/api/admin/staff", req);
        res.EnsureSuccessStatusCode();
        var staff = await res.Content.ReadFromJsonAsync<StaffResponse>();
        Assert.NotNull(staff);
        return staff.Id;
    }

    private async Task<int> CreateServiceAsync(string adminToken, string name, int duration, decimal price)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var serviceReq = new CreateServiceRequest
        {
            Name = name,
            Category = "Hair",
            DurationMinutes = duration,
            Price = price
        };
        var res = await _client.PostAsJsonAsync("/api/admin/services", serviceReq);
        res.EnsureSuccessStatusCode();
        var service = await res.Content.ReadFromJsonAsync<ServiceResponse>();
        Assert.NotNull(service);
        return service.Id;
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
    public async Task Calendar_And_RescheduleAppointment_Succeeds_AndRejectsConflicts()
    {
        // Arrange
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (custToken, custId) = await RegisterCustomerAsync();

        var staff1 = await CreateStaffWithScheduleAsync(adminToken, "Stylist A");
        var staff2 = await CreateStaffWithScheduleAsync(adminToken, "Stylist B");
        var serviceId = await CreateServiceAsync(adminToken, "Balayage", 60, 2500m);

        // Book appointment for next Monday
        var startUtc = GetNextWeekdayUtc(DayOfWeek.Monday, 10, 0);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookReq = new CreateAppointmentRequest
        {
            SalonId = salonId,
            StaffId = staff1,
            ServiceId = serviceId,
            StartAtUtc = startUtc
        };
        var bookRes = await _client.PostAsJsonAsync("/api/appointments", bookReq);
        bookRes.EnsureSuccessStatusCode();
        var appointment = await bookRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(appointment);

        // Act 1: Admin queries calendar
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var calRes = await _client.GetAsync($"/api/admin/appointments/calendar?startUtc={startUtc.AddHours(-2):O}&endUtc={startUtc.AddHours(4):O}");
        Assert.Equal(HttpStatusCode.OK, calRes.StatusCode);
        var calItems = await calRes.Content.ReadFromJsonAsync<List<AppointmentCalendarItemResponse>>();
        Assert.NotNull(calItems);
        var item = Assert.Single(calItems, a => a.Id == appointment.Id);
        Assert.Equal(staff1, item.StaffId);
        Assert.Equal(custId, item.CustomerId);
        Assert.Equal("Balayage", item.ServiceName);
        Assert.Equal(60, item.DurationMinutes);

        // Act 2: Reschedule to new time and reassign to Staff 2 (drag-and-drop simulated)
        var newStart = startUtc.AddHours(2);
        var rescheduleReq = new RescheduleAppointmentRequest
        {
            NewStartAtUtc = newStart,
            NewStaffId = staff2,
            Reason = "Client requested later time slot"
        };
        var patchRes = await _client.PatchAsJsonAsync($"/api/admin/appointments/{appointment.Id}/reschedule", rescheduleReq);
        Assert.Equal(HttpStatusCode.OK, patchRes.StatusCode);
        var updated = await patchRes.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(updated);
        Assert.Equal(newStart, updated.StartAtUtc);
        Assert.Equal(staff2, updated.StaffId);

        // Act 3: Book second appointment on Staff 1
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", custToken);
        var bookReq2 = new CreateAppointmentRequest
        {
            SalonId = salonId,
            StaffId = staff1,
            ServiceId = serviceId,
            StartAtUtc = startUtc.AddHours(4) // 14:00 on Staff 1
        };
        var bookRes2 = await _client.PostAsJsonAsync("/api/appointments", bookReq2);
        bookRes2.EnsureSuccessStatusCode();
        var apt2 = await bookRes2.Content.ReadFromJsonAsync<AppointmentResponse>();
        Assert.NotNull(apt2);

        // Attempt reschedule apt2 to overlap with Staff 2 at 12:30
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var conflictReq = new RescheduleAppointmentRequest
        {
            NewStartAtUtc = newStart.AddMinutes(30),
            NewStaffId = staff2
        };
        var conflictRes = await _client.PatchAsJsonAsync($"/api/admin/appointments/{apt2.Id}/reschedule", conflictReq);
        Assert.Equal(HttpStatusCode.Conflict, conflictRes.StatusCode);
    }

    [Fact]
    public async Task ClientDossier_ConsultationCard_And_Formulas_Workflow()
    {
        // Arrange
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var (_, custId) = await RegisterCustomerAsync();
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Color Specialist Maria");
        var serviceId = await CreateServiceAsync(adminToken, "Highlights & Toner", 90, 3200m);

        // Create visit for customer via POS
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var posReq = new CreatePosOrderRequest
        {
            CustomerId = custId,
            StaffId = staffId,
            ServiceIds = new List<int> { serviceId },
            PaymentMethod = "UPI"
        };
        var posRes = await _client.PostAsJsonAsync("/api/admin/pos/quick-checkout", posReq);
        Assert.Equal(HttpStatusCode.OK, posRes.StatusCode);

        // Act 1: Upsert Consultation Card
        var updateCardReq = new UpdateClientConsultationRequest
        {
            Allergies = "Latex, PPD sensitive scalp",
            SkinOrHairNotes = "Dry ends, porosity level 4, natural base level 5",
            PrivateStaffNotes = "Likes peppermint tea, prefers silent appointments",
            IsPatchTested = true,
            PatchTestDate = DateTime.UtcNow.AddDays(-10),
            EmergencyContactName = "John Doe",
            EmergencyContactPhone = "+919876543210"
        };
        var cardRes = await _client.PutAsJsonAsync($"/api/admin/customers/{custId}/consultation", updateCardReq);
        Assert.Equal(HttpStatusCode.OK, cardRes.StatusCode);
        var card = await cardRes.Content.ReadFromJsonAsync<ClientConsultationCardResponse>();
        Assert.NotNull(card);
        Assert.Equal("Latex, PPD sensitive scalp", card.Allergies);
        Assert.True(card.IsPatchTested);

        // Act 2: Add Formula Record
        var formulaReq = new CreateClientFormulaRequest
        {
            StaffId = staffId,
            Category = "Color",
            FormulaDetails = "Roots: 6N + 6T (1:1) with 20 Vol. Gloss ends: 9V + 9GI (equal parts) 15m.",
            Developer = "20 Vol",
            ProcessingTimeMinutes = 35,
            Notes = "Covered stubborn greys at crown perfectly"
        };
        var formRes = await _client.PostAsJsonAsync($"/api/admin/customers/{custId}/formulas", formulaReq);
        Assert.Equal(HttpStatusCode.Created, formRes.StatusCode);
        var formula = await formRes.Content.ReadFromJsonAsync<ClientFormulaRecordResponse>();
        Assert.NotNull(formula);
        Assert.Equal("Color", formula.Category);

        // Act 3: Get Client Dossier
        var dossierRes = await _client.GetAsync($"/api/admin/customers/{custId}/dossier");
        Assert.Equal(HttpStatusCode.OK, dossierRes.StatusCode);
        var dossier = await dossierRes.Content.ReadFromJsonAsync<ClientDossierResponse>();
        Assert.NotNull(dossier);
        Assert.NotNull(dossier.ConsultationCard);
        Assert.Equal("Latex, PPD sensitive scalp", dossier.ConsultationCard.Allergies);
        Assert.Single(dossier.Formulas);
        Assert.NotEmpty(dossier.VisitHistory);

        // Act 4: Delete Formula Record
        var delRes = await _client.DeleteAsync($"/api/admin/customers/{custId}/formulas/{formula.Id}");
        Assert.Equal(HttpStatusCode.OK, delRes.StatusCode);

        // Verify formula removed from dossier
        var dossierRes2 = await _client.GetAsync($"/api/admin/customers/{custId}/dossier");
        var dossier2 = await dossierRes2.Content.ReadFromJsonAsync<ClientDossierResponse>();
        Assert.NotNull(dossier2);
        Assert.Empty(dossier2.Formulas);
    }

    [Fact]
    public async Task Pos_QuickWalkInCheckout_And_ReceiptRetrieval_Succeeds()
    {
        // Arrange
        var (adminToken, salonId, _) = await RegisterSalonAndAdminAsync();
        var staffId = await CreateStaffWithScheduleAsync(adminToken, "Master Barber Alex");
        var service1 = await CreateServiceAsync(adminToken, "Men's Executive Haircut", 30, 500m);
        var service2 = await CreateServiceAsync(adminToken, "Beard Trim & Hot Towel", 20, 300m);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        // Act 1: Desk Receptionist performs 15-second Walk-In Cashier Checkout
        var posReq = new CreatePosOrderRequest
        {
            WalkInCustomerName = "Rajesh Sharma",
            WalkInCustomerPhone = "+919811223344",
            StaffId = staffId,
            ServiceIds = new List<int> { service1, service2 },
            PaymentMethod = "Cash",
            AmountReceived = 1000.00m,
            DiscountAmount = 50.00m, // ₹50 promotional discount
            Notes = "First time walk-in client"
        };

        var postRes = await _client.PostAsJsonAsync("/api/admin/pos/quick-checkout", posReq);
        Assert.Equal(HttpStatusCode.OK, postRes.StatusCode);
        var order = await postRes.Content.ReadFromJsonAsync<PosOrderResponse>();
        Assert.NotNull(order);
        Assert.True(order.AppointmentId > 0);
        Assert.StartsWith("REC-", order.ReceiptNumber);
        Assert.Equal(800.00m, order.TotalAmount); // 500 + 300
        Assert.Equal(50.00m, order.DiscountAmount);
        Assert.Equal(750.00m, order.FinalAmount); // 800 - 50
        Assert.Equal(1000.00m, order.AmountReceived);
        Assert.Equal(250.00m, order.ChangeDue); // 1000 - 750
        Assert.Equal("Paid", order.PaymentStatus);
        Assert.Equal("Cash", order.PaymentMethod);

        // Receipt verification
        Assert.NotNull(order.Receipt);
        Assert.Equal(2, order.Receipt.Items.Count);
        Assert.Equal("Rajesh Sharma", order.Receipt.CustomerName);
        Assert.Equal("+919811223344", order.Receipt.CustomerPhone);

        // Act 2: Fetch receipt directly
        var getReceiptRes = await _client.GetAsync($"/api/admin/pos/receipt/{order.AppointmentId}");
        Assert.Equal(HttpStatusCode.OK, getReceiptRes.StatusCode);
        var receipt = await getReceiptRes.Content.ReadFromJsonAsync<PosReceiptResponse>();
        Assert.NotNull(receipt);
        Assert.Equal(order.ReceiptNumber, receipt.ReceiptNumber);
        Assert.Equal(order.FinalAmount, receipt.TotalAmount);
    }
}
