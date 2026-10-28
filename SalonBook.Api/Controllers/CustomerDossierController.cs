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
[Route("api/customer/dossier")]
[Authorize(Policy = "CustomerOnly")]
public class CustomerDossierController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<CustomerDossierController> _logger;

    public CustomerDossierController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<CustomerDossierController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve full client consultation profile, allergy alerts, skin/hair notes,
    /// formula history, and personalized care retention reminders for the authenticated customer.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(CustomerDossierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyDossier(CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var customer = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == customerId.Value && u.Role == Roles.User, cancellationToken);

        if (customer == null)
        {
            return NotFound(new { message = "Customer profile not found." });
        }

        // 1. Fetch consultation cards across salons
        var cards = await _dbContext.ClientConsultationCards
            .AsNoTracking()
            .Where(c => c.CustomerId == customerId.Value)
            .Include(c => c.Salon)
            .OrderByDescending(c => c.UpdatedAtUtc ?? c.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        // 2. Fetch formula history
        var formulas = await _dbContext.ClientFormulaRecords
            .AsNoTracking()
            .Where(f => f.CustomerId == customerId.Value)
            .Include(f => f.Salon)
            .Include(f => f.Staff)
            .OrderByDescending(f => f.ServiceDateUtc)
            .Select(f => new CustomerFormulaItemResponse
            {
                Id = f.Id,
                SalonId = f.SalonId,
                SalonName = f.Salon != null ? f.Salon.Name : "Studio Partner",
                SalonSlug = f.Salon != null ? f.Salon.Slug : "",
                AppointmentId = f.AppointmentId,
                StaffName = f.Staff != null ? f.Staff.FullName : f.CreatedByStaffName,
                Category = f.Category,
                FormulaDetails = f.FormulaDetails,
                Developer = f.Developer,
                ProcessingTimeMinutes = f.ProcessingTimeMinutes,
                Notes = f.Notes,
                ServiceDateUtc = f.ServiceDateUtc
            })
            .ToListAsync(cancellationToken);

        // 3. Compute Smart Care Retention Reminders (Phase 4 Yield & Retention)
        var careReminders = await ComputeCareRemindersAsync(customerId.Value, cancellationToken);

        var primaryCard = cards.FirstOrDefault();

        var response = new CustomerDossierResponse
        {
            CustomerId = customer.Id,
            FullName = customer.FullName,
            Email = customer.Email,
            PhoneNumber = null,
            CreatedAtUtc = customer.CreatedAtUtc,
            Allergies = primaryCard?.Allergies,
            SkinOrHairNotes = primaryCard?.SkinOrHairNotes,
            EmergencyContactName = primaryCard?.EmergencyContactName,
            EmergencyContactPhone = primaryCard?.EmergencyContactPhone,
            IsPatchTested = primaryCard?.IsPatchTested ?? false,
            PatchTestDate = primaryCard?.PatchTestDate,
            SalonCards = cards.Select(c => new CustomerSalonCardResponse
            {
                Id = c.Id,
                SalonId = c.SalonId,
                SalonName = c.Salon != null ? c.Salon.Name : "Salon Partner",
                SalonSlug = c.Salon != null ? c.Salon.Slug : "",
                Allergies = c.Allergies,
                SkinOrHairNotes = c.SkinOrHairNotes,
                IsPatchTested = c.IsPatchTested,
                PatchTestDate = c.PatchTestDate,
                EmergencyContactName = c.EmergencyContactName,
                EmergencyContactPhone = c.EmergencyContactPhone,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            }).ToList(),
            Formulas = formulas,
            CareReminders = careReminders
        };

        return Ok(response);
    }

    /// <summary>
    /// Update client allergies, skin/hair notes, and emergency contact info across consultation profiles.
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(CustomerDossierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateMyDossier(
        [FromBody] UpdateCustomerDossierRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var customer = await _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == customerId.Value && u.Role == Roles.User, cancellationToken);

        if (customer == null)
        {
            return NotFound(new { message = "Customer profile not found." });
        }

        var cards = await _dbContext.ClientConsultationCards
            .Where(c => c.CustomerId == customerId.Value)
            .ToListAsync(cancellationToken);

        if (cards.Count > 0)
        {
            // If specific salon specified, update or create for that salon
            if (request.SalonId.HasValue)
            {
                var targetCard = cards.FirstOrDefault(c => c.SalonId == request.SalonId.Value);
                if (targetCard != null)
                {
                    targetCard.Allergies = request.Allergies?.Trim();
                    targetCard.SkinOrHairNotes = request.SkinOrHairNotes?.Trim();
                    targetCard.EmergencyContactName = request.EmergencyContactName?.Trim();
                    targetCard.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
                    targetCard.UpdatedAtUtc = DateTime.UtcNow;
                }
                else
                {
                    var newCard = new ClientConsultationCard
                    {
                        SalonId = request.SalonId.Value,
                        CustomerId = customerId.Value,
                        Allergies = request.Allergies?.Trim(),
                        SkinOrHairNotes = request.SkinOrHairNotes?.Trim(),
                        EmergencyContactName = request.EmergencyContactName?.Trim(),
                        EmergencyContactPhone = request.EmergencyContactPhone?.Trim(),
                        CreatedAtUtc = DateTime.UtcNow,
                        UpdatedAtUtc = DateTime.UtcNow
                    };
                    _dbContext.ClientConsultationCards.Add(newCard);
                }
            }
            else
            {
                // Update all cards for this customer
                foreach (var card in cards)
                {
                    card.Allergies = request.Allergies?.Trim();
                    card.SkinOrHairNotes = request.SkinOrHairNotes?.Trim();
                    card.EmergencyContactName = request.EmergencyContactName?.Trim();
                    card.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
                    card.UpdatedAtUtc = DateTime.UtcNow;
                }
            }
        }
        else
        {
            // Customer has no card yet. Resolve a salon to associate with.
            int? resolvedSalonId = request.SalonId;
            if (!resolvedSalonId.HasValue)
            {
                resolvedSalonId = await _dbContext.Appointments
                    .Where(a => a.CustomerId == customerId.Value)
                    .Select(a => (int?)a.SalonId)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            if (!resolvedSalonId.HasValue)
            {
                resolvedSalonId = await _dbContext.Salons
                    .Where(s => s.IsActive)
                    .Select(s => (int?)s.Id)
                    .FirstOrDefaultAsync(cancellationToken);
            }

            if (resolvedSalonId.HasValue)
            {
                var newCard = new ClientConsultationCard
                {
                    SalonId = resolvedSalonId.Value,
                    CustomerId = customerId.Value,
                    Allergies = request.Allergies?.Trim(),
                    SkinOrHairNotes = request.SkinOrHairNotes?.Trim(),
                    EmergencyContactName = request.EmergencyContactName?.Trim(),
                    EmergencyContactPhone = request.EmergencyContactPhone?.Trim(),
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                _dbContext.ClientConsultationCards.Add(newCard);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetMyDossier(cancellationToken);
    }

    /// <summary>
    /// Retrieve calculated smart care and routine maintenance reminders for the customer.
    /// </summary>
    [HttpGet("care-reminders")]
    [ProducesResponseType(typeof(List<CustomerCareReminderResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCareReminders(CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var reminders = await ComputeCareRemindersAsync(customerId.Value, cancellationToken);
        return Ok(reminders);
    }

    private async Task<List<CustomerCareReminderResponse>> ComputeCareRemindersAsync(int customerId, CancellationToken cancellationToken)
    {
        var pastAppointments = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.CustomerId == customerId && (a.Status == "Completed" || a.Status == "Confirmed"))
            .Include(a => a.Salon)
            .OrderByDescending(a => a.StartAtUtc)
            .Take(15)
            .ToListAsync(cancellationToken);

        if (pastAppointments.Count == 0)
        {
            return new List<CustomerCareReminderResponse>();
        }

        // Get off-peak rules for salons the customer visits
        var salonIds = pastAppointments.Select(a => a.SalonId).Distinct().ToList();
        var activeRules = await _dbContext.SalonOffPeakRules
            .AsNoTracking()
            .Where(r => salonIds.Contains(r.SalonId) && r.IsActive)
            .ToListAsync(cancellationToken);

        var result = new List<CustomerCareReminderResponse>();
        var seenCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var now = DateTime.UtcNow;

        foreach (var apt in pastAppointments)
        {
            var serviceName = apt.ServiceNameAtBooking;
            var lower = serviceName.ToLowerInvariant();

            string reminderType;
            int intervalWeeks;
            string baseAdvice;

            if (lower.Contains("color") || lower.Contains("balayage") || lower.Contains("highlight") || lower.Contains("bleach") || lower.Contains("toner") || lower.Contains("gloss"))
            {
                reminderType = "Hair Color & Gloss Maintenance";
                intervalWeeks = 6;
                baseAdvice = "A gloss toner refresh or root touch-up is recommended to maintain vibrancy and neutralize brassy undertones.";
            }
            else if (lower.Contains("cut") || lower.Contains("trim") || lower.Contains("fade") || lower.Contains("barber") || lower.Contains("layer"))
            {
                reminderType = "Haircut & Shape Refresh";
                intervalWeeks = 5;
                baseAdvice = "Regular trims remove split ends and keep your precision haircut silhouette crisp and styled.";
            }
            else if (lower.Contains("facial") || lower.Contains("clean") || lower.Contains("peel") || lower.Contains("skin") || lower.Contains("hydra"))
            {
                reminderType = "Skin Hydration & Facial Cycle";
                intervalWeeks = 4;
                baseAdvice = "Skin cell renewal occurs approximately every 28 days. A routine facial ensures unclogged pores and deep hydration.";
            }
            else if (lower.Contains("nail") || lower.Contains("mani") || lower.Contains("pedi") || lower.Contains("gel") || lower.Contains("acrylic"))
            {
                reminderType = "Nail Care & Extensions Fill-In";
                intervalWeeks = 3;
                baseAdvice = "Timely fill-ins preserve natural nail integrity and prevent lifting or breakage.";
            }
            else
            {
                reminderType = "Boutique Treatment Care";
                intervalWeeks = 4;
                baseAdvice = "Regular salon care keeps your hair and skin feeling refreshed and healthy.";
            }

            var categoryKey = $"{apt.SalonId}_{reminderType}";
            if (seenCategories.Contains(categoryKey))
            {
                continue;
            }
            seenCategories.Add(categoryKey);

            var daysElapsed = (now - apt.StartAtUtc).TotalDays;
            var daysInterval = intervalWeeks * 7;

            string dueStatus;
            if (daysElapsed >= daysInterval + 14)
            {
                dueStatus = "Overdue";
            }
            else if (daysElapsed >= daysInterval)
            {
                dueStatus = "Due Soon";
            }
            else
            {
                dueStatus = "Upcoming";
            }

            var matchingOffPeak = activeRules.FirstOrDefault(r => r.SalonId == apt.SalonId);

            var elapsedWeeks = (int)Math.Max(1, Math.Round(daysElapsed / 7.0));

            result.Add(new CustomerCareReminderResponse
            {
                ReminderType = reminderType,
                ServiceName = serviceName,
                SalonId = apt.SalonId,
                SalonName = apt.Salon != null ? apt.Salon.Name : "Studio Partner",
                SalonSlug = apt.Salon != null ? apt.Salon.Slug : "",
                LastVisitUtc = apt.StartAtUtc,
                RecommendedIntervalWeeks = intervalWeeks,
                DueStatus = dueStatus,
                RecommendationMessage = $"It has been {elapsedWeeks} week{(elapsedWeeks > 1 ? "s" : "")} since your {serviceName}. {baseAdvice}",
                ActiveOffPeakDiscount = matchingOffPeak?.DiscountPercentage
            });
        }

        return result.OrderBy(r => r.DueStatus == "Overdue" ? 0 : r.DueStatus == "Due Soon" ? 1 : 2).ToList();
    }
}
