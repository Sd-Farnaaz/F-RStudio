using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/admin/notifications")]
[Authorize(Policy = "SalonAdminOnly")]
public class AdminNotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<AdminNotificationsController> _logger;

    public AdminNotificationsController(
        INotificationService notificationService,
        ICurrentUserService currentUserService,
        ILogger<AdminNotificationsController> logger)
    {
        _notificationService = notificationService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve in-app notification history for the authenticated salon administrator.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAdminNotifications(
        [FromQuery] bool? unreadOnly,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var salonId = _currentUserService.SalonId;
        var adminUserId = _currentUserService.UserId;
        if (!salonId.HasValue || !adminUserId.HasValue)
        {
            return Forbid();
        }

        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 100);

        var notifications = await _notificationService.GetAdminNotificationsAsync(
            salonId.Value, adminUserId.Value, unreadOnly, skip, take, cancellationToken);

        return Ok(notifications);
    }

    /// <summary>
    /// Get count of unread in-app notifications for the authenticated salon administrator.
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(UnreadNotificationCountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        var adminUserId = _currentUserService.UserId;
        if (!salonId.HasValue || !adminUserId.HasValue)
        {
            return Forbid();
        }

        var count = await _notificationService.GetAdminUnreadCountAsync(salonId.Value, adminUserId.Value, cancellationToken);
        return Ok(new UnreadNotificationCountResponse(count));
    }

    /// <summary>
    /// Mark a specific admin in-app notification as read.
    /// </summary>
    [HttpPatch("{id:int}/read")]
    [HttpPost("{id:int}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken cancellationToken)
    {
        var adminUserId = _currentUserService.UserId;
        if (!adminUserId.HasValue)
        {
            return Forbid();
        }

        var updated = await _notificationService.MarkNotificationReadAsync(id, adminUserId.Value, cancellationToken);
        if (!updated)
        {
            return NotFound(new { message = "Notification not found or does not belong to you." });
        }

        return NoContent();
    }

    /// <summary>
    /// Mark all in-app notifications for the authenticated salon administrator as read.
    /// </summary>
    [HttpPost("read-all")]
    [ProducesResponseType(typeof(MarkAllNotificationsReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var salonId = _currentUserService.SalonId;
        var adminUserId = _currentUserService.UserId;
        if (!salonId.HasValue || !adminUserId.HasValue)
        {
            return Forbid();
        }

        var count = await _notificationService.MarkAllAdminNotificationsReadAsync(salonId.Value, adminUserId.Value, cancellationToken);
        return Ok(new MarkAllNotificationsReadResponse(count));
    }
}

