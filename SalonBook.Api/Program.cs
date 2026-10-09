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

// 9. CORS Policy - Restricted to React/Vite development origin
const string FrontendCorsPolicy = "AllowFrontendDev";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
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
        [new OpenApiSecuritySchemeReference("Bearer")] = new List<string>()
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

// 12. Centralized Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 13. Swagger UI in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "SalonBook API v1");
        options.RoutePrefix = "swagger";
    });
}

// 14. Middleware Pipeline
app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Make Program class accessible to integration tests
public partial class Program { }
