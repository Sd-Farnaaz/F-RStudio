namespace SalonBook.Api.Common;

public static class AppointmentStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string Cancelled = "Cancelled";
    public const string Completed = "Completed";
    public const string NoShow = "NoShow";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Pending, Confirmed, Cancelled, Completed, NoShow
    };

    /// <summary>
    /// Statuses that occupy a staff member's working time and block availability.
    /// </summary>
    public static readonly HashSet<string> BlockingStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        Pending, Confirmed
    };

    /// <summary>
    /// Terminal lifecycle statuses from which no further transitions are allowed.
    /// </summary>
    public static readonly HashSet<string> TerminalStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        Cancelled, Completed, NoShow
    };

    /// <summary>
    /// Validates whether a status transition is permitted.
    /// </summary>
    public static bool IsValidTransition(string currentStatus, string newStatus)
    {
        if (string.Equals(currentStatus, newStatus, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (TerminalStatuses.Contains(currentStatus))
        {
            return false; // Cannot transition from terminal states
        }

        return currentStatus switch
        {
            Pending => newStatus is Confirmed or Cancelled,
            Confirmed => newStatus is Completed or Cancelled or NoShow,
            _ => false
        };
    }
}

