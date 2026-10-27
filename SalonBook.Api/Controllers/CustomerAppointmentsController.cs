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
[Route("api/appointments")]
[Authorize(Policy = "CustomerOnly")]
public class CustomerAppointmentsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IBookingService _bookingService;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<CustomerAppointmentsController> _logger;

    public CustomerAppointmentsController(
        ApplicationDbContext dbContext,
        IBookingService bookingService,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        ILogger<CustomerAppointmentsController> logger)
    {
        _dbContext = dbContext;
        _bookingService = bookingService;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Book a new salon appointment as an authenticated customer.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(AppointmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAppointment(
        [FromBody] CreateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        try
        {
            var appointment = await _bookingService.CreateAppointmentAsync(customerId.Value, request, cancellationToken);
            return CreatedAtAction(nameof(GetAppointmentById), new { id = appointment.Id }, appointment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieve paginated booking history for the authenticated customer.
    /// </summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(PagedResult<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMyBookings(
        [FromQuery] string? status,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.CustomerId == customerId.Value);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim();
            query = query.Where(a => a.Status == normalizedStatus);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(a => a.StartAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(a => a.StartAtUtc <= toUtc.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var appointments = await query
            .OrderByDescending(a => a.StartAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .Include(a => a.Review)
            .Select(a => MapToResponse(a))
            .ToListAsync(cancellationToken);

        var result = new PagedResult<AppointmentResponse>
        {
            Items = appointments,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(result);
    }

    /// <summary>
    /// Retrieve details of an individual booking owned by the customer.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AppointmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAppointmentById(int id, CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var appointment = await _dbContext.Appointments
            .AsNoTracking()
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .Include(a => a.Review)
            .FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId.Value, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment not found in your bookings." });
        }

        return Ok(MapToResponse(appointment));
    }

    /// <summary>
    /// Cancel a scheduled booking owned by the customer.
    /// </summary>
    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType(typeof(AppointmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelAppointment(
        int id,
        [FromBody] CancelAppointmentRequest? request,
        CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        try
        {
            var cancelled = await _bookingService.CancelCustomerAppointmentAsync(
                customerId.Value, id, request?.Reason, cancellationToken);
            return Ok(cancelled);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit payment transaction reference (e.g. UTR / UPI Ref) and optional proof for a booking.
    /// </summary>
    [HttpPost("{id:int}/payment-proof")]
    [ProducesResponseType(typeof(AppointmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SubmitPaymentProof(
        int id,
        [FromBody] SubmitPaymentProofRequest request,
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
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .Include(a => a.PaymentVerifiedByUser)
            .FirstOrDefaultAsync(a => a.Id == id && a.CustomerId == customerId.Value, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment not found in your bookings." });
        }

        if (AppointmentStatuses.TerminalStatuses.Contains(appointment.Status))
        {
            return BadRequest(new { message = $"Cannot submit payment proof for an appointment in '{appointment.Status}' status." });
        }

        if (appointment.PaymentStatus == PaymentStatuses.Paid)
        {
            return BadRequest(new { message = "This appointment has already been fully paid and verified." });
        }

        if (request.AmountPaid.HasValue && request.AmountPaid.Value > appointment.PriceAtBooking)
        {
            return BadRequest(new { message = $"Submitted amount ({request.AmountPaid.Value}) cannot exceed total appointment price of {appointment.PriceAtBooking}." });
        }

        var cleanRef = request.PaymentTransactionReference.Trim();

        var isDuplicateRef = await _dbContext.Appointments.AnyAsync(a =>
            a.SalonId == appointment.SalonId &&
            a.Id != appointment.Id &&
            a.PaymentTransactionReference == cleanRef &&
            (a.PaymentStatus == PaymentStatuses.Paid || a.PaymentStatus == PaymentStatuses.PartiallyPaid || a.PaymentStatus == PaymentStatuses.Pending),
            cancellationToken);

        if (isDuplicateRef)
        {
            return Conflict(new { message = $"Payment transaction reference '{cleanRef}' has already been submitted for another appointment at this salon." });
        }

        appointment.PaymentTransactionReference = cleanRef;
        appointment.PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "UPI" : request.PaymentMethod.Trim();
        appointment.PaymentProofUrl = request.PaymentProofUrl?.Trim();
        appointment.PaymentSubmittedAtUtc = DateTime.UtcNow;

        if (request.AmountPaid.HasValue && request.AmountPaid.Value > 0)
        {
            appointment.AmountPaid = request.AmountPaid.Value;
        }
        else if (appointment.AdvanceAmountRequired > 0 && appointment.AmountPaid == 0)
        {
            appointment.AmountPaid = appointment.AdvanceAmountRequired;
        }

        if (appointment.PaymentStatus == PaymentStatuses.NotRequired)
        {
            appointment.PaymentStatus = PaymentStatuses.Pending;
        }

        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Customer ID {CustomerId} submitted payment reference '{Ref}' for Appointment ID {AppointmentId}.",
            customerId.Value, appointment.PaymentTransactionReference, appointment.Id);

        try
        {
            await _notificationService.DispatchAppointmentEventAsync(appointment, "PaymentProofSubmitted", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch notification for payment proof submission of appointment {AppointmentId}.", appointment.Id);
        }

        return Ok(MapToResponse(appointment));
    }

    private static AppointmentResponse MapToResponse(Appointment a)
    {
        return new AppointmentResponse
        {
            Id = a.Id,
            SalonId = a.SalonId,
            SalonName = a.Salon != null ? a.Salon.Name : string.Empty,
            SalonSlug = a.Salon != null ? a.Salon.Slug : string.Empty,
            CustomerId = a.CustomerId,
            CustomerName = a.Customer != null ? a.Customer.FullName : string.Empty,
            CustomerEmail = a.Customer != null ? a.Customer.Email : string.Empty,
            CustomerPhone = null,
            StaffId = a.StaffId,
            StaffName = a.Staff != null ? a.Staff.FullName : string.Empty,
            StaffTitle = a.Staff != null ? a.Staff.Title : null,
            ServiceId = a.ServiceId,
            ServiceName = a.ServiceNameAtBooking,
            DurationMinutes = a.DurationMinutesAtBooking,
            Price = a.PriceAtBooking,
            StartAtUtc = a.StartAtUtc,
            EndAtUtc = a.EndAtUtc,
            Status = a.Status,
            CustomerNotes = a.CustomerNotes,
            CreatedAtUtc = a.CreatedAtUtc,
            UpdatedAtUtc = a.UpdatedAtUtc,
            CancelledAtUtc = a.CancelledAtUtc,
            CancellationReason = a.CancellationReason,
            AdvanceAmountRequired = a.AdvanceAmountRequired,
            AmountPaid = a.AmountPaid,
            PaymentStatus = a.PaymentStatus,
            PaymentMethod = a.PaymentMethod,
            PaymentTransactionReference = a.PaymentTransactionReference,
            PaymentProofUrl = a.PaymentProofUrl,
            PaymentSubmittedAtUtc = a.PaymentSubmittedAtUtc,
            PaymentVerifiedAtUtc = a.PaymentVerifiedAtUtc,
            PaymentVerifiedBy = a.PaymentVerifiedByUser != null ? a.PaymentVerifiedByUser.FullName : null,
            PaymentNotes = a.PaymentNotes,
            SalonUpiId = a.Salon != null ? a.Salon.UpiId : null,
            SalonQrCodeImageUrl = a.Salon != null ? a.Salon.QrCodeImageUrl : null,
            HasReview = a.Review != null,
            ReviewRating = a.Review != null ? a.Review.Rating : null,
            ReviewId = a.Review != null ? a.Review.Id : null
        };
    }

    /// <summary>
    /// Submit a verified review and rating for a completed appointment.
    /// </summary>
    [HttpPost("{id:int}/review")]
    [ProducesResponseType(typeof(ReviewResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateAppointmentReview(
        int id,
        [FromBody] CreateReviewRequest request,
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
            .Include(a => a.Staff)
            .Include(a => a.Review)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = $"Appointment with ID {id} was not found." });
        }

        if (appointment.CustomerId != customerId.Value)
        {
            return Forbid();
        }

        if (appointment.Status != "Completed")
        {
            return BadRequest(new { message = "Reviews can only be submitted for completed appointments." });
        }

        if (appointment.Review != null || await _dbContext.Reviews.AnyAsync(r => r.AppointmentId == id, cancellationToken))
        {
            return Conflict(new { message = "You have already submitted a review for this appointment." });
        }

        var review = new Review
        {
            SalonId = appointment.SalonId,
            CustomerId = customerId.Value,
            AppointmentId = appointment.Id,
            StaffId = appointment.StaffId,
            Rating = request.Rating,
            CleanlinessRating = request.CleanlinessRating,
            StaffRating = request.StaffRating,
            ValueRating = request.ValueRating,
            Title = request.Title?.Trim(),
            Comment = request.Comment.Trim(),
            PhotoUrlsJson = request.PhotoUrls != null && request.PhotoUrls.Count > 0
                ? System.Text.Json.JsonSerializer.Serialize(request.PhotoUrls.Where(u => !string.IsNullOrWhiteSpace(u)).ToList())
                : null,
            IsVerifiedVisit = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.Reviews.Add(review);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new ReviewResponse
        {
            Id = review.Id,
            SalonId = review.SalonId,
            SalonName = appointment.Salon?.Name ?? string.Empty,
            CustomerId = review.CustomerId,
            CustomerName = appointment.Customer?.FullName ?? "Verified Client",
            AppointmentId = review.AppointmentId,
            StaffId = review.StaffId,
            StaffName = appointment.Staff?.FullName,
            ServiceName = appointment.ServiceNameAtBooking,
            Rating = review.Rating,
            CleanlinessRating = review.CleanlinessRating,
            StaffRating = review.StaffRating,
            ValueRating = review.ValueRating,
            Title = review.Title,
            Comment = review.Comment,
            PhotoUrls = request.PhotoUrls ?? new List<string>(),
            IsVerifiedVisit = true,
            CreatedAtUtc = review.CreatedAtUtc
        };

        return CreatedAtAction(nameof(GetAppointmentReview), new { id = appointment.Id }, response);
    }

    /// <summary>
    /// Retrieve customer review submitted for an appointment.
    /// </summary>
    [HttpGet("{id:int}/review")]
    [ProducesResponseType(typeof(ReviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAppointmentReview(int id, CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var review = await _dbContext.Reviews
            .AsNoTracking()
            .Include(r => r.Salon)
            .Include(r => r.Customer)
            .Include(r => r.Staff)
            .Include(r => r.Appointment)
            .FirstOrDefaultAsync(r => r.AppointmentId == id, cancellationToken);

        if (review == null)
        {
            return NotFound(new { message = "No review found for this appointment." });
        }

        if (review.CustomerId != customerId.Value)
        {
            return Forbid();
        }

        return Ok(new ReviewResponse
        {
            Id = review.Id,
            SalonId = review.SalonId,
            SalonName = review.Salon?.Name ?? string.Empty,
            CustomerId = review.CustomerId,
            CustomerName = review.Customer?.FullName ?? "Verified Client",
            AppointmentId = review.AppointmentId,
            StaffId = review.StaffId,
            StaffName = review.Staff?.FullName,
            ServiceName = review.Appointment?.ServiceNameAtBooking,
            Rating = review.Rating,
            CleanlinessRating = review.CleanlinessRating,
            StaffRating = review.StaffRating,
            ValueRating = review.ValueRating,
            Title = review.Title,
            Comment = review.Comment,
            PhotoUrls = !string.IsNullOrWhiteSpace(review.PhotoUrlsJson)
                ? (System.Text.Json.JsonSerializer.Deserialize<List<string>>(review.PhotoUrlsJson) ?? new List<string>())
                : new List<string>(),
            IsVerifiedVisit = review.IsVerifiedVisit,
            OwnerReply = review.OwnerReply,
            OwnerRepliedAtUtc = review.OwnerRepliedAtUtc,
            CreatedAtUtc = review.CreatedAtUtc,
            UpdatedAtUtc = review.UpdatedAtUtc
        });
    }
}

