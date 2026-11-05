using System.Net;
using System.Security.Claims;
using System.Text.Json;

namespace SalonBook.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private static readonly HashSet<string> SensitiveQueryKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "token", "secret", "password", "key", "auth", "signature", "pwd", "apikey",
        "access_token", "refresh_token", "cvv", "card", "authorization"
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var method = context.Request.Method;
            var path = context.Request.Path.Value ?? "/";
            var sanitizedQuery = SanitizeQueryString(context.Request.Query);
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Anonymous";
            var userRole = context.User?.FindFirst(ClaimTypes.Role)?.Value ?? "None";
            var traceId = context.TraceIdentifier;

            _logger.LogError(
                ex,
                "Unhandled exception processing HTTP {Method} {Path}{Query} | User: {UserId} | Role: {UserRole} | TraceId: {TraceId}",
                method,
                path,
                sanitizedQuery,
                userId,
                userRole,
                traceId);

            await HandleExceptionAsync(context, ex, traceId);
        }
    }

    private static string SanitizeQueryString(IQueryCollection query)
    {
        if (query.Count == 0)
        {
            return string.Empty;
        }

        var sanitizedPairs = query.Select(kv =>
        {
            if (SensitiveQueryKeys.Contains(kv.Key))
            {
                return $"{kv.Key}=[REDACTED]";
            }
            return $"{kv.Key}={kv.Value}";
        });

        return "?" + string.Join("&", sanitizedPairs);
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception, string traceId)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new
        {
            status = context.Response.StatusCode,
            title = "An unexpected error occurred.",
            detail = _env.IsDevelopment() ? exception.Message : "An internal server error occurred. Please contact support.",
            instance = context.Request.Path.Value,
            traceId = traceId,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        return context.Response.WriteAsync(json);
    }
}
