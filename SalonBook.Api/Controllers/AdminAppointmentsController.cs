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
[Route("api/admin/appointments")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminAppointmentsController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<AdminAppointmentsController> _logger;

    public AdminAppointmentsController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        INotificationService notificationService,
        ILogger<AdminAppointmentsController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve paginated appointments for the authenticated administrator's salon.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AppointmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListAppointments(
        [FromQuery] string? status,
        [FromQuery] int? staffId,
        [FromQuery] int? customerId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.SalonId == salonId.Value);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim();
            query = query.Where(a => a.Status == normalizedStatus);
        }

        if (staffId.HasValue)
        {
            query = query.Where(a => a.StaffId == staffId.Value);
        }

        if (customerId.HasValue)
        {
            query = query.Where(a => a.CustomerId == customerId.Value);
        }

        if (fromUtc.HasValue)
        {
            query = query.Where(a => a.StartAtUtc >= fromUtc.Value);
        }

        if (toUtc.HasValue)
        {
            query = query.Where(a => a.StartAtUtc <= toUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(a => a.Customer.FullName.ToLower().Contains(term) ||
                                     a.Staff.FullName.ToLower().Contains(term) ||
                                     a.ServiceNameAtBooking.ToLower().Contains(term));
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
    /// Retrieve a specific appointment by ID belonging to the authenticated administrator's salon.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(AppointmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAppointmentById(int id, CancellationToken cancellationToken)
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
            .FirstOrDefaultAsync(a => a.Id == id && a.SalonId == salonId.Value, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment not found in your salon." });
        }

        return Ok(MapToResponse(appointment));
    }

    /// <summary>
    /// Transition appointment status (e.g. Pending -> Confirmed, Confirmed -> Completed, Cancelled, NoShow).
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(AppointmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAppointmentStatus(
        int id,
        [FromBody] UpdateAppointmentStatusRequest request,
        CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        if (!AppointmentStatuses.All.Contains(request.Status))
        {
            return BadRequest(new { message = $"Invalid status '{request.Status}'. Valid statuses: {string.Join(", ", AppointmentStatuses.All)}" });
        }

        var appointment = await _dbContext.Appointments
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == id && a.SalonId == salonId.Value, cancellationToken);

        if (appointment == null)
        {
            return NotFound(new { message = "Appointment not found in your salon." });
        }

        if (!AppointmentStatuses.IsValidTransition(appointment.Status, request.Status))
        {
            return BadRequest(new { message = $"Cannot transition appointment from '{appointment.Status}' to '{request.Status}'." });
        }

        appointment.Status = request.Status;
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        if (request.Status == AppointmentStatuses.Cancelled)
        {
            appointment.CancelledAtUtc = DateTime.UtcNow;
            appointment.CancellationReason = string.IsNullOrWhiteSpace(request.Reason)
                ? $"Cancelled by salon administrator ({_currentUserService.Email})"
                : request.Reason.Trim();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Appointment ID {AppointmentId} status transitioned from {OldStatus} to {NewStatus} by Admin {Email}.",
            appointment.Id, appointment.Status, request.Status, _currentUserService.Email);

        try
        {
            var eventType = request.Status == AppointmentStatuses.Cancelled
                ? "AppointmentCancelled"
                : (request.Status == AppointmentStatuses.Confirmed ? "AppointmentConfirmed" : "AppointmentStatusChanged");

            await _notificationService.DispatchAppointmentEventAsync(appointment, eventType, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch notification for updated appointment {AppointmentId}.", appointment.Id);
        }

        return Ok(MapToResponse(appointment));
    }

    /// <summary>
    /// Retrieve appointments in a specified date range for salon calendar visualization.
    /// </summary>
    [HttpGet("calendar")]
    [ProducesResponseType(typeof(List<AppointmentCalendarItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetCalendarAppointments(
        [FromQuery] DateTime startUtc,
        [FromQuery] DateTime endUtc,
        [FromQuery] int? staffId,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        if (endUtc <= startUtc)
        {
            return BadRequest(new { message = "'endUtc' must be greater than 'startUtc'." });
        }

        if ((endUtc - startUtc).TotalDays > 45)
        {
            return BadRequest(new { message = "Calendar range cannot exceed 45 days." });
        }

        var query = _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.SalonId == salonId.Value &&
                        a.StartAtUtc < endUtc &&
                        startUtc < a.EndAtUtc);

        if (staffId.HasValue)
        {
            query = query.Where(a => a.StaffId == staffId.Value);
        }

        var calendarItems = await query
            .OrderBy(a => a.StartAtUtc)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Select(a => new AppointmentCalendarItemResponse
            {
                Id = a.Id,
                StaffId = a.StaffId,
                StaffName = a.Staff.FullName,
                CustomerName = a.Customer.FullName,
                ServiceName = a.ServiceNameAtBooking,
                Price = a.PriceAtBooking,
                StartAtUtc = a.StartAtUtc,
                EndAtUtc = a.EndAtUtc,
                Status = a.Status
            })
            .ToListAsync(cancellationToken);

        return Ok(calendarItems);
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

