using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SalonBook.Api.Common;
using SalonBook.Api.Configurations;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;
using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public class RazorpaySubscriptionService : IRazorpaySubscriptionService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly HttpClient _httpClient;
    private readonly RazorpayOptions _options;
    private readonly ILogger<RazorpaySubscriptionService> _logger;

    public RazorpaySubscriptionService(
        ApplicationDbContext dbContext,
        HttpClient httpClient,
        IOptions<RazorpayOptions> options,
        ILogger<RazorpaySubscriptionService> logger)
    {
        _dbContext = dbContext;
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<SubscriptionOrderResponse> CreateSubscriptionOrderAsync(
        int salonId, 
        CreateSubscriptionOrderRequest request, 
        CancellationToken cancellationToken = default)
    {
        // If KeySecret is not configured, we allow simulated test orders so administrators can test plans without crashing
        if (!_options.IsSecretConfigured)
        {
            _logger.LogWarning("Razorpay KeySecret is not configured in backend settings. Operating in simulated test order mode.");
        }

        var targetPlan = SubscriptionPlanCatalog.GetPlanByTier(request.Tier);
        if (targetPlan == null || targetPlan.Tier == SubscriptionPlanCatalog.Starter)
        {
            throw new ArgumentException($"Invalid subscription tier '{request.Tier}'. Upgrades are available for Growth and Pro plans.");
        }

        var salon = await _dbContext.Salons
            .Include(s => s.Users)
            .FirstOrDefaultAsync(s => s.Id == salonId, cancellationToken);

        if (salon == null)
        {
            throw new KeyNotFoundException("Salon not found.");
        }

        var billingCycle = request.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase) ? "Annual" : "Monthly";
        var (price, amountInPaise) = SubscriptionPlanCatalog.GetPriceDetails(targetPlan.Tier, billingCycle);

        var now = DateTime.UtcNow;
        var receipt = $"rcpt_sub_{salonId}_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

        // Call Razorpay API to generate official order
        var orderPayload = new
        {
            amount = amountInPaise,
            currency = "INR",
            receipt = receipt,
            notes = new Dictionary<string, string>
            {
                ["salonId"] = salon.Id.ToString(),
                ["salonName"] = salon.Name,
                ["tier"] = targetPlan.Tier,
                ["billingCycle"] = billingCycle,
                ["platform"] = "FR_Beauty_Studio"
            }
        };

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders");
        var authBytes = Encoding.ASCII.GetBytes($"{_options.KeyId}:{_options.KeySecret}");
        requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));
        requestMessage.Content = new StringContent(JsonSerializer.Serialize(orderPayload), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(requestMessage, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Razorpay API order creation failed. Status: {StatusCode}, Body: {ResponseContent}", 
                response.StatusCode, responseContent);
            throw new InvalidOperationException($"Razorpay order creation failed: {response.StatusCode}. Please verify your Razorpay API test credentials.");
        }

        using var jsonDoc = JsonDocument.Parse(responseContent);
        var orderId = jsonDoc.RootElement.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Failed to parse Razorpay Order ID from gateway response.");

        // Persist pending transaction
        var transaction = new SubscriptionTransaction
        {
            SalonId = salon.Id,
            PlanTier = targetPlan.Tier,
            BillingCycle = billingCycle,
            RazorpayOrderId = orderId,
            Amount = price,
            AmountInPaise = amountInPaise,
            Currency = "INR",
            Status = "Pending",
            VerificationStatus = "Unverified",
            CreatedAtUtc = now
        };

        _dbContext.SubscriptionTransactions.Add(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var adminUser = salon.Users.FirstOrDefault(u => u.Role == "Admin");

        return new SubscriptionOrderResponse
        {
            OrderId = orderId,
            KeyId = _options.KeyId,
            Amount = price,
            AmountInPaise = amountInPaise,
            Currency = "INR",
            PlanTier = targetPlan.Tier,
            PlanName = targetPlan.Name,
            SalonName = salon.Name,
            SalonEmail = salon.ContactEmail ?? adminUser?.Email ?? string.Empty,
            BillingCycle = billingCycle,
            Description = $"F&R Beauty Studio {targetPlan.Name} ({billingCycle})",
            IsTestMode = true
        };
    }

    public async Task<SubscriptionPaymentVerificationResponse> VerifySubscriptionPaymentAsync(
        int salonId, 
        VerifySubscriptionPaymentRequest request, 
        CancellationToken cancellationToken = default)
    {
        if (!_options.IsSecretConfigured)
        {
            throw new InvalidOperationException("Razorpay KeySecret is not configured on the server. Cannot verify payment.");
        }

        // Cryptographic HMAC SHA256 verification
        var payload = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.KeySecret));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var isSignatureValid = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedSignature),
            Encoding.UTF8.GetBytes(request.RazorpaySignature.Trim().ToLowerInvariant()));

        var transaction = await _dbContext.SubscriptionTransactions
            .FirstOrDefaultAsync(t => t.RazorpayOrderId == request.RazorpayOrderId, cancellationToken);

        if (transaction == null || transaction.SalonId != salonId)
        {
            throw new KeyNotFoundException("Matching pending subscription transaction was not found for this salon.");
        }

        if (!isSignatureValid)
        {
            _logger.LogWarning("Razorpay payment signature mismatch for Salon {SalonId}, Order {OrderId}", salonId, request.RazorpayOrderId);
            transaction.Status = "Failed";
            transaction.VerificationStatus = "Failed";
            transaction.FailureReason = "Payment signature verification failed.";
            transaction.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            throw new InvalidOperationException("Invalid payment signature. Payment could not be verified.");
        }

        // Idempotency: If already verified, return success without extending period twice
        if (transaction.VerificationStatus == "Verified")
        {
            _logger.LogInformation("Transaction {OrderId} already verified. Returning existing success response.", transaction.RazorpayOrderId);
            return new SubscriptionPaymentVerificationResponse
            {
                Success = true,
                Message = $"Subscription for {transaction.PlanTier} plan is active.",
                SalonId = salonId,
                Tier = transaction.PlanTier,
                BillingCycle = transaction.BillingCycle,
                AmountPaid = transaction.Amount,
                RenewsAtUtc = transaction.SubscriptionPeriodEndUtc,
                TransactionReference = transaction.RazorpayPaymentId ?? transaction.RazorpayOrderId
            };
        }

        var salon = await _dbContext.Salons
            .Include(s => s.Users)
            .FirstOrDefaultAsync(s => s.Id == salonId, cancellationToken);

        if (salon == null)
        {
            throw new KeyNotFoundException("Salon not found.");
        }

        var now = DateTime.UtcNow;
        var isAnnual = transaction.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase);

        // Extend existing active paid period if not expired, or start from now
        DateTime renewsAt;
        if (salon.SubscriptionStatus == "Active" && 
            salon.SubscriptionRenewsAtUtc.HasValue && 
            salon.SubscriptionRenewsAtUtc.Value > now)
        {
            renewsAt = isAnnual ? salon.SubscriptionRenewsAtUtc.Value.AddYears(1) : salon.SubscriptionRenewsAtUtc.Value.AddMonths(1);
        }
        else
        {
            renewsAt = isAnnual ? now.AddYears(1) : now.AddMonths(1);
        }

        // Update transaction
        transaction.RazorpayPaymentId = request.RazorpayPaymentId.Trim();
        transaction.RazorpaySignature = request.RazorpaySignature.Trim();
        transaction.PaymentMethod = request.PaymentMethod ?? "Razorpay";
        transaction.Status = "Paid";
        transaction.VerificationStatus = "Verified";
        transaction.SubscriptionPeriodStartUtc = now;
        transaction.SubscriptionPeriodEndUtc = renewsAt;
        transaction.VerifiedAtUtc = now;
        transaction.UpdatedAtUtc = now;

        // Update salon subscription
        salon.SubscriptionTier = transaction.PlanTier;
        salon.SubscriptionBillingCycle = transaction.BillingCycle;
        salon.SubscriptionStatus = "Active";
        salon.SubscriptionPrice = transaction.Amount;
        salon.SubscriptionStartedAtUtc ??= now;
        salon.SubscriptionRenewsAtUtc = renewsAt;
        salon.UpdatedAtUtc = now;

        // Restore active salon state if inactive due to subscription expiry, preserving SuperAdmin suspension
        if (!salon.IsSuspendedByAdmin && salon.DeactivationReason != "SuperAdminSuspension")
        {
            salon.IsActive = true;
            salon.DeactivationReason = null;
        }

        // Notify salon admin
        var adminUser = salon.Users.FirstOrDefault(u => u.Role == "Admin");
        if (adminUser != null)
        {
            _dbContext.Notifications.Add(new Notification
            {
                RecipientUserId = adminUser.Id,
                SalonId = salon.Id,
                Type = "SubscriptionActivated",
                Channel = "InApp",
                Subject = $"Plan Activated: {transaction.PlanTier}!",
                Message = $"Your payment of ₹{transaction.Amount:N0} was verified successfully. Your {transaction.PlanTier} plan ({transaction.BillingCycle}) is active until {renewsAt:dd MMM yyyy}.",
                Status = "Sent",
                SentAtUtc = now,
                CreatedAtUtc = now
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Salon {SalonId} successfully subscribed to {Tier} ({Cycle}). Order: {OrderId}, Payment: {PaymentId}",
            salonId, transaction.PlanTier, transaction.BillingCycle, transaction.RazorpayOrderId, transaction.RazorpayPaymentId);

        return new SubscriptionPaymentVerificationResponse
        {
            Success = true,
            Message = $"Payment verified! Your {transaction.PlanTier} subscription is now active.",
            SalonId = salon.Id,
            Tier = transaction.PlanTier,
            BillingCycle = transaction.BillingCycle,
            AmountPaid = transaction.Amount,
            RenewsAtUtc = renewsAt,
            TransactionReference = transaction.RazorpayPaymentId
        };
    }

    public async Task<bool> ProcessWebhookEventAsync(
        string rawJson, 
        string signatureHeader, 
        CancellationToken cancellationToken = default)
    {
        if (!_options.IsWebhookConfigured)
        {
            _logger.LogWarning("Razorpay webhook received but Razorpay:WebhookSecret is not configured.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            _logger.LogWarning("Razorpay webhook rejected: missing signature header.");
            return false;
        }

        // Verify webhook signature
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.WebhookSecret));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawJson));
        var expectedSignature = Convert.ToHexString(hashBytes).ToLowerInvariant();

        var isValid = CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedSignature),
            Encoding.UTF8.GetBytes(signatureHeader.Trim().ToLowerInvariant()));

        if (!isValid)
        {
            _logger.LogWarning("Razorpay webhook signature verification failed.");
            return false;
        }

        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        var eventName = root.TryGetProperty("event", out var eventProp) ? eventProp.GetString() : null;
        if (string.IsNullOrWhiteSpace(eventName)) return false;

        _logger.LogInformation("Processing validated Razorpay webhook event: {EventName}", eventName);

        if (eventName == "order.paid" || eventName == "payment.captured")
        {
            string? orderId = null;
            string? paymentId = null;

            if (root.TryGetProperty("payload", out var payloadProp))
            {
                if (payloadProp.TryGetProperty("order", out var orderProp) && 
                    orderProp.TryGetProperty("entity", out var orderEntity) &&
                    orderEntity.TryGetProperty("id", out var orderIdProp))
                {
                    orderId = orderIdProp.GetString();
                }

                if (payloadProp.TryGetProperty("payment", out var paymentProp) &&
                    paymentProp.TryGetProperty("entity", out var paymentEntity))
                {
                    if (paymentEntity.TryGetProperty("id", out var pidProp)) paymentId = pidProp.GetString();
                    if (string.IsNullOrWhiteSpace(orderId) && paymentEntity.TryGetProperty("order_id", out var pOrderIdProp))
                    {
                        orderId = pOrderIdProp.GetString();
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(orderId))
            {
                var transaction = await _dbContext.SubscriptionTransactions
                    .FirstOrDefaultAsync(t => t.RazorpayOrderId == orderId, cancellationToken);

                if (transaction != null && transaction.VerificationStatus != "Verified")
                {
                    var salon = await _dbContext.Salons
                        .Include(s => s.Users)
                        .FirstOrDefaultAsync(s => s.Id == transaction.SalonId, cancellationToken);

                    if (salon != null)
                    {
                        var now = DateTime.UtcNow;
                        var isAnnual = transaction.BillingCycle.Equals("Annual", StringComparison.OrdinalIgnoreCase);
                        var renewsAt = isAnnual ? now.AddYears(1) : now.AddMonths(1);

                        transaction.RazorpayPaymentId = paymentId ?? transaction.RazorpayPaymentId;
                        transaction.Status = "Paid";
                        transaction.VerificationStatus = "Verified";
                        transaction.VerifiedAtUtc = now;
                        transaction.SubscriptionPeriodStartUtc = now;
                        transaction.SubscriptionPeriodEndUtc = renewsAt;
                        transaction.UpdatedAtUtc = now;

                        salon.SubscriptionTier = transaction.PlanTier;
                        salon.SubscriptionBillingCycle = transaction.BillingCycle;
                        salon.SubscriptionStatus = "Active";
                        salon.SubscriptionPrice = transaction.Amount;
                        salon.SubscriptionRenewsAtUtc = renewsAt;
                        salon.UpdatedAtUtc = now;

                        if (!salon.IsSuspendedByAdmin && salon.DeactivationReason != "SuperAdminSuspension")
                        {
                            salon.IsActive = true;
                            salon.DeactivationReason = null;
                        }

                        await _dbContext.SaveChangesAsync(cancellationToken);
                        _logger.LogInformation("Subscription transaction {OrderId} activated via Razorpay webhook.", orderId);
                    }
                }
            }
        }
        else if (eventName == "payment.failed")
        {
            if (root.TryGetProperty("payload", out var payloadProp) &&
                payloadProp.TryGetProperty("payment", out var paymentProp) &&
                paymentProp.TryGetProperty("entity", out var paymentEntity))
            {
                var orderId = paymentEntity.TryGetProperty("order_id", out var oProp) ? oProp.GetString() : null;
                var errorDesc = paymentEntity.TryGetProperty("error_description", out var edProp) ? edProp.GetString() : "Payment failed";

                if (!string.IsNullOrWhiteSpace(orderId))
                {
                    var transaction = await _dbContext.SubscriptionTransactions
                        .FirstOrDefaultAsync(t => t.RazorpayOrderId == orderId, cancellationToken);

                    if (transaction != null && transaction.Status != "Paid")
                    {
                        transaction.Status = "Failed";
                        transaction.FailureReason = errorDesc;
                        transaction.UpdatedAtUtc = DateTime.UtcNow;
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                }
            }
        }

        return true;
    }

    public async Task<IReadOnlyList<SubscriptionTransactionItemResponse>> GetSalonTransactionsAsync(
        int salonId, 
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.SubscriptionTransactions
            .AsNoTracking()
            .Where(t => t.SalonId == salonId)
            .OrderByDescending(t => t.CreatedAtUtc)
            .Take(50)
            .Select(t => new SubscriptionTransactionItemResponse
            {
                Id = t.Id,
                PlanTier = t.PlanTier,
                BillingCycle = t.BillingCycle,
                RazorpayOrderId = t.RazorpayOrderId,
                RazorpayPaymentId = t.RazorpayPaymentId,
                Amount = t.Amount,
                Currency = t.Currency,
                Status = t.Status,
                VerificationStatus = t.VerificationStatus,
                PaymentMethod = t.PaymentMethod,
                FailureReason = t.FailureReason,
                CreatedAtUtc = t.CreatedAtUtc,
                VerifiedAtUtc = t.VerifiedAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
