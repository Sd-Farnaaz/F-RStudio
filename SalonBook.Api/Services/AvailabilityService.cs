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
        var totalPrice = services.Sum(s => s.Price);
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

        // Fetch active Off-Peak Dynamic Rules for the salon
        var offPeakRules = await _dbContext.SalonOffPeakRules
            .AsNoTracking()
            .Where(r => r.SalonId == salon.Id && r.IsActive)
            .ToListAsync(cancellationToken);

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

        var slotStaffMap = new SortedDictionary<TimeSpan, (TimeSpan EndTime, List<PublicStaffResponse> Staff, bool IsGapOptimized)>();

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
                    // Smart Gap Optimization check:
                    // Does this slot attach seamlessly to an existing booking (within 15 min),
                    // or attach directly to shift start/end, avoiding awkward orphaned gaps?
                    var touchesPriorBooking = staffBookings.Any(a => Math.Abs((slotStartUtc - a.EndAtUtc).TotalMinutes) <= 15);
                    var touchesNextBooking = staffBookings.Any(a => Math.Abs((a.StartAtUtc - slotEndUtc).TotalMinutes) <= 15);
                    var touchesShiftEdge = (slotStart == schedule.StartTime) || (slotEnd == schedule.EndTime);
                    var isOptimized = touchesPriorBooking || touchesNextBooking || touchesShiftEdge;

                    if (!slotStaffMap.TryGetValue(slotStart, out var entry))
                    {
                        entry = (slotEnd, new List<PublicStaffResponse>(), isOptimized);
                        slotStaffMap[slotStart] = entry;
                    }
                    else if (isOptimized)
                    {
                        slotStaffMap[slotStart] = (entry.EndTime, entry.Staff, true);
                    }

                    slotStaffMap[slotStart].Staff.Add(new PublicStaffResponse
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

        var dayName = targetDayOfWeek.ToString();

        var availableSlots = slotStaffMap.Select(kvp =>
        {
            var startTs = kvp.Key;
            var endTs = kvp.Value.EndTime;
            var startStr = FormatTimeSpan(startTs);
            var endStr = FormatTimeSpan(endTs);

            // Check if any active Off-Peak Flash Discount applies to this slot
            var matchingRule = offPeakRules.FirstOrDefault(r =>
            {
                var days = r.DaysOfWeek.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                var matchesDay = days.Any(d => d.Equals(dayName, StringComparison.OrdinalIgnoreCase));
                if (!matchesDay) return false;

                if (TimeSpan.TryParse(r.StartTime, out var rStart) && TimeSpan.TryParse(r.EndTime, out var rEnd))
                {
                    return startTs >= rStart && startTs < rEnd;
                }
                return false;
            });

            var hasDiscount = matchingRule != null;
            decimal? discPct = hasDiscount ? matchingRule!.DiscountPercentage : null;
            decimal? origPrice = hasDiscount ? totalPrice : null;
            decimal? discPrice = hasDiscount ? Math.Round(totalPrice * (1m - (matchingRule!.DiscountPercentage / 100m)), 2) : null;
            string? discTitle = hasDiscount ? matchingRule!.Name : null;

            return new AvailabilitySlotResponse
            {
                StartTime = startStr,
                EndTime = endStr,
                AvailableStaff = kvp.Value.Staff,
                IsGapOptimized = kvp.Value.IsGapOptimized,
                OptimizationReason = kvp.Value.IsGapOptimized ? "Recommended slot: Seamlessly minimizes wait time" : null,
                HasFlashDiscount = hasDiscount,
                DiscountPercentage = discPct,
                OriginalPrice = origPrice,
                DiscountedPrice = discPrice,
                FlashDiscountTitle = discTitle
            };
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
