using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/customers")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminCustomersController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminCustomersController> _logger;

    public AdminCustomersController(
        ApplicationDbContext dbContext,
        IPasswordHasher<User> passwordHasher,
        ICurrentUserService currentUserService,
        ILogger<AdminCustomersController> logger)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new customer account from the salon admin portal.
    /// Customers are global accounts (Role = User, SalonId = null).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailExists = await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (emailExists)
        {
            return Conflict(new { message = "An account with this email address already exists." });
        }

        var customer = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Role = Roles.User, // Strictly enforce customer role - cannot create Admin or SuperAdmin
            SalonId = null,    // Customer accounts are global across all salons
            IsActive = true,
            IsEmailVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        customer.PasswordHash = _passwordHasher.HashPassword(customer, request.Password);
        _dbContext.Users.Add(customer);
        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Salon Admin (SalonId: {SalonId}) created customer account for {Email} (UserId: {UserId})",
            salonId.Value, customer.Email, customer.Id);

        var response = MapToCustomerResponse(customer);
        return CreatedAtAction(nameof(GetCustomerById), new { id = customer.Id }, response);
    }

    /// <summary>
    /// Get a customer by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CustomerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomerById(int id, CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        if (!salonId.HasValue)
        {
            return Forbid();
        }

        var customer = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && u.Role == Roles.User, cancellationToken);

        if (customer == null)
        {
            return NotFound(new { message = "Customer not found." });
        }

        return Ok(MapToCustomerResponse(customer));
    }

    /// <summary>
    /// Search or list customers.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<CustomerResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ListCustomers(
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

        var query = _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.User);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var customers = await query
            .OrderBy(u => u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => MapToCustomerResponse(u))
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<CustomerResponse>
        {
            Items = customers,
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        });
    }

    private static CustomerResponse MapToCustomerResponse(User user)
    {
        return new CustomerResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAtUtc = user.CreatedAtUtc
        };
    }
}

