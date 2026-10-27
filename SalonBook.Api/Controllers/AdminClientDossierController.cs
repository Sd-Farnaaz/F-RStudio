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
[Route("api/admin/customers/{customerId:int}")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminClientDossierController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminClientDossierController> _logger;

    public AdminClientDossierController(
        ApplicationDbContext dbContext,
        ICurrentUserService currentUserService,
        ILogger<AdminClientDossierController> logger)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve full client consultation dossier including allergy alerts, skin/hair notes,
    /// chemical formula history, and past appointment records.
    /// </summary>
    [HttpGet("dossier")]
    [ProducesResponseType(typeof(ClientDossierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetClientDossier(int customerId, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var customer = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == customerId &&
                                      u.Role == Roles.User &&
                                      (u.SalonId == salonId.Value ||
                                       u.Appointments.Any(a => a.SalonId == salonId.Value)), cancellationToken);

        if (customer == null)
        {
            return NotFound(new { message = "Customer not found in your salon records." });
        }

        var card = await _dbContext.ClientConsultationCards
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.SalonId == salonId.Value && c.CustomerId == customerId, cancellationToken);

        var formulas = await _dbContext.ClientFormulaRecords
            .AsNoTracking()
            .Where(f => f.SalonId == salonId.Value && f.CustomerId == customerId)
            .OrderByDescending(f => f.ServiceDateUtc)
            .Include(f => f.Staff)
            .Select(f => new ClientFormulaRecordResponse
            {
                Id = f.Id,
                SalonId = f.SalonId,
                CustomerId = f.CustomerId,
                AppointmentId = f.AppointmentId,
                StaffId = f.StaffId,
                StaffName = f.Staff != null ? f.Staff.FullName : f.CreatedByStaffName,
                Category = f.Category,
                FormulaDetails = f.FormulaDetails,
                Developer = f.Developer,
                ProcessingTimeMinutes = f.ProcessingTimeMinutes,
                Notes = f.Notes,
                CreatedByStaffName = f.CreatedByStaffName,
                ServiceDateUtc = f.ServiceDateUtc,
                CreatedAtUtc = f.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var visits = await _dbContext.Appointments
            .AsNoTracking()
            .Where(a => a.SalonId == salonId.Value && a.CustomerId == customerId)
            .OrderByDescending(a => a.StartAtUtc)
            .Include(a => a.Staff)
            .Select(a => new ClientVisitHistoryItemResponse
            {
                AppointmentId = a.Id,
                ServiceName = a.ServiceNameAtBooking,
                StaffName = a.Staff.FullName,
                StartAtUtc = a.StartAtUtc,
                Price = a.PriceAtBooking,
                Status = a.Status,
                PaymentStatus = a.PaymentStatus,
                CustomerNotes = a.CustomerNotes
            })
            .ToListAsync(cancellationToken);

        var response = new ClientDossierResponse
        {
            CustomerId = customer.Id,
            FullName = customer.FullName,
            Email = customer.Email,
            PhoneNumber = null,
            CreatedAtUtc = customer.CreatedAtUtc,
            ConsultationCard = card != null ? new ClientConsultationCardResponse
            {
                Id = card.Id,
                SalonId = card.SalonId,
                CustomerId = card.CustomerId,
                Allergies = card.Allergies,
                SkinOrHairNotes = card.SkinOrHairNotes,
                PrivateStaffNotes = card.PrivateStaffNotes,
                IsPatchTested = card.IsPatchTested,
                PatchTestDate = card.PatchTestDate,
                EmergencyContactName = card.EmergencyContactName,
                EmergencyContactPhone = card.EmergencyContactPhone,
                CreatedAtUtc = card.CreatedAtUtc,
                UpdatedAtUtc = card.UpdatedAtUtc
            } : null,
            Formulas = formulas,
            VisitHistory = visits
        };

        return Ok(response);
    }

    /// <summary>
    /// Upsert (create or update) consultation card notes, allergies, and patch test info for a customer.
    /// </summary>
    [HttpPut("consultation")]
    [ProducesResponseType(typeof(ClientConsultationCardResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateConsultationCard(
        int customerId,
        [FromBody] UpdateClientConsultationRequest request,
        CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var customerExists = await _dbContext.Users
            .AnyAsync(u => u.Id == customerId &&
                           u.Role == Roles.User &&
                           (u.SalonId == salonId.Value ||
                            u.Appointments.Any(a => a.SalonId == salonId.Value)), cancellationToken);

        if (!customerExists)
        {
            return NotFound(new { message = "Customer not found in your salon." });
        }

        var card = await _dbContext.ClientConsultationCards
            .FirstOrDefaultAsync(c => c.SalonId == salonId.Value && c.CustomerId == customerId, cancellationToken);

        if (card == null)
        {
            card = new ClientConsultationCard
            {
                SalonId = salonId.Value,
                CustomerId = customerId,
                Allergies = request.Allergies?.Trim(),
                SkinOrHairNotes = request.SkinOrHairNotes?.Trim(),
                PrivateStaffNotes = request.PrivateStaffNotes?.Trim(),
                IsPatchTested = request.IsPatchTested,
                PatchTestDate = request.PatchTestDate,
                EmergencyContactName = request.EmergencyContactName?.Trim(),
                EmergencyContactPhone = request.EmergencyContactPhone?.Trim(),
                CreatedAtUtc = DateTime.UtcNow
            };
            _dbContext.ClientConsultationCards.Add(card);
        }
        else
        {
            card.Allergies = request.Allergies?.Trim();
            card.SkinOrHairNotes = request.SkinOrHairNotes?.Trim();
            card.PrivateStaffNotes = request.PrivateStaffNotes?.Trim();
            card.IsPatchTested = request.IsPatchTested;
            card.PatchTestDate = request.PatchTestDate;
            card.EmergencyContactName = request.EmergencyContactName?.Trim();
            card.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
            card.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Consultation card updated for Customer {CustomerId} in Salon {SalonId} by Admin {Email}.",
            customerId, salonId.Value, _currentUserService.Email);

        return Ok(new ClientConsultationCardResponse
        {
            Id = card.Id,
            SalonId = card.SalonId,
            CustomerId = card.CustomerId,
            Allergies = card.Allergies,
            SkinOrHairNotes = card.SkinOrHairNotes,
            PrivateStaffNotes = card.PrivateStaffNotes,
            IsPatchTested = card.IsPatchTested,
            PatchTestDate = card.PatchTestDate,
            EmergencyContactName = card.EmergencyContactName,
            EmergencyContactPhone = card.EmergencyContactPhone,
            CreatedAtUtc = card.CreatedAtUtc,
            UpdatedAtUtc = card.UpdatedAtUtc
        });
    }

    /// <summary>
    /// Record a color or chemical formula for a customer.
    /// </summary>
    [HttpPost("formulas")]
    [ProducesResponseType(typeof(ClientFormulaRecordResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddFormulaRecord(
        int customerId,
        [FromBody] CreateClientFormulaRequest request,
        CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var customerExists = await _dbContext.Users
            .AnyAsync(u => u.Id == customerId &&
                           u.Role == Roles.User &&
                           (u.SalonId == salonId.Value ||
                            u.Appointments.Any(a => a.SalonId == salonId.Value)), cancellationToken);

        if (!customerExists)
        {
            return NotFound(new { message = "Customer not found in your salon." });
        }

        string? staffName = null;
        if (request.StaffId.HasValue)
        {
            var staff = await _dbContext.Staff
                .FirstOrDefaultAsync(s => s.Id == request.StaffId.Value && s.SalonId == salonId.Value, cancellationToken);
            if (staff != null)
            {
                staffName = staff.FullName;
            }
        }

        var record = new ClientFormulaRecord
        {
            SalonId = salonId.Value,
            CustomerId = customerId,
            AppointmentId = request.AppointmentId,
            StaffId = request.StaffId,
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Color" : request.Category.Trim(),
            FormulaDetails = request.FormulaDetails.Trim(),
            Developer = request.Developer?.Trim(),
            ProcessingTimeMinutes = request.ProcessingTimeMinutes,
            Notes = request.Notes?.Trim(),
            CreatedByStaffName = staffName ?? _currentUserService.Email,
            ServiceDateUtc = request.ServiceDateUtc ?? DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.ClientFormulaRecords.Add(record);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Formula record ID {FormulaId} added for Customer {CustomerId} by Admin {Email}.",
            record.Id, customerId, _currentUserService.Email);

        var response = new ClientFormulaRecordResponse
        {
            Id = record.Id,
            SalonId = record.SalonId,
            CustomerId = record.CustomerId,
            AppointmentId = record.AppointmentId,
            StaffId = record.StaffId,
            StaffName = record.CreatedByStaffName,
            Category = record.Category,
            FormulaDetails = record.FormulaDetails,
            Developer = record.Developer,
            ProcessingTimeMinutes = record.ProcessingTimeMinutes,
            Notes = record.Notes,
            CreatedByStaffName = record.CreatedByStaffName,
            ServiceDateUtc = record.ServiceDateUtc,
            CreatedAtUtc = record.CreatedAtUtc
        };

        return CreatedAtAction(nameof(GetClientDossier), new { customerId }, response);
    }

    /// <summary>
    /// Delete a recorded formula entry.
    /// </summary>
    [HttpDelete("formulas/{formulaId:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFormulaRecord(int customerId, int formulaId, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var record = await _dbContext.ClientFormulaRecords
            .FirstOrDefaultAsync(f => f.Id == formulaId && f.SalonId == salonId.Value && f.CustomerId == customerId, cancellationToken);

        if (record == null)
        {
            return NotFound(new { message = "Formula record not found." });
        }

        _dbContext.ClientFormulaRecords.Remove(record);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Formula record deleted successfully." });
    }
}

