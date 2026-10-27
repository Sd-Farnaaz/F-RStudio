namespace SalonBook.Api.DTOs;

public class OffPeakRuleDTO
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string DaysOfWeek { get; set; } = string.Empty;

    public string StartTime { get; set; } = string.Empty;

    public string EndTime { get; set; } = string.Empty;

    public decimal DiscountPercentage { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}

public class CreateOffPeakRuleRequest
{
    public string Name { get; set; } = string.Empty;

    public string DaysOfWeek { get; set; } = string.Empty;

    public string StartTime { get; set; } = "10:00";

    public string EndTime { get; set; } = "13:00";

    public decimal DiscountPercentage { get; set; } = 20.00m;

    public bool IsActive { get; set; } = true;
}

public class UpdateOffPeakRuleRequest
{
    public string Name { get; set; } = string.Empty;

    public string DaysOfWeek { get; set; } = string.Empty;

    public string StartTime { get; set; } = "10:00";

    public string EndTime { get; set; } = "13:00";

    public decimal DiscountPercentage { get; set; } = 20.00m;

    public bool IsActive { get; set; } = true;
}

public class ReEngagementCandidateResponse
{
    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string CustomerEmail { get; set; } = string.Empty;

    public string? CustomerPhone { get; set; }

    public DateTime LastVisitDate { get; set; }

    public int DaysSinceLastVisit { get; set; }

    public int WeeksSinceLastVisit { get; set; }

    public int TotalPastVisits { get; set; }

    public string LastServiceName { get; set; } = string.Empty;
}

public class SendReEngagementRequest
{
    public List<int> CustomerIds { get; set; } = new();

    public string Channel { get; set; } = "WhatsApp"; // "WhatsApp" | "SMS" | "Email" | "MultiChannel"

    public string CouponCode { get; set; } = "MISSYOU10";

    public decimal DiscountPercentage { get; set; } = 10.00m;

    public string CustomMessage { get; set; } = string.Empty;
}

public class ReEngagementResultResponse
{
    public int TotalTargeted { get; set; }

    public int SuccessfullySent { get; set; }

    public string CouponCode { get; set; } = "MISSYOU10";

    public decimal DiscountPercentage { get; set; } = 10.00m;

    public DateTime DispatchedAtUtc { get; set; } = DateTime.UtcNow;
}

public class AutomatedMessageLogResponse
{
    public int Id { get; set; }

    public int RecipientUserId { get; set; }

    public string RecipientName { get; set; } = string.Empty;

    public string RecipientContact { get; set; } = string.Empty;

    public int? AppointmentId { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Channel { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateTime? SentAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}

