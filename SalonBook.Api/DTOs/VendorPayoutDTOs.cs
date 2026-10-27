namespace SalonBook.Api.DTOs;

public class VendorPayoutResponse
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string EscrowTransactionId { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public decimal CommissionAmount { get; set; }

    public decimal NetAmount { get; set; }

    public string CurrencyCode { get; set; } = "INR";

    public string Status { get; set; } = string.Empty;

    public string? UtrNumber { get; set; }

    public DateTime? BankReleaseAtUtc { get; set; }

    public DateTime? DisbursedAtUtc { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}

public class EscrowLedgerResponse
{
    public decimal TotalEscrowHold { get; set; }

    public decimal TotalDisbursed { get; set; }

    public decimal TotalPendingSettlement { get; set; }

    public string CurrencyCode { get; set; } = "INR";

    public PagedResult<VendorPayoutResponse> Transactions { get; set; } = new();
}

public class RequestSettlementResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int BatchedPayoutCount { get; set; }
    public decimal TotalSettlementAmount { get; set; }
    public DateTime RequestedAtUtc { get; set; }
}

public class DisbursePayoutRequest
{
    public string UtrNumber { get; set; } = string.Empty;
    public string? Notes { get; set; }
}


