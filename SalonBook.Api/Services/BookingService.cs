using System.Data;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public interface IBookingService
{
    Task<AppointmentResponse> CreateAppointmentAsync(
        int customerId,
        CreateAppointmentRequest request,
        CancellationToken cancellationToken = default);

    Task<AppointmentResponse> CancelCustomerAppointmentAsync(
        int customerId,
        int appointmentId,
        string? reason,
        CancellationToken cancellationToken = default);
}

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly INotificationService _notificationService;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        ApplicationDbContext dbContext,
        INotificationService notificationService,
        ILogger<BookingService> logger)
    {
        _dbContext = dbContext;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<AppointmentResponse> CreateAppointmentAsync(
        int customerId,
        CreateAppointmentRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Verify Salon is active
        var salon = await _dbContext.Salons
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.SalonId && s.IsActive, cancellationToken);

        if (salon == null)
        {
            throw new KeyNotFoundException($"Active salon with ID {request.SalonId} was not found.");
        }

        // 2. Timezone & date validation
        var salonTz = GetTimeZoneInfo(salon.TimeZone);
        var localStart = TimeZoneInfo.ConvertTimeFromUtc(request.StartAtUtc, salonTz);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, salonTz);

        if (request.StartAtUtc <= DateTime.UtcNow.AddMinutes(-5)) // Grace period for latency
        {
            throw new ArgumentException("Cannot book appointments in the past.");
        }

        // 3. Verify Services are active and belong to Salon
        var allServiceIds = new List<int> { request.ServiceId };
        if (request.AdditionalServiceIds != null && request.AdditionalServiceIds.Count > 0)
        {
            allServiceIds.AddRange(request.AdditionalServiceIds.Where(id => id > 0 && id != request.ServiceId));
        }

        var allServices = await _dbContext.Services
            .AsNoTracking()
            .Where(s => allServiceIds.Contains(s.Id) && s.SalonId == salon.Id && s.IsActive)
            .ToListAsync(cancellationToken);

        var primaryService = allServices.FirstOrDefault(s => s.Id == request.ServiceId);
        if (primaryService == null)
        {
            throw new KeyNotFoundException($"Active service with ID {request.ServiceId} was not found for salon '{salon.Name}'.");
        }

        var totalPrice = allServices.Sum(s => s.Price);
        var totalDurationMinutes = allServices.Sum(s => s.DurationMinutes);
        var combinedServiceName = string.Join(" + ", allServices.Select(s => s.Name));

        var endAtUtc = request.StartAtUtc.AddMinutes(totalDurationMinutes);
        var localEnd = localStart.AddMinutes(totalDurationMinutes);
        var dayOfWeek = localStart.DayOfWeek;

        // 4. Resolve Staff member
        int resolvedStaffId;
        if (request.StaffId.HasValue)
        {
            var staffMember = await _dbContext.Staff
                .AsNoTracking()
                .Include(s => s.Schedules.Where(sch => sch.DayOfWeek == dayOfWeek && sch.IsWorkingDay))
                    .ThenInclude(sch => sch.Breaks)
                .FirstOrDefaultAsync(s => s.Id == request.StaffId.Value && s.SalonId == salon.Id && s.IsActive, cancellationToken);

            if (staffMember == null)
            {
                throw new KeyNotFoundException($"Active staff member with ID {request.StaffId.Value} was not found in salon '{salon.Name}'.");
            }

            ValidateStaffWorkingHoursAndBreaks(staffMember, localStart.TimeOfDay, localEnd.TimeOfDay, dayOfWeek);
            resolvedStaffId = staffMember.Id;
        }
        else
        {
            // Auto-assign first available staff member
            var availableStaffList = await _dbContext.Staff
                .AsNoTracking()
                .Where(s => s.SalonId == salon.Id && s.IsActive)
                .Include(s => s.Schedules.Where(sch => sch.DayOfWeek == dayOfWeek && sch.IsWorkingDay))
                    .ThenInclude(sch => sch.Breaks)
                .ToListAsync(cancellationToken);

            var eligibleStaff = new List<Staff>();
            foreach (var st in availableStaffList)
            {
                try
                {
                    ValidateStaffWorkingHoursAndBreaks(st, localStart.TimeOfDay, localEnd.TimeOfDay, dayOfWeek);
                    eligibleStaff.Add(st);
                }
                catch
                {
                    // Not working or on break at this time
                }
            }

            if (eligibleStaff.Count == 0)
            {
                throw new InvalidOperationException("No staff members are on schedule or available during the requested time slot.");
            }

            // Find first eligible staff who has no booking conflict
            var eligibleStaffIds = eligibleStaff.Select(s => s.Id).ToList();
            var busyStaffIds = await _dbContext.Appointments
                .AsNoTracking()
                .Where(a => eligibleStaffIds.Contains(a.StaffId) &&
                            AppointmentStatuses.BlockingStatuses.Contains(a.Status) &&
                            a.StartAtUtc < endAtUtc &&
                            request.StartAtUtc < a.EndAtUtc)
                .Select(a => a.StaffId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var freeStaff = eligibleStaff.FirstOrDefault(s => !busyStaffIds.Contains(s.Id));
            if (freeStaff == null)
            {
                throw new InvalidOperationException("All staff members are booked during the requested time slot.");
            }

            resolvedStaffId = freeStaff.Id;
        }

        // 5. Concurrency-safe SQL Server Transaction with Execution Strategy
        var strategy = _dbContext.Database.CreateExecutionStrategy();
        var createdAppointment = await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

            // Fine-grained lock key for specific staff member on target date
            var lockKey = $"StaffBookingLock_{resolvedStaffId}_{localStart:yyyyMMdd}";
            await _dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"EXEC sp_getapplock @Resource = {lockKey}, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;",
                cancellationToken);

            // Revalidate overlapping blocking appointments inside serializable transaction
            var hasOverlap = await _dbContext.Appointments
                .AnyAsync(a => a.StaffId == resolvedStaffId &&
                               AppointmentStatuses.BlockingStatuses.Contains(a.Status) &&
                               a.StartAtUtc < endAtUtc &&
                               request.StartAtUtc < a.EndAtUtc, cancellationToken);

            if (hasOverlap)
            {
                throw new InvalidOperationException("The selected time slot is already booked for this staff member.");
            }

            decimal advanceAmountRequired = 0.00m;
            string paymentStatus = PaymentStatuses.NotRequired;

            if (salon.IsAdvancePaymentRequired && salon.AdvancePaymentValue.HasValue && salon.AdvancePaymentValue.Value > 0)
            {
                if (string.Equals(salon.AdvancePaymentType, AdvancePaymentTypes.Percentage, StringComparison.OrdinalIgnoreCase))
                {
                    advanceAmountRequired = Math.Round(totalPrice * (salon.AdvancePaymentValue.Value / 100m), 2);
                }
                else
                {
                    advanceAmountRequired = salon.AdvancePaymentValue.Value;
                }

                advanceAmountRequired = Math.Min(totalPrice, Math.Max(0m, advanceAmountRequired));
                paymentStatus = PaymentStatuses.Pending;
            }

            var appointment = new Appointment
            {
                SalonId = salon.Id,
                CustomerId = customerId,
                StaffId = resolvedStaffId,
                ServiceId = primaryService.Id,
                StartAtUtc = request.StartAtUtc,
                EndAtUtc = endAtUtc,
                Status = AppointmentStatuses.Confirmed,
                PriceAtBooking = totalPrice,
                ServiceNameAtBooking = combinedServiceName,
                DurationMinutesAtBooking = totalDurationMinutes,
                CustomerNotes = request.CustomerNotes?.Trim(),
                AdvanceAmountRequired = advanceAmountRequired,
                AmountPaid = 0.00m,
                PaymentStatus = paymentStatus,
                CreatedAtUtc = DateTime.UtcNow
            };

            _dbContext.Appointments.Add(appointment);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return appointment;
        });

        _logger.LogInformation("Appointment ID {AppointmentId} created successfully for Customer ID {CustomerId} at Salon ID {SalonId}.",
            createdAppointment.Id, customerId, salon.Id);

        try
        {
            await _notificationService.DispatchAppointmentEventAsync(createdAppointment, "AppointmentCreated", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch notification for created appointment {AppointmentId}.", createdAppointment.Id);
        }

        // Fetch complete details for response
        return await GetAppointmentResponseByIdAsync(createdAppointment.Id, cancellationToken);
    }

    public async Task<AppointmentResponse> CancelCustomerAppointmentAsync(
        int customerId,
        int appointmentId,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var appointment = await _dbContext.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.CustomerId == customerId, cancellationToken);

        if (appointment == null)
        {
            throw new KeyNotFoundException($"Appointment ID {appointmentId} was not found in your bookings.");
        }

        if (appointment.Status == AppointmentStatuses.Cancelled)
        {
            throw new InvalidOperationException("This appointment is already cancelled.");
        }

        if (AppointmentStatuses.TerminalStatuses.Contains(appointment.Status))
        {
            throw new InvalidOperationException($"Cannot cancel an appointment in '{appointment.Status}' status.");
        }

        if (appointment.StartAtUtc <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Cannot cancel an appointment that has already started or passed.");
        }

        appointment.Status = AppointmentStatuses.Cancelled;
        appointment.CancelledAtUtc = DateTime.UtcNow;
        appointment.CancellationReason = string.IsNullOrWhiteSpace(reason) ? "Cancelled by customer" : reason.Trim();
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Appointment ID {AppointmentId} cancelled by Customer ID {CustomerId}.", appointmentId, customerId);

        try
        {
            await _notificationService.DispatchAppointmentEventAsync(appointment, "AppointmentCancelled", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dispatch notification for cancelled appointment {AppointmentId}.", appointment.Id);
        }

        return await GetAppointmentResponseByIdAsync(appointment.Id, cancellationToken);
    }

    private async Task<AppointmentResponse> GetAppointmentResponseByIdAsync(int appointmentId, CancellationToken cancellationToken)
    {
        var appointment = await _dbContext.Appointments
            .AsNoTracking()
            .Include(a => a.Salon)
            .Include(a => a.Customer)
            .Include(a => a.Staff)
            .Include(a => a.Service)
            .Include(a => a.PaymentVerifiedByUser)
            .FirstAsync(a => a.Id == appointmentId, cancellationToken);

        return new AppointmentResponse
        {
            Id = appointment.Id,
            SalonId = appointment.SalonId,
            SalonName = appointment.Salon.Name,
            SalonSlug = appointment.Salon.Slug,
            CustomerId = appointment.CustomerId,
            CustomerName = appointment.Customer.FullName,
            CustomerEmail = appointment.Customer.Email,
            CustomerPhone = null,
            StaffId = appointment.StaffId,
            StaffName = appointment.Staff.FullName,
            StaffTitle = appointment.Staff.Title,
            ServiceId = appointment.ServiceId,
            ServiceName = appointment.ServiceNameAtBooking,
            DurationMinutes = appointment.DurationMinutesAtBooking,
            Price = appointment.PriceAtBooking,
            StartAtUtc = appointment.StartAtUtc,
            EndAtUtc = appointment.EndAtUtc,
            Status = appointment.Status,
            CustomerNotes = appointment.CustomerNotes,
            CreatedAtUtc = appointment.CreatedAtUtc,
            UpdatedAtUtc = appointment.UpdatedAtUtc,
            CancelledAtUtc = appointment.CancelledAtUtc,
            CancellationReason = appointment.CancellationReason,
            AdvanceAmountRequired = appointment.AdvanceAmountRequired,
            AmountPaid = appointment.AmountPaid,
            PaymentStatus = appointment.PaymentStatus,
            PaymentMethod = appointment.PaymentMethod,
            PaymentTransactionReference = appointment.PaymentTransactionReference,
            PaymentProofUrl = appointment.PaymentProofUrl,
            PaymentSubmittedAtUtc = appointment.PaymentSubmittedAtUtc,
            PaymentVerifiedAtUtc = appointment.PaymentVerifiedAtUtc,
            PaymentVerifiedBy = appointment.PaymentVerifiedByUser != null ? appointment.PaymentVerifiedByUser.FullName : null,
            PaymentNotes = appointment.PaymentNotes,
            SalonUpiId = appointment.Salon.UpiId,
            SalonQrCodeImageUrl = appointment.Salon.QrCodeImageUrl
        };
    }

    private static void ValidateStaffWorkingHoursAndBreaks(
        Staff staff,
        TimeSpan localStartTime,
        TimeSpan localEndTime,
        DayOfWeek dayOfWeek)
    {
        var schedule = staff.Schedules.FirstOrDefault();
        if (schedule == null || !schedule.IsWorkingDay)
        {
            throw new InvalidOperationException($"Staff member '{staff.FullName}' is not working on {dayOfWeek}.");
        }

        if (localStartTime < schedule.StartTime || localEndTime > schedule.EndTime)
        {
            throw new InvalidOperationException($"The requested time window ({localStartTime:hh\\:mm} - {localEndTime:hh\\:mm}) falls outside '{staff.FullName}' working hours ({schedule.StartTime:hh\\:mm} - {schedule.EndTime:hh\\:mm}) on {dayOfWeek}.");
        }

        foreach (var b in schedule.Breaks)
        {
            if (localStartTime < b.EndTime && b.StartTime < localEndTime)
            {
                throw new InvalidOperationException($"The requested time window conflicts with '{staff.FullName}' scheduled break ({b.StartTime:hh\\:mm} - {b.EndTime:hh\\:mm}).");
            }
        }
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

