using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/pos")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminPosController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AdminPosController> _logger;

    public AdminPosController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        IPasswordHasher<User> passwordHasher,
        ILogger<AdminPosController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    /// <summary>
    /// Fast 15-second walk-in checkout: creates a completed appointment, records in-salon payment,
    /// and generates a digital/printable receipt.
    /// </summary>
    [HttpPost("quick-checkout")]
    [ProducesResponseType(typeof(PosOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> QuickCheckout([FromBody] CreatePosOrderRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        var adminUserId = _currentUserService.UserId;
        if (!salonId.HasValue || !adminUserId.HasValue)
        {
            return Forbid();
        }

        if (request.ServiceIds == null || request.ServiceIds.Count == 0)
        {
            return BadRequest(new { message = "At least one service must be selected." });
        }

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == salonId.Value, cancellationToken);
        if (salon == null)
        {
            return NotFound(new { message = "Salon not found." });
        }

        // Validate Staff
        var staff = await _dbContext.Staff
            .FirstOrDefaultAsync(s => s.Id == request.StaffId && s.SalonId == salonId.Value && s.IsActive, cancellationToken);
        if (staff == null)
        {
            return BadRequest(new { message = "Selected staff member is invalid or inactive." });
        }

        // Validate Services
        var services = await _dbContext.Services
            .Where(s => request.ServiceIds.Contains(s.Id) && s.SalonId == salonId.Value && s.IsActive)
            .ToListAsync(cancellationToken);

        if (services.Count == 0)
        {
            return BadRequest(new { message = "None of the selected services were found or active in your salon." });
        }

        // Customer resolution: existing or walk-in guest account
        User? customer = null;
        if (request.CustomerId.HasValue)
        {
            customer = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Id == request.CustomerId.Value && u.Role == Roles.User, cancellationToken);
        }

        if (customer == null)
        {
            var guestName = string.IsNullOrWhiteSpace(request.WalkInCustomerName) ? "Walk-In Guest" : request.WalkInCustomerName.Trim();
            var email = !string.IsNullOrWhiteSpace(request.WalkInCustomerEmail)
                ? request.WalkInCustomerEmail.Trim().ToLowerInvariant()
                : $"walkin_{Guid.NewGuid():N}[..8]@guest.salonbook";

            // Check if user with that email already exists
            customer = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
            if (customer == null)
            {
                customer = new User
                {
                    FullName = guestName,
                    Email = email,
                    Role = Roles.User,
                    SalonId = salonId.Value,
                    IsActive = true,
                    IsEmailVerified = false,
                    CreatedAtUtc = DateTime.UtcNow
                };
                customer.PasswordHash = _passwordHasher.HashPassword(customer, Guid.NewGuid().ToString("N"));
                _dbContext.Users.Add(customer);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        var primaryService = services[0];
        var combinedServiceName = services.Count == 1 ? primaryService.Name : string.Join(" + ", services.Select(s => s.Name));
        var totalDuration = services.Sum(s => s.DurationMinutes);
        var subtotal = services.Sum(s => s.Price);
        var finalTotal = Math.Max(0.00m, subtotal - request.DiscountAmount);

        var amountReceived = request.AmountReceived ?? finalTotal;
        var changeDue = Math.Max(0.00m, amountReceived - finalTotal);

        var now = DateTime.UtcNow;
        var appointment = new Appointment
        {
            SalonId = salonId.Value,
            CustomerId = customer.Id,
            StaffId = staff.Id,
            ServiceId = primaryService.Id,
            ServiceNameAtBooking = combinedServiceName,
            DurationMinutesAtBooking = totalDuration,
            PriceAtBooking = finalTotal,
            StartAtUtc = now.AddMinutes(-totalDuration),
            EndAtUtc = now,
            Status = "Completed",
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            AdvanceAmountRequired = 0.00m,
            AmountPaid = finalTotal,
            PaymentStatus = "Paid",
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim(),
            PaymentTransactionReference = request.PaymentTransactionReference ?? $"POS-{now:yyyyMMddHHmmss}",
            PaymentVerifiedAtUtc = now,
            PaymentVerifiedByUserId = adminUserId.Value,
            PaymentNotes = $"POS Quick Checkout. Subtotal: {subtotal}, Discount: {request.DiscountAmount}",
            CustomerNotes = request.Notes
        };

        _dbContext.Appointments.Add(appointment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var receiptNumber = $"REC-{appointment.Id:D5}-{now:yyyyMMdd}";

        var receiptItems = services.Select(s => new PosReceiptItem
        {
            ServiceId = s.Id,
            ServiceName = s.Name,
            Price = s.Price,
            DurationMinutes = s.DurationMinutes
        }).ToList();

        var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId.Value, cancellationToken);
        var cashierName = adminUser?.FullName ?? "Salon Receptionist";

        var receipt = new PosReceiptResponse
        {
            ReceiptNumber = receiptNumber,
            AppointmentId = appointment.Id,
            IssuedAtUtc = now,
            SalonName = salon.Name,
            SalonAddress = salon.AddressLine,
            SalonCity = salon.City,
            SalonPhone = salon.PhoneNumber,
            SalonEmail = salon.ContactEmail,
            SalonUpiId = salon.UpiId,
            SalonLogoUrl = salon.LogoUrl,
            CashierName = cashierName,
            CustomerName = customer.FullName,
            CustomerPhone = request.WalkInCustomerPhone,
            CustomerEmail = customer.Email.EndsWith("@guest.salonbook") ? null : customer.Email,
            StaffName = staff.FullName,
            Items = receiptItems,
            SubTotal = subtotal,
            DiscountAmount = request.DiscountAmount,
            TotalAmount = finalTotal,
            PaymentMethod = appointment.PaymentMethod ?? "Cash",
            PaymentStatus = appointment.PaymentStatus,
            AmountReceived = amountReceived,
            ChangeDue = changeDue,
            TransactionReference = appointment.PaymentTransactionReference,
            Notes = request.Notes ?? "Thank you for visiting us! See you soon."
        };

        var response = new PosOrderResponse
        {
            AppointmentId = appointment.Id,
            ReceiptNumber = receiptNumber,
            TotalAmount = subtotal,
            DiscountAmount = request.DiscountAmount,
            FinalAmount = finalTotal,
            AmountReceived = amountReceived,
            ChangeDue = changeDue,
            PaymentMethod = appointment.PaymentMethod ?? "Cash",
            PaymentStatus = appointment.PaymentStatus,
            CreatedAtUtc = now,
            Receipt = receipt
        };

        _logger.LogInformation("POS Quick Checkout completed for Salon {SalonId}, Appointment {AppointmentId}, Total {FinalAmount} by Cashier {Cashier}",
            salonId.Value, appointment.Id, finalTotal, cashierName);

        return Ok(response);
    }

    /// <summary>
    /// Retrieve digital printable receipt data for an appointment.
    /// </summary>
    [HttpGet("receipt/{appointmentId:int}")]
    [ProducesResponseType(typeof(PosReceiptResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReceipt(int appointmentId, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var appointment = await _dbContext.Appointments
            .AsNoTracking()
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .Include(a => a.PaymentVerifiedByUser)
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.SalonId == salonId.Value, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment not found in your salon." });
        }

        var receiptNumber = $"REC-{appointment.Id:D5}-{appointment.CreatedAtUtc:yyyyMMdd}";

        var receipt = new PosReceiptResponse
        {
            ReceiptNumber = receiptNumber,
            AppointmentId = appointment.Id,
            IssuedAtUtc = appointment.CreatedAtUtc,
            SalonName = appointment.Salon.Name,
            SalonAddress = appointment.Salon.AddressLine,
            SalonCity = appointment.Salon.City,
            SalonPhone = appointment.Salon.PhoneNumber,
            SalonEmail = appointment.Salon.ContactEmail,
            SalonUpiId = appointment.Salon.UpiId,
            SalonLogoUrl = appointment.Salon.LogoUrl,
            CashierName = appointment.PaymentVerifiedByUser?.FullName ?? "Desk Receptionist",
            CustomerName = appointment.Customer.FullName,
            CustomerPhone = null,
            CustomerEmail = appointment.Customer.Email.EndsWith("@guest.salonbook") ? null : appointment.Customer.Email,
            StaffName = appointment.Staff.FullName,
            Items = new List<PosReceiptItem>
            {
                new PosReceiptItem
                {
                    ServiceId = appointment.ServiceId,
                    ServiceName = appointment.ServiceNameAtBooking,
                    Price = appointment.PriceAtBooking,
                    DurationMinutes = appointment.DurationMinutesAtBooking
                }
            },
            SubTotal = appointment.PriceAtBooking,
            DiscountAmount = 0.00m,
            TotalAmount = appointment.PriceAtBooking,
            PaymentMethod = appointment.PaymentMethod ?? "Cash",
            PaymentStatus = appointment.PaymentStatus,
            AmountReceived = appointment.AmountPaid,
            ChangeDue = 0.00m,
            TransactionReference = appointment.PaymentTransactionReference,
            Notes = "Thank you for choosing us! Please retain this receipt."
        };

        return Ok(receipt);
    }
}
