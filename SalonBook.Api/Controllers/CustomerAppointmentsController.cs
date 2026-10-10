using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    private readonly ILogger<CustomerAppointmentsController> _logger;

    public CustomerAppointmentsController(
        ApplicationDbContext dbContext,
        IBookingService bookingService,
        ICurrentUserService currentUserService,
        ILogger<CustomerAppointmentsController> logger)
    {
        _dbContext = dbContext;
        _bookingService = bookingService;
        _currentUserService = currentUserService;
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
            CancellationReason = a.CancellationReason
        };
    }
}

