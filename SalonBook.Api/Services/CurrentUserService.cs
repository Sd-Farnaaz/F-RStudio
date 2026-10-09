using System.Security.Claims;
using SalonBook.Api.Common;

namespace SalonBook.Api.Services;

public interface ICurrentUserService
{
    int? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    int? SalonId { get; }
    bool IsAuthenticated { get; }
    bool IsSuperAdmin { get; }
    bool IsAdmin { get; }
    bool IsCustomer { get; }
    bool HasSalonAccess(int salonId);
}

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public int? UserId
    {
        get
        {
            var idClaim = User?.FindFirst(CustomClaimTypes.UserId)?.Value
                ?? User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User?.FindFirst("sub")?.Value;

            return int.TryParse(idClaim, out var id) ? id : null;
        }
    }

    public string? Email =>
        User?.FindFirst(CustomClaimTypes.Email)?.Value
        ?? User?.FindFirst(ClaimTypes.Email)?.Value;

    public string? Role =>
        User?.FindFirst(CustomClaimTypes.Role)?.Value
        ?? User?.FindFirst(ClaimTypes.Role)?.Value;

    public int? SalonId
    {
        get
        {
            var salonClaim = User?.FindFirst(CustomClaimTypes.SalonId)?.Value;
            return int.TryParse(salonClaim, out var id) ? id : null;
        }
    }

    public bool IsSuperAdmin => Role == Roles.SuperAdmin;

    public bool IsAdmin => Role == Roles.Admin;

    public bool IsCustomer => Role == Roles.User;

    public bool HasSalonAccess(int salonId)
    {
        if (IsSuperAdmin)
            return true;

        if (IsAdmin && SalonId.HasValue && SalonId.Value == salonId)
            return true;

        return false;
    }
}
