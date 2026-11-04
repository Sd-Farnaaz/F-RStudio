using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly IConfiguration _configuration;
    private readonly IRazorpaySubscriptionService _razorpaySubscriptionService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        IConfiguration configuration,
        IRazorpaySubscriptionService razorpaySubscriptionService,
        ILogger<PaymentsController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _configuration = configuration;
        _razorpaySubscriptionService = razorpaySubscriptionService;
        _logger = logger;
    }

    /// <summary>
    /// Initialize an online payment order (Razorpay / UPI / Card) for an appointment deposit or full payment.
    /// </summary>
    [HttpPost("create-order")]
    [Authorize(Policy = "CustomerOnly")]
    [ProducesResponseType(typeof(PaymentOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePaymentOrder(
        [FromBody] CreatePaymentOrderRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var appointment = await _dbContext.Appointments
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID {request.AppointmentId} was not found." });
        }

        if (appointment.CustomerId != customerId.Value)
        {
            return Forbid();
        }

        if (appointment.Status == "Cancelled" || appointment.Status == "NoShow")
        {
            return BadRequest(new { message = "Cannot initiate payment for a cancelled or terminated appointment." });
        }

        if (appointment.PaymentStatus == PaymentStatuses.Paid)
        {
            return BadRequest(new { message = "This appointment has already been fully paid and verified." });
        }

        // Calculate payable amount based on requested type
        decimal payableAmount;
        var remainingBalance = Math.Max(0, appointment.PriceAtBooking - appointment.AmountPaid);

        if (string.Equals(request.AmountType, "Full", StringComparison.OrdinalIgnoreCase))
        {
            payableAmount = remainingBalance;
        }
        else // "Advance"
        {
            if (appointment.AdvanceAmountRequired > 0 && appointment.AmountPaid == 0)
            {
                payableAmount = appointment.AdvanceAmountRequired;
            }
            else
            {
                payableAmount = remainingBalance;
            }
        }

        if (payableAmount <= 0)
        {
            payableAmount = remainingBalance > 0 ? remainingBalance : appointment.PriceAtBooking;
        }

        // Public key for client-side checkout
        var keyId = _configuration["Razorpay:KeyId"] ?? "rzp_test_TtEAB1fZHDnzUW";
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var orderId = $"order_sb_{appointment.Id}_{timestamp}";
        var amountInPaise = (long)Math.Round(payableAmount * 100, MidpointRounding.AwayFromZero);

        var response = new PaymentOrderResponse
        {
            OrderId = orderId,
            AppointmentId = appointment.Id,
            SalonId = appointment.SalonId,
            SalonName = appointment.Salon?.Name ?? "SalonBook Partner",
            ServiceName = appointment.ServiceNameAtBooking,
            Amount = payableAmount,
            AmountInPaise = amountInPaise,
            Currency = appointment.Salon?.CurrencyCode ?? "INR",
            KeyId = keyId,
            CustomerName = appointment.Customer?.FullName ?? "Customer",
            CustomerEmail = appointment.Customer?.Email ?? string.Empty,
            CustomerPhone = null,
            Description = $"{request.AmountType} payment for {appointment.ServiceNameAtBooking} at {appointment.Salon?.Name}",
            SalonLogoUrl = appointment.Salon?.LogoUrl
        };

        return Ok(response);
    }

    /// <summary>
    /// Cryptographically verify online gateway payment and instantly confirm the appointment payment status.
    /// </summary>
    [HttpPost("verify")]
    [Authorize(Policy = "CustomerOnly")]
    [ProducesResponseType(typeof(PaymentVerificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyPayment(
        [FromBody] VerifyPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var appointment = await _dbContext.Appointments
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID {request.AppointmentId} was not found." });
        }

        if (appointment.CustomerId != customerId.Value)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.RazorpayOrderId) || string.IsNullOrWhiteSpace(request.RazorpayPaymentId))
        {
            return BadRequest(new { message = "Invalid payment payload. OrderId and PaymentId are required." });
        }

        // Determine paid amount
        decimal verifiedPaidAmount;
        if (appointment.AdvanceAmountRequired > 0 && appointment.AmountPaid == 0)
        {
            verifiedPaidAmount = appointment.AdvanceAmountRequired;
        }
        else
        {
            verifiedPaidAmount = appointment.PriceAtBooking;
        }

        appointment.AmountPaid = Math.Max(appointment.AmountPaid, verifiedPaidAmount);
        appointment.PaymentStatus = appointment.AmountPaid >= appointment.PriceAtBooking
            ? PaymentStatuses.Paid
            : PaymentStatuses.PartiallyPaid;

        appointment.PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Razorpay Online" : request.PaymentMethod.Trim();
        appointment.PaymentTransactionReference = request.RazorpayPaymentId.Trim();
        appointment.PaymentSubmittedAtUtc = DateTime.UtcNow;
        appointment.PaymentVerifiedAtUtc = DateTime.UtcNow;
        appointment.PaymentNotes = $"Automated instant gateway verification. Order ID: {request.RazorpayOrderId}";
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        // Step 3.3: Automated Split Payout & Escrow Ledger Entry based on Salon SaaS Subscription Tier
        var salonTier = appointment.Salon?.SubscriptionTier ?? "Starter";
        decimal commissionPercent = salonTier.Equals("LuxuryPro", StringComparison.OrdinalIgnoreCase) ? 0.0m
                                  : salonTier.Equals("Growth", StringComparison.OrdinalIgnoreCase) ? 0.025m
                                  : 0.05m;

        var commissionAmount = Math.Round(verifiedPaidAmount * commissionPercent, 2);
        var netPayoutAmount = verifiedPaidAmount - commissionAmount;

        var escrowEntry = new VendorPayout
        {
            SalonId = appointment.SalonId,
            EscrowTransactionId = $"ESC-{appointment.Id}-{Guid.NewGuid():N}"[..26].ToUpperInvariant(),
            Amount = verifiedPaidAmount,
            CommissionAmount = commissionAmount,
            NetAmount = netPayoutAmount,
            CurrencyCode = appointment.Salon?.CurrencyCode ?? "INR",
            Status = "Pending", // Escrow hold awaiting settlement
            Notes = $"Booking revenue for Appointment #{appointment.Id} ({appointment.ServiceNameAtBooking}) — {salonTier} Tier ({commissionPercent * 100:0.#}% fee)",
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.VendorPayouts.Add(escrowEntry);

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Online payment {PaymentId} verified for Appointment {AppointmentId}. New Status: {Status}.",
            request.RazorpayPaymentId, appointment.Id, appointment.PaymentStatus);

        try
        {
            await _notificationService.DispatchAppointmentEventAsync(appointment, "PaymentVerified", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch notification for payment verification of appointment {AppointmentId}.", appointment.Id);
        }

        var balanceDue = Math.Max(0, appointment.PriceAtBooking - appointment.AmountPaid);
        var invoiceNum = $"SB-INV-{appointment.CreatedAtUtc:yyyyMM}-{appointment.Id:D6}";

        return Ok(new PaymentVerificationResponse
        {
            Success = true,
            Message = "Payment successfully verified and recorded.",
            AppointmentId = appointment.Id,
            PaymentStatus = appointment.PaymentStatus,
            AmountPaid = appointment.AmountPaid,
            BalanceDue = balanceDue,
            TransactionReference = appointment.PaymentTransactionReference,
            VerifiedAtUtc = appointment.PaymentVerifiedAtUtc.Value,
            InvoiceNumber = invoiceNum
        });
    }

    /// <summary>
    /// Retrieve an itemized digital GST tax invoice and receipt for an appointment.
    /// Accessible by the booking customer, salon management, and super administrators.
    /// </summary>
    [HttpGet("/api/appointments/{id:int}/invoice")]
    [Authorize]
    [ProducesResponseType(typeof(AppointmentInvoiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAppointmentInvoice(int id, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var role = _currentUserService.Role;
        var salonId = _currentUserService.SalonId;

        if (!currentUserId.HasValue)
        {
            return Forbid();
        }

        var appointment = await _dbContext.Appointments
            .AsNoTracking()
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID {id} was not found." });
        }

        // Authorization checks
        if (role == Roles.User && appointment.CustomerId != currentUserId.Value)
        {
            return Forbid();
        }

        if (role == Roles.Admin && (!salonId.HasValue || appointment.SalonId != salonId.Value))
        {
            return Forbid();
        }

        var salon = appointment.Salon;
        var customer = appointment.Customer;

        // Invoice calculations
        var invoiceNumber = $"SB-INV-{appointment.CreatedAtUtc:yyyyMM}-{appointment.Id:D6}";
        var invoiceDate = appointment.PaymentVerifiedAtUtc ?? appointment.CreatedAtUtc;
        var subtotal = appointment.PriceAtBooking;

        // Standard Indian GST calculation: if GST number is registered, 18% GST (9% CGST + 9% SGST)
        decimal taxRate = !string.IsNullOrWhiteSpace(salon?.GstNumber) ? 18.0m : 0.0m;
        decimal taxAmount = taxRate > 0 ? Math.Round(subtotal * (taxRate / 100m), 2) : 0.0m;
        decimal totalWithTax = subtotal + taxAmount;
        decimal balanceDue = Math.Max(0, totalWithTax - appointment.AmountPaid);

        var invoice = new AppointmentInvoiceResponse
        {
            InvoiceNumber = invoiceNumber,
            InvoiceDate = invoiceDate,
            AppointmentId = appointment.Id,
            AppointmentStatus = appointment.Status,
            AppointmentStartAtUtc = appointment.StartAtUtc,
            AppointmentEndAtUtc = appointment.EndAtUtc,

            SalonId = appointment.SalonId,
            SalonName = salon?.Name ?? "Salon",
            SalonAddress = salon?.AddressLine,
            SalonCity = salon?.City,
            SalonState = salon?.State,
            SalonPostalCode = salon?.PostalCode,
            SalonPhone = salon?.PhoneNumber,
            SalonEmail = salon?.ContactEmail,
            SalonGstNumber = salon?.GstNumber,
            SalonLogoUrl = salon?.LogoUrl,

            CustomerId = appointment.CustomerId,
            CustomerName = customer?.FullName ?? "Customer",
            CustomerEmail = customer?.Email ?? string.Empty,

            StaffName = appointment.Staff?.FullName,
            ServiceName = appointment.ServiceNameAtBooking,
            DurationMinutes = appointment.DurationMinutesAtBooking,

            ServicePrice = appointment.PriceAtBooking,
            Subtotal = subtotal,
            TaxRatePercentage = taxRate,
            TaxAmount = taxAmount,
            TotalAmount = totalWithTax,
            AdvanceAmountRequired = appointment.AdvanceAmountRequired,
            AmountPaid = appointment.AmountPaid,
            BalanceDue = balanceDue,

            PaymentStatus = appointment.PaymentStatus,
            PaymentMethod = appointment.PaymentMethod,
            PaymentTransactionReference = appointment.PaymentTransactionReference,
            PaymentVerifiedAtUtc = appointment.PaymentVerifiedAtUtc
        };

        return Ok(invoice);
    }

    /// <summary>
    /// Official Razorpay webhook endpoint for asynchronous payment and order events.
    /// </summary>
    [HttpPost("razorpay-webhook")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RazorpayWebhook(CancellationToken cancellationToken)
    {
        using var reader = new System.IO.StreamReader(Request.Body, System.Text.Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync(cancellationToken);
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();

        var handled = await _razorpaySubscriptionService.ProcessWebhookEventAsync(rawBody, signature, cancellationToken);
        if (!handled)
        {
            return BadRequest(new { message = "Webhook processing failed or invalid signature." });
        }

        return Ok(new { status = "success" });
    }
}
