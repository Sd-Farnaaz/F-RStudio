namespace SalonBook.Api.Common;

public static class PaymentStatuses
{
    public const string NotRequired = "NotRequired";
    public const string Pending = "Pending";
    public const string PartiallyPaid = "PartiallyPaid";
    public const string Paid = "Paid";
    public const string Failed = "Failed";
    public const string Refunded = "Refunded";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        NotRequired, Pending, PartiallyPaid, Paid, Failed, Refunded
    };

    public static bool IsValidTransition(string currentStatus, string newStatus)
    {
        if (string.Equals(currentStatus, newStatus, StringComparison.OrdinalIgnoreCase))
            return true;

        if (currentStatus is Refunded)
            return false;

        return currentStatus switch
        {
            NotRequired => newStatus is Pending or PartiallyPaid or Paid,
            Pending => newStatus is PartiallyPaid or Paid or Failed,
            PartiallyPaid => newStatus is Paid or Failed or Refunded,
            Paid => newStatus is Refunded,
            Failed => newStatus is Pending or PartiallyPaid or Paid,
            _ => false
        };
    }
}

public static class AdvancePaymentTypes
{
    public const string Fixed = "Fixed";
    public const string Percentage = "Percentage";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Fixed, Percentage
    };
}

