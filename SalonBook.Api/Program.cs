using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SalonBook.Api.Common;
using SalonBook.Api.Configurations;
using SalonBook.Api.Data;
using SalonBook.Api.Middleware;
using SalonBook.Api.Models;
using SalonBook.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Structured Logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// 2. Database Configuration
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found in configuration.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlServerOptions =>
    {
        sqlServerOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    });
});

// 3. JWT & Security Options
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.SectionName));
builder.Services.PostConfigure<EmailOptions>(options =>
{
    var envPass = Environment.GetEnvironmentVariable("Email__SmtpPassword") 
        ?? Environment.GetEnvironmentVariable("EMAIL_SMTP_PASSWORD")
        ?? Environment.GetEnvironmentVariable("BREVO_SMTP_KEY");
    if (!string.IsNullOrWhiteSpace(envPass) && string.IsNullOrWhiteSpace(options.SmtpPassword))
    {
        options.SmtpPassword = envPass.Trim();
    }
});
builder.Services.Configure<RazorpayOptions>(builder.Configuration.GetSection(RazorpayOptions.SectionName));
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();

// In production, ensure SecretKey is set securely
if (string.IsNullOrWhiteSpace(jwtOptions.SecretKey) && !builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException("CRITICAL: JWT SecretKey is not configured. Set 'Jwt:SecretKey' via environment variables or user secrets.");
}

// 4. Core Application Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ISlugService, SlugService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<ISuperAdminProvisioningService, SuperAdminProvisioningService>();
builder.Services.AddSingleton<IDatabaseSafetyInitializer, DatabaseSafetyInitializer>();
builder.Services.AddScoped<IMediaStorageService, LocalMediaStorageService>();
builder.Services.AddScoped<ISalonImageStorageService, LocalSalonImageStorageService>();
builder.Services.AddScoped<IAvailabilityService, AvailabilityService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddSingleton<IEmailTemplateBuilder, EmailTemplateBuilder>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IAiStylistService, AiStylistService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IRazorpaySubscriptionService, RazorpaySubscriptionService>();
builder.Services.AddHostedService<AppointmentReminderWorker>();
builder.Services.AddHostedService<SubscriptionLifecycleWorker>();

// 5. Authentication with JWT Bearer
var signingKey = Encoding.UTF8.GetBytes(string.IsNullOrWhiteSpace(jwtOptions.SecretKey) ? "Development_Fallback_Key_32_Characters_Minimum!" : jwtOptions.SecretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(signingKey),
        ValidateIssuer = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtOptions.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// 6. Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminOnly", policy => policy.RequireRole(Roles.SuperAdmin));
    options.AddPolicy("SalonAdminOnly", policy => policy.RequireRole(Roles.Admin));
    options.AddPolicy("CustomerOnly", policy => policy.RequireRole(Roles.User));
});

// 7. Rate Limiting for Security
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("AuthRateLimit", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));
});

// 8. Database-aware Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>("database");

// 9. CORS Policy - Configured for production Render and local development
const string FrontendCorsPolicy = "AllowFrontendDev";
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
var defaultOrigins = new[]
{
    "https://salonbook-frontend.onrender.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175"
};
var allowedOrigins = configuredOrigins.Length > 0
    ? configuredOrigins.Union(defaultOrigins, StringComparer.OrdinalIgnoreCase).ToArray()
    : defaultOrigins;

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        if (builder.Environment.IsDevelopment() || configuredOrigins.Contains("*"))
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
        else
        {
            policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin)) return false;
                if (allowedOrigins.Any(ao => string.Equals(ao, origin, StringComparison.OrdinalIgnoreCase)))
                    return true;
                // Allow vercel, netlify, onrender, and localhost preview deployments automatically
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith(".netlify.app", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase)
                        || uri.Host.EndsWith(".railway.app", StringComparison.OrdinalIgnoreCase);
                }
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
    });
});

// 10. Controllers and OpenAPI / Swagger with Bearer Support
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SalonBook API",
        Version = "v1",
        Description = "Multi-tenant Salon & Barber Appointment-Booking SaaS Authentication and Core API."
    });

    // Configure Bearer Authentication in Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", doc)] = new List<string>()
    });
});

var app = builder.Build();

// 11. CLI SuperAdmin Provisioning Command Handler
// Usage: dotnet run --project SalonBook.Api -- --seed-superadmin <email> <fullName> <password>
if (args.Length >= 4 && args[0] == "--seed-superadmin")
{
    using var scope = app.Services.CreateScope();
    var provisioningService = scope.ServiceProvider.GetRequiredService<ISuperAdminProvisioningService>();
    var email = args[1];
    var fullName = args[2];
    var password = args[3];

    Console.WriteLine($"Provisioning SuperAdmin account for '{email}'...");
    provisioningService.ProvisionSuperAdminAsync(email, fullName, password).GetAwaiter().GetResult();
    Console.WriteLine("SuperAdmin account provisioning completed successfully.");
    return;
}

// Automatic Database Migration & Schema Safety Initializer
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        logger.LogInformation("Applying EF Core database migrations...");
        await dbContext.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");

        // Upgrade LogoUrl and ImageUrl columns to NVARCHAR(MAX) to support high-fidelity persistent data URLs
        try
        {
            await dbContext.Database.ExecuteSqlRawAsync(@"
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Salons' AND COLUMN_NAME = 'LogoUrl')
                BEGIN
                    ALTER TABLE [Salons] ALTER COLUMN [LogoUrl] nvarchar(max) NULL;
                END
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Services' AND COLUMN_NAME = 'ImageUrl')
                BEGIN
                    ALTER TABLE [Services] ALTER COLUMN [ImageUrl] nvarchar(max) NULL;
                END
            ");
            logger.LogInformation("Database columns Salons.LogoUrl and Services.ImageUrl verified as NVARCHAR(MAX).");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Note: Non-critical alter for LogoUrl/ImageUrl columns.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to apply EF Core database migrations.");
    }

    var dbSafety = scope.ServiceProvider.GetRequiredService<IDatabaseSafetyInitializer>();
    try
    {
        await dbSafety.EnsureSchemaSafetyAsync();
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to run startup database schema safety checks.");
    }
}

// Automatic SuperAdmin Provisioning on startup if configured in appsettings
var superAdminConfig = app.Configuration.GetSection("SuperAdmin");
var configSaEmail = superAdminConfig["Email"];
var configSaPassword = superAdminConfig["Password"];
var configSaFullName = superAdminConfig["FullName"] ?? "Super Administrator";
if (!string.IsNullOrWhiteSpace(configSaEmail) && !string.IsNullOrWhiteSpace(configSaPassword))
{
    using var scope = app.Services.CreateScope();
    var provisioningService = scope.ServiceProvider.GetRequiredService<ISuperAdminProvisioningService>();
    try
    {
        await provisioningService.ProvisionSuperAdminAsync(configSaEmail, configSaFullName, configSaPassword);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Failed to provision configured default SuperAdmin account on startup.");
    }
}

// 12. Centralized Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 13. Swagger UI (Enabled for Development & Staging/Testing)
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "SalonBook API v1");
    options.RoutePrefix = "swagger";
});

// 14. Middleware Pipeline
app.UseStaticFiles();
app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Make Program class accessible to integration tests
public partial class Program { }
