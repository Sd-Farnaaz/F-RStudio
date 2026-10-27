using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CreatePosOrderRequest
{
    public int? CustomerId { get; set; }

    [StringLength(150, ErrorMessage = "Walk-in customer name cannot exceed 150 characters.")]
    public string? WalkInCustomerName { get; set; }

    [StringLength(50, ErrorMessage = "Phone number cannot exceed 50 characters.")]
    public string? WalkInCustomerPhone { get; set; }

    [EmailAddress(ErrorMessage = "Invalid email format.")]
    public string? WalkInCustomerEmail { get; set; }

    [Required(ErrorMessage = "StaffId is required.")]
    public int StaffId { get; set; }

    [Required(ErrorMessage = "At least one service is required.")]
    public List<int> ServiceIds { get; set; } = new();

    [Required(ErrorMessage = "PaymentMethod is required.")]
    [StringLength(30, ErrorMessage = "PaymentMethod cannot exceed 30 characters.")]
    public string PaymentMethod { get; set; } = "Cash"; // Cash, Card, UPI

    public decimal? AmountReceived { get; set; } // Cash tendered

    [Range(0, 100000, ErrorMessage = "Discount amount must be non-negative.")]
    public decimal DiscountAmount { get; set; } = 0.00m;

    public string? PaymentTransactionReference { get; set; }

    public string? Notes { get; set; }
}

public class PosReceiptItem
{
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
}

public class PosReceiptResponse
{
    public string ReceiptNumber { get; set; } = string.Empty;
    public int AppointmentId { get; set; }
    public DateTime IssuedAtUtc { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string? SalonAddress { get; set; }
    public string? SalonCity { get; set; }
    public string? SalonPhone { get; set; }
    public string? SalonEmail { get; set; }
    public string? SalonUpiId { get; set; }
    public string? SalonLogoUrl { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public List<PosReceiptItem> Items { get; set; } = new();
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string PaymentStatus { get; set; } = "Paid";
    public decimal AmountReceived { get; set; }
    public decimal ChangeDue { get; set; }
    public string? TransactionReference { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class PosOrderResponse
{
    public int AppointmentId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public decimal AmountReceived { get; set; }
    public decimal ChangeDue { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public PosReceiptResponse Receipt { get; set; } = null!;
}
