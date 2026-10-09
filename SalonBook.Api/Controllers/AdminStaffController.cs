using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/staff")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminStaffController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminStaffController> _logger;

    public AdminStaffController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<AdminStaffController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new staff member under the authenticated admin's salon.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = new Staff
        {
            SalonId = salonId.Value,
            FullName = request.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim(),
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };

        // Initialize weekly schedule (default 9am - 6pm Mon-Sat, or custom from request)
        var schedulesToCreate = request.WeeklySchedule != null && request.WeeklySchedule.Count > 0
            ? request.WeeklySchedule
            : GenerateDefaultWeeklySchedule();

        var (isValidSchedule, scheduleErrors, validatedSchedules) = ValidateAndParseSchedule(schedulesToCreate);
        if (!isValidSchedule)
        {
            return BadRequest(new { message = "Schedule validation failed.", errors = scheduleErrors });
        }

        foreach (var sched in validatedSchedules)
        {
            staff.Schedules.Add(sched);
        }

        _dbContext.Staff.Add(staff);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Staff member '{FullName}' (ID: {StaffId}) created for Salon ID {SalonId}.",
            staff.FullName, staff.Id, salonId.Value);

        var response = MapToStaffResponse(staff);
        return CreatedAtAction(nameof(GetStaffById), new { id = staff.Id }, response);
    }

    /// <summary>
    /// List all staff members for the current salon with pagination and filtering.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<StaffResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListStaff(
        [FromQuery] bool? isActive,
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

        var query = _dbContext.Staff
            .AsNoTracking()
            .Where(s => s.SalonId == salonId.Value);

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.FullName.ToLower().Contains(term) ||
                                     (s.Title != null && s.Title.ToLower().Contains(term)) ||
                                     (s.Email != null && s.Email.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var staffList = await query
            .OrderBy(s => s.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .ToListAsync(cancellationToken);

        var result = new PagedResult<StaffResponse>
        {
            Items = staffList.Select(MapToStaffResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return Ok(result);
    }

    /// <summary>
    /// Retrieve a single staff member by ID with their weekly schedule.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaffById(int id, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = await _dbContext.Staff
            .AsNoTracking()
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (staff == null)
        {
            return NotFound(new { message = "Staff member not found in your salon." });
        }

        return Ok(MapToStaffResponse(staff));
    }

    /// <summary>
    /// Update staff profile information.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = await _dbContext.Staff
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (staff == null)
        {
            return NotFound(new { message = "Staff member not found in your salon." });
        }

        staff.FullName = request.FullName.Trim();
        staff.Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        staff.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        staff.Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim();
        staff.IsActive = request.IsActive;
        staff.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Staff member ID {StaffId} updated for Salon ID {SalonId}.", staff.Id, salonId.Value);

        return Ok(MapToStaffResponse(staff));
    }

    /// <summary>
    /// Activate or deactivate a staff member.
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStaffStatus(int id, [FromBody] UpdateStaffStatusRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = await _dbContext.Staff
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (staff == null)
        {
            return NotFound(new { message = "Staff member not found in your salon." });
        }

        staff.IsActive = request.IsActive;
        staff.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Staff ID {StaffId} active status set to {Status} for Salon ID {SalonId}.",
            staff.Id, staff.IsActive, salonId.Value);

        return Ok(MapToStaffResponse(staff));
    }

    /// <summary>
    /// Delete a staff member from the salon catalog.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteStaff(int id, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = await _dbContext.Staff
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (staff == null)
        {
            return NotFound(new { message = "Staff member not found in your salon." });
        }

        _dbContext.Staff.Remove(staff);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Staff ID {StaffId} deleted from Salon ID {SalonId}.", staff.Id, salonId.Value);

        return Ok(new { message = "Staff member removed successfully." });
    }

    /// <summary>
    /// Retrieve the weekly schedule and breaks for a staff member.
    /// </summary>
    [HttpGet("{id:int}/schedule")]
    [ProducesResponseType(typeof(List<StaffDayScheduleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStaffSchedule(int id, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = await _dbContext.Staff
            .AsNoTracking()
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (staff == null)
        {
            return NotFound(new { message = "Staff member not found in your salon." });
        }

        var response = staff.Schedules
            .OrderBy(s => (int)s.DayOfWeek == 0 ? 7 : (int)s.DayOfWeek) // Mon to Sun order
            .Select(MapToDayScheduleResponse)
            .ToList();

        return Ok(response);
    }

    /// <summary>
    /// Update or replace the weekly working schedule and breaks for a staff member.
    /// </summary>
    [HttpPut("{id:int}/schedule")]
    [ProducesResponseType(typeof(List<StaffDayScheduleResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStaffSchedule(
        int id,
        [FromBody] UpdateStaffScheduleRequest request,
        CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var staff = await _dbContext.Staff
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .FirstOrDefaultAsync(s => s.Id == id && s.SalonId == salonId.Value, cancellationToken);

        if (staff == null)
        {
            return NotFound(new { message = "Staff member not found in your salon." });
        }

        var (isValid, errors, validatedSchedules) = ValidateAndParseSchedule(request.WeeklySchedule);
        if (!isValid)
        {
            return BadRequest(new { message = "Schedule validation failed.", errors });
        }

        // Remove existing schedules and replace with new validated schedules
        _dbContext.StaffSchedules.RemoveRange(staff.Schedules);
        foreach (var newSched in validatedSchedules)
        {
            newSched.StaffId = staff.Id;
            _dbContext.StaffSchedules.Add(newSched);
        }

        staff.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Weekly schedule updated for Staff ID {StaffId} in Salon ID {SalonId}.", staff.Id, salonId.Value);

        var updatedStaff = await _dbContext.Staff
            .AsNoTracking()
            .Include(s => s.Schedules)
                .ThenInclude(sch => sch.Breaks)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        var response = updatedStaff!.Schedules
            .OrderBy(s => (int)s.DayOfWeek == 0 ? 7 : (int)s.DayOfWeek)
            .Select(MapToDayScheduleResponse)
            .ToList();

        return Ok(response);
    }

    #region Helper Methods

    private static (bool IsValid, List<string> Errors, List<StaffSchedule> Schedules) ValidateAndParseSchedule(
        List<StaffDayScheduleDTO> scheduleDTOs)
    {
        var errors = new List<string>();
        var result = new List<StaffSchedule>();
        var seenDays = new HashSet<DayOfWeek>();

        foreach (var dto in scheduleDTOs)
        {
            if (seenDays.Contains(dto.DayOfWeek))
            {
                errors.Add($"Duplicate schedule entry for day '{dto.DayOfWeek}'. Each day can only be configured once.");
                continue;
            }
            seenDays.Add(dto.DayOfWeek);

            if (!TimeSpan.TryParse(dto.StartTime, out var startTs))
            {
                errors.Add($"Invalid StartTime format '{dto.StartTime}' for {dto.DayOfWeek}. Expected 'HH:mm'.");
                continue;
            }

            if (!TimeSpan.TryParse(dto.EndTime, out var endTs))
            {
                errors.Add($"Invalid EndTime format '{dto.EndTime}' for {dto.DayOfWeek}. Expected 'HH:mm'.");
                continue;
            }

            if (dto.IsWorkingDay && startTs >= endTs)
            {
                errors.Add($"For {dto.DayOfWeek}, StartTime ({dto.StartTime}) must be earlier than EndTime ({dto.EndTime}).");
            }

            var schedule = new StaffSchedule
            {
                DayOfWeek = dto.DayOfWeek,
                IsWorkingDay = dto.IsWorkingDay,
                StartTime = startTs,
                EndTime = endTs,
                Breaks = new List<StaffBreak>()
            };

            // Validate breaks
            if (dto.IsWorkingDay && dto.Breaks != null && dto.Breaks.Count > 0)
            {
                var parsedBreaks = new List<(TimeSpan Start, TimeSpan End, string? Title)>();

                for (int bIdx = 0; bIdx < dto.Breaks.Count; bIdx++)
                {
                    var b = dto.Breaks[bIdx];

                    if (!TimeSpan.TryParse(b.StartTime, out var bStart))
                    {
                        errors.Add($"Invalid Break StartTime '{b.StartTime}' on {dto.DayOfWeek}. Expected 'HH:mm'.");
                        continue;
                    }

                    if (!TimeSpan.TryParse(b.EndTime, out var bEnd))
                    {
                        errors.Add($"Invalid Break EndTime '{b.EndTime}' on {dto.DayOfWeek}. Expected 'HH:mm'.");
                        continue;
                    }

                    if (bStart >= bEnd)
                    {
                        errors.Add($"Break on {dto.DayOfWeek} has StartTime ({b.StartTime}) that is not earlier than EndTime ({b.EndTime}).");
                        continue;
                    }

                    if (bStart < startTs || bEnd > endTs)
                    {
                        errors.Add($"Break ({b.StartTime} - {b.EndTime}) on {dto.DayOfWeek} must fall strictly within working hours ({dto.StartTime} - {dto.EndTime}).");
                        continue;
                    }

                    parsedBreaks.Add((bStart, bEnd, b.Title));
                }

                // Check break overlaps
                for (int i = 0; i < parsedBreaks.Count; i++)
                {
                    for (int j = i + 1; j < parsedBreaks.Count; j++)
                    {
                        var b1 = parsedBreaks[i];
                        var b2 = parsedBreaks[j];

                        if (b1.Start < b2.End && b2.Start < b1.End)
                        {
                            errors.Add($"Overlapping breaks detected on {dto.DayOfWeek}: Break {i + 1} ({FormatTimeSpan(b1.Start)} - {FormatTimeSpan(b1.End)}) overlaps with Break {j + 1} ({FormatTimeSpan(b2.Start)} - {FormatTimeSpan(b2.End)}).");
                        }
                    }
                }

                foreach (var b in parsedBreaks)
                {
                    schedule.Breaks.Add(new StaffBreak
                    {
                        StartTime = b.Start,
                        EndTime = b.End,
                        Title = string.IsNullOrWhiteSpace(b.Title) ? "Break" : b.Title.Trim()
                    });
                }
            }

            result.Add(schedule);
        }

        return (errors.Count == 0, errors, result);
    }

    private static List<StaffDayScheduleDTO> GenerateDefaultWeeklySchedule()
    {
        var days = new[]
        {
            (DayOfWeek.Monday, true),
            (DayOfWeek.Tuesday, true),
            (DayOfWeek.Wednesday, true),
            (DayOfWeek.Thursday, true),
            (DayOfWeek.Friday, true),
            (DayOfWeek.Saturday, true),
            (DayOfWeek.Sunday, false)
        };

        return days.Select(d => new StaffDayScheduleDTO
        {
            DayOfWeek = d.Item1,
            IsWorkingDay = d.Item2,
            StartTime = "09:00",
            EndTime = "18:00",
            Breaks = d.Item2
                ? new List<StaffBreakDTO>
                {
                    new() { StartTime = "13:00", EndTime = "14:00", Title = "Lunch Break" }
                }
                : new List<StaffBreakDTO>()
        }).ToList();
    }

    private static StaffResponse MapToStaffResponse(Staff staff)
    {
        return new StaffResponse
        {
            Id = staff.Id,
            SalonId = staff.SalonId,
            FullName = staff.FullName,
            Email = staff.Email,
            PhoneNumber = staff.PhoneNumber,
            Title = staff.Title,
            IsActive = staff.IsActive,
            CreatedAtUtc = staff.CreatedAtUtc,
            UpdatedAtUtc = staff.UpdatedAtUtc,
            Schedules = staff.Schedules
                .OrderBy(s => (int)s.DayOfWeek == 0 ? 7 : (int)s.DayOfWeek)
                .Select(MapToDayScheduleResponse)
                .ToList()
        };
    }

    private static StaffDayScheduleResponse MapToDayScheduleResponse(StaffSchedule schedule)
    {
        return new StaffDayScheduleResponse
        {
            DayOfWeek = schedule.DayOfWeek,
            DayName = schedule.DayOfWeek.ToString(),
            IsWorkingDay = schedule.IsWorkingDay,
            StartTime = FormatTimeSpan(schedule.StartTime),
            EndTime = FormatTimeSpan(schedule.EndTime),
            Breaks = schedule.Breaks
                .OrderBy(b => b.StartTime)
                .Select(b => new StaffBreakDTO
                {
                    StartTime = FormatTimeSpan(b.StartTime),
                    EndTime = FormatTimeSpan(b.EndTime),
                    Title = b.Title
                }).ToList()
        };
    }

    private static string FormatTimeSpan(TimeSpan ts)
    {
        return $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}";
    }

    #endregion
}

