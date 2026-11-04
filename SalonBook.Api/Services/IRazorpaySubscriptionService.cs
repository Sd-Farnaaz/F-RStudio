using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public interface IRazorpaySubscriptionService
{
    Task<SubscriptionOrderResponse> CreateSubscriptionOrderAsync(
        int salonId, 
        CreateSubscriptionOrderRequest request, 
        CancellationToken cancellationToken = default);

    Task<SubscriptionPaymentVerificationResponse> VerifySubscriptionPaymentAsync(
        int salonId, 
        VerifySubscriptionPaymentRequest request, 
        CancellationToken cancellationToken = default);

    Task<bool> ProcessWebhookEventAsync(
        string rawJson, 
        string signatureHeader, 
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SubscriptionTransactionItemResponse>> GetSalonTransactionsAsync(
        int salonId, 
        CancellationToken cancellationToken = default);
}
