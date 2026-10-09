using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/test")]
public class TenantAuthorizationTestController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;

    public TenantAuthorizationTestController(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    [HttpGet("superadmin-only")]
    [Authorize(Policy = "SuperAdminOnly")]
    public IActionResult SuperAdminOnlyEndpoint()
    {
        return Ok(new
        {
            message = "Access granted to SuperAdmin platform endpoint.",
            user = _currentUserService.Email,
            role = _currentUserService.Role
        });
    }

    [HttpGet("salonadmin-only")]
    [Authorize(Policy = "SalonAdminOnly")]
    public IActionResult SalonAdminOnlyEndpoint()
    {
        return Ok(new
        {
            message = "Access granted to SalonAdmin endpoint.",
            user = _currentUserService.Email,
            role = _currentUserService.Role,
            salonId = _currentUserService.SalonId
        });
    }

    [HttpGet("customer-only")]
    [Authorize(Policy = "CustomerOnly")]
    public IActionResult CustomerOnlyEndpoint()
    {
        return Ok(new
        {
            message = "Access granted to Customer endpoint.",
            user = _currentUserService.Email,
            role = _currentUserService.Role
        });
    }

    [HttpGet("salons/{salonId:int}/protected-data")]
    [Authorize]
    public IActionResult GetTenantProtectedData(int salonId)
    {
        // Enforce strict tenant isolation:
        // 1. SuperAdmin can access any salon's data.
        // 2. Admin can ONLY access their own salon's data (SalonId matches).
        // 3. Customers (User) have no admin salon access.
        if (!_currentUserService.HasSalonAccess(salonId))
        {
            return Forbid();
        }

        return Ok(new
        {
            salonId,
            message = $"Tenant data for Salon {salonId} retrieved successfully.",
            accessedByRole = _currentUserService.Role,
            user = _currentUserService.Email
        });
    }
}
