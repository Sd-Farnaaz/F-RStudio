namespace SalonBook.Api.DTOs;

public class AdminDashboardSummaryResponse
{
    public DateTime FromUtc { get; set; }

    public DateTime ToUtc { get; set; }

    public string CurrencyCode { get; set; } = "INR";

    // Appointment Metrics
    public int TotalAppointments { get; set; }

    public int UpcomingAppointments { get; set; }

    public int CompletedAppointments { get; set; }

    public int CancelledAppointments { get; set; }

    public int NoShowAppointments { get; set; }

    // Customer Metrics
    public int TotalCustomers { get; set; }

    // Financial / Revenue Metrics
    public DashboardRevenueSummary Revenue { get; set; } = new();

    // Breakdown & Trends
    public List<PopularServiceSummary> PopularServices { get; set; } = new();

    public List<AppointmentTrendItem> Trends { get; set; } = new();
}

public class DashboardRevenueSummary
{
    public decimal TotalBookingValue { get; set; }

    public decimal TotalAdvanceRequired { get; set; }

    public decimal TotalCollectedRevenue { get; set; }

    public decimal TotalVerifiedRevenue { get; set; }

    public decimal TotalPendingRevenue { get; set; }

    public decimal TotalRefundedAmount { get; set; }
}

public class PopularServiceSummary
{
    public int ServiceId { get; set; }

    public string ServiceName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public int BookingCount { get; set; }

    public decimal TotalRevenue { get; set; }
}

public class AppointmentTrendItem
{
    public string PeriodKey { get; set; } = string.Empty;

    public DateTime DateUtc { get; set; }

    public int TotalAppointments { get; set; }

    public int CompletedAppointments { get; set; }

    public int CancelledAppointments { get; set; }

    public decimal CollectedRevenue { get; set; }
}

