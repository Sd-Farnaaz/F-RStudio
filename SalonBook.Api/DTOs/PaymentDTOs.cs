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
}

public class UpdateSalonPaymentSettingsRequest : IValidatableObject
{
    [StringLength(100, ErrorMessage = "UPI ID cannot exceed 100 characters.")]
    public string? UpiId { get; set; }

    [StringLength(500, ErrorMessage = "QR code image URL cannot exceed 500 characters.")]
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

    [StringLength(500, ErrorMessage = "Payment proof URL cannot exceed 500 characters.")]
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

