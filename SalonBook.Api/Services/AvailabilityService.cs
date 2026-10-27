using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public interface IAvailabilityService
{
    Task<SalonAvailabilityResponse> GetAvailabilityAsync(
        string salonSlug,
        int serviceId,
        string dateString,
        int? staffId = null,
        CancellationToken cancellationToken = default);

    Task<SalonAvailabilityResponse> GetAvailabilityAsync(
        string salonSlug,
        IEnumerable<int> serviceIds,
        string dateString,
        int? staffId = null,
        CancellationToken cancellationToken = default);
}

public class AvailabilityService : IAvailabilityService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<AvailabilityService> _logger;

    public AvailabilityService(
        ApplicationDbContext dbContext,
        ILogger<AvailabilityService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public Task<SalonAvailabilityResponse> GetAvailabilityAsync(
        string salonSlug,
        int serviceId,
        string dateString,
        int? staffId = null,
        CancellationToken cancellationToken = default)
    {
        return GetAvailabilityAsync(salonSlug, new[] { serviceId }, dateString, staffId, cancellationToken);
    }

    public async Task<SalonAvailabilityResponse> GetAvailabilityAsync(
        string salonSlug,
        IEnumerable<int> serviceIds,
        string dateString,
        int? staffId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(salonSlug))
        {
            throw new ArgumentException("Salon slug is required.");
        }

        var idList = serviceIds?.Where(id => id > 0).Distinct().ToList() ?? new List<int>();
        if (idList.Count == 0)
        {
            throw new ArgumentException("At least one valid service ID is required.");
        }

        if (!DateOnly.TryParseExact(dateString, "yyyy-MM-dd", out var targetDate))
        {
            throw new ArgumentException("Invalid date format. Expected 'yyyy-MM-dd'.");
        }

        var normalizedSlug = salonSlug.Trim().ToLowerInvariant();

        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Slug == normalizedSlug && s.IsActive, cancellationToken);

        if (salon == null)
        {
            throw new KeyNotFoundException($"Salon '{salonSlug}' was not found or is inactive.");
        }

        var services = await _dbContext.Services
            .AsNoTracking()
            .Where(s => idList.Contains(s.Id) && s.SalonId == salon.Id && s.IsActive)
            .ToListAsync(cancellationToken);

        if (services.Count == 0)
        {
            throw new KeyNotFoundException($"No active services found for ID(s): {string.Join(", ", idList)} for salon '{salonSlug}'.");
        }

        var primaryService = services.First();
        var totalMinutes = services.Sum(s => s.DurationMinutes);
        var combinedName = string.Join(" + ", services.Select(s => s.Name));

        var salonTz = GetTimeZoneInfo(salon.TimeZone);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, salonTz);
        var localToday = DateOnly.FromDateTime(localNow);

        if (targetDate < localToday)
        {
            throw new ArgumentException("Cannot check availability for past dates.");
        }

        var targetDayOfWeek = targetDate.DayOfWeek;
        var duration = TimeSpan.FromMinutes(totalMinutes);

        // Fetch staff and their schedules for that day
        var staffQuery = _dbContext.Staff
            .AsNoTracking()
            .Where(s => s.SalonId == salon.Id && s.IsActive);

        if (staffId.HasValue)
        {
            staffQuery = staffQuery.Where(s => s.Id == staffId.Value);
        }

        var staffList = await staffQuery
            .Include(s => s.Schedules.Where(sch => sch.DayOfWeek == targetDayOfWeek && sch.IsWorkingDay))
                .ThenInclude(sch => sch.Breaks)
            .ToListAsync(cancellationToken);

        // Fetch existing blocking appointments for staff on target day
        var staffIds = staffList.Select(s => s.Id).ToList();
        var targetDayStartLocal = targetDate.ToDateTime(TimeOnly.MinValue);
        var targetDayEndLocal = targetDate.ToDateTime(TimeOnly.MaxValue);
        var targetDayStartUtc = TimeZoneInfo.ConvertTimeToUtc(targetDayStartLocal, salonTz);
        var targetDayEndUtc = TimeZoneInfo.ConvertTimeToUtc(targetDayEndLocal, salonTz);

        var existingAppointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => staffIds.Contains(a.StaffId) &&
                        AppointmentStatuses.BlockingStatuses.Contains(a.Status) &&
                        a.StartAtUtc < targetDayEndUtc &&
                        targetDayStartUtc < a.EndAtUtc)
            .ToListAsync(cancellationToken);

        var slotStaffMap = new SortedDictionary<TimeSpan, (TimeSpan EndTime, List<PublicStaffResponse> Staff)>();

        const int slotStepMinutes = 15; // 15-minute slot alignment

        foreach (var staff in staffList)
        {
            var schedule = staff.Schedules.FirstOrDefault();
            if (schedule == null || !schedule.IsWorkingDay)
            {
                continue;
            }

            var staffBookings = existingAppointments.Where(a => a.StaffId == staff.Id).ToList();

            var current = schedule.StartTime;
            while (current + duration <= schedule.EndTime)
            {
                var slotStart = current;
                var slotEnd = current + duration;

                // Check break overlaps
                var overlapsBreak = schedule.Breaks.Any(b => slotStart < b.EndTime && b.StartTime < slotEnd);

                // Check today past time
                var isPastToday = targetDate == localToday && slotStart <= localNow.TimeOfDay;

                // Check overlapping blocking appointments
                var slotStartUtc = TimeZoneInfo.ConvertTimeToUtc(targetDate.ToDateTime(TimeOnly.FromTimeSpan(slotStart)), salonTz);
                var slotEndUtc = TimeZoneInfo.ConvertTimeToUtc(targetDate.ToDateTime(TimeOnly.FromTimeSpan(slotEnd)), salonTz);
                var hasBookingOverlap = staffBookings.Any(a => a.StartAtUtc < slotEndUtc && slotStartUtc < a.EndAtUtc);

                if (!overlapsBreak && !isPastToday && !hasBookingOverlap)
                {
                    if (!slotStaffMap.TryGetValue(slotStart, out var entry))
                    {
                        entry = (slotEnd, new List<PublicStaffResponse>());
                        slotStaffMap[slotStart] = entry;
                    }

                    entry.Staff.Add(new PublicStaffResponse
                    {
                        Id = staff.Id,
                        FullName = staff.FullName,
                        Title = staff.Title,
                        IsActive = staff.IsActive
                    });
                }

                current = current.Add(TimeSpan.FromMinutes(slotStepMinutes));
            }
        }

        var availableSlots = slotStaffMap.Select(kvp => new AvailabilitySlotResponse
        {
            StartTime = FormatTimeSpan(kvp.Key),
            EndTime = FormatTimeSpan(kvp.Value.EndTime),
            AvailableStaff = kvp.Value.Staff
        }).ToList();

        return new SalonAvailabilityResponse
        {
            Date = targetDate.ToString("yyyy-MM-dd"),
            DayOfWeek = targetDayOfWeek.ToString(),
            TimeZone = salon.TimeZone,
            ServiceId = primaryService.Id,
            ServiceName = combinedName,
            DurationMinutes = totalMinutes,
            Slots = availableSlots
        };
    }

    private static string FormatTimeSpan(TimeSpan ts)
    {
        return $"{(int)ts.TotalHours:D2}:{ts.Minutes:D2}";
    }

    private static TimeZoneInfo GetTimeZoneInfo(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return TryGetFallbackTimeZone("Asia/Kolkata");
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch
        {
            return TryGetFallbackTimeZone(timeZoneId);
        }
    }

    private static TimeZoneInfo TryGetFallbackTimeZone(string timeZoneId)
    {
        if (timeZoneId.Equals("Asia/Kolkata", StringComparison.OrdinalIgnoreCase) ||
            timeZoneId.Equals("India Standard Time", StringComparison.OrdinalIgnoreCase))
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); } catch { }
            try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); } catch { }
        }
        else if (timeZoneId.Equals("UTC", StringComparison.OrdinalIgnoreCase))
        {
            return TimeZoneInfo.Utc;
        }

        return TimeZoneInfo.Utc;
    }
}
