using System.ComponentModel.DataAnnotations;
using SalonBook.Api.Common;

namespace SalonBook.Api.DTOs;

public class SalonPaymentSettingsResponse
{
    public int SalonId { get; set; }
    public string? UpiId { get; set; }
    public string? QrCodeImageUrl { get; set; }
    public bool IsAdvancePaymentRequired { get; set; }
    public string? AdvancePaymentType { get; set; }
    public decimal? AdvancePaymentValue { get; set; }
    public string CurrencyCode { get; set; } = "INR";
    public string CurrentTier { get; set; } = "Starter";
    public bool HasAdvanceDepositEngine { get; set; } = false;
}

public class UpdateSalonPaymentSettingsRequest : IValidatableObject
{
    [StringLength(100, ErrorMessage = "UPI ID cannot exceed 100 characters.")]
    public string? UpiId { get; set; }

    public string? QrCodeImageUrl { get; set; }

    public bool IsAdvancePaymentRequired { get; set; }

    [StringLength(20, ErrorMessage = "Advance payment type cannot exceed 20 characters.")]
    public string? AdvancePaymentType { get; set; }

    [Range(0, 1000000, ErrorMessage = "Advance payment value must be non-negative.")]
    public decimal? AdvancePaymentValue { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (IsAdvancePaymentRequired)
        {
            if (string.IsNullOrWhiteSpace(AdvancePaymentType) || !AdvancePaymentTypes.All.Contains(AdvancePaymentType))
            {
                yield return new ValidationResult(
                    $"Advance payment type must be either '{AdvancePaymentTypes.Fixed}' or '{AdvancePaymentTypes.Percentage}'.",
                    new[] { nameof(AdvancePaymentType) });
            }

            if (!AdvancePaymentValue.HasValue || AdvancePaymentValue.Value <= 0)
            {
                yield return new ValidationResult(
                    "Advance payment value must be greater than 0 when advance payment is required.",
                    new[] { nameof(AdvancePaymentValue) });
            }
            else if (string.Equals(AdvancePaymentType, AdvancePaymentTypes.Percentage, StringComparison.OrdinalIgnoreCase) &&
                     (AdvancePaymentValue.Value < 1 || AdvancePaymentValue.Value > 100))
            {
                yield return new ValidationResult(
                    "Advance payment percentage must be between 1% and 100%.",
                    new[] { nameof(AdvancePaymentValue) });
            }
        }
    }
}

public class SubmitPaymentProofRequest
{
    [Required(ErrorMessage = "Transaction reference or UTR is required.")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Transaction reference must be between 3 and 100 characters.")]
    public string PaymentTransactionReference { get; set; } = string.Empty;

    [StringLength(50, ErrorMessage = "Payment method cannot exceed 50 characters.")]
    public string? PaymentMethod { get; set; } = "UPI";

    public string? PaymentProofUrl { get; set; }

    [Range(0.01, 1000000, ErrorMessage = "Amount paid must be greater than 0.")]
    public decimal? AmountPaid { get; set; }
}

public class VerifyAppointmentPaymentRequest
{
    [Required(ErrorMessage = "Payment status is required.")]
    [StringLength(30, ErrorMessage = "Payment status cannot exceed 30 characters.")]
    public string PaymentStatus { get; set; } = PaymentStatuses.Paid;

    [Range(0, 1000000, ErrorMessage = "Amount paid must be non-negative.")]
    public decimal? AmountPaid { get; set; }

    [StringLength(50, ErrorMessage = "Payment method cannot exceed 50 characters.")]
    public string? PaymentMethod { get; set; }

    [StringLength(100, ErrorMessage = "Payment transaction reference cannot exceed 100 characters.")]
    public string? PaymentTransactionReference { get; set; }

    [StringLength(500, ErrorMessage = "Payment notes cannot exceed 500 characters.")]
    public string? Notes { get; set; }
}

public class CreatePaymentOrderRequest
{
    [Required(ErrorMessage = "AppointmentId is required.")]
    public int AppointmentId { get; set; }

    /// <summary>
    /// "Advance" (default) or "Full"
    /// </summary>
    public string AmountType { get; set; } = "Advance";

    public string? PaymentGateway { get; set; } = "Razorpay";
}

public class PaymentOrderResponse
{
    public string OrderId { get; set; } = string.Empty;
    public int AppointmentId { get; set; }
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public long AmountInPaise { get; set; }
    public string Currency { get; set; } = "INR";
    public string KeyId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? SalonLogoUrl { get; set; }
}

public class VerifyPaymentRequest
{
    [Required(ErrorMessage = "AppointmentId is required.")]
    public int AppointmentId { get; set; }

    [Required(ErrorMessage = "Razorpay Order ID is required.")]
    public string RazorpayOrderId { get; set; } = string.Empty;

    [Required(ErrorMessage = "Razorpay Payment ID is required.")]
    public string RazorpayPaymentId { get; set; } = string.Empty;

    public string? RazorpaySignature { get; set; }

    public string? PaymentMethod { get; set; } = "Razorpay Online";
}

public class PaymentVerificationResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int AppointmentId { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }
    public string TransactionReference { get; set; } = string.Empty;
    public DateTime VerifiedAtUtc { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
}

public class AppointmentInvoiceResponse
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public int AppointmentId { get; set; }
    public string AppointmentStatus { get; set; } = string.Empty;
    public DateTime AppointmentStartAtUtc { get; set; }
    public DateTime AppointmentEndAtUtc { get; set; }

    // Salon Information
    public int SalonId { get; set; }
    public string SalonName { get; set; } = string.Empty;
    public string? SalonAddress { get; set; }
    public string? SalonCity { get; set; }
    public string? SalonState { get; set; }
    public string? SalonPostalCode { get; set; }
    public string? SalonPhone { get; set; }
    public string? SalonEmail { get; set; }
    public string? SalonGstNumber { get; set; }
    public string? SalonLogoUrl { get; set; }

    // Customer Information
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;

    // Specialist & Treatment Information
    public string? StaffName { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }

    // Itemized Pricing & Tax Breakdown
    public decimal ServicePrice { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxRatePercentage { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AdvanceAmountRequired { get; set; }
    public decimal AmountPaid { get; set; }
    public decimal BalanceDue { get; set; }

    // Payment Tracking
    public string PaymentStatus { get; set; } = string.Empty;
    public string? PaymentMethod { get; set; }
    public string? PaymentTransactionReference { get; set; }
    public DateTime? PaymentVerifiedAtUtc { get; set; }
}

