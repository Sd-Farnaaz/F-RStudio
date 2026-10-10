using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Policy = "CustomerOnly")]
public class CustomerNotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ILogger<CustomerNotificationsController> _logger;

    public CustomerNotificationsController(
        INotificationService notificationService,
        ICurrentUserService currentUserService,
        ILogger<CustomerNotificationsController> logger)
    {
        _notificationService = notificationService;
        _currentUserService = currentUserService;
        _logger = logger;
    }

    /// <summary>
    /// Retrieve in-app notification history for the authenticated customer.
    /// </summary>
    [HttpGet("my")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetMyNotifications(
        [FromQuery] bool? unreadOnly,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 100);

        var notifications = await _notificationService.GetCustomerNotificationsAsync(
            customerId.Value, unreadOnly, skip, take, cancellationToken);

        return Ok(notifications);
    }

    /// <summary>
    /// Get the count of unread in-app notifications for the authenticated customer.
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(UnreadNotificationCountResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var count = await _notificationService.GetCustomerUnreadCountAsync(customerId.Value, cancellationToken);
        return Ok(new UnreadNotificationCountResponse(count));
    }

    /// <summary>
    /// Mark a specific in-app notification as read.
    /// </summary>
    [HttpPatch("{id:int}/read")]
    [HttpPost("{id:int}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var updated = await _notificationService.MarkNotificationReadAsync(id, customerId.Value, cancellationToken);
        if (!updated)
        {
            return NotFound(new { message = "Notification not found or does not belong to you." });
        }

        return NoContent();
    }

    /// <summary>
    /// Mark all in-app notifications for the authenticated customer as read.
    /// </summary>
    [HttpPost("read-all")]
    [ProducesResponseType(typeof(MarkAllNotificationsReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var customerId = _currentUserService.UserId;
        if (!customerId.HasValue)
        {
            return Forbid();
        }

        var markedCount = await _notificationService.MarkAllCustomerNotificationsReadAsync(customerId.Value, cancellationToken);
        return Ok(new MarkAllNotificationsReadResponse(markedCount));
    }
}

