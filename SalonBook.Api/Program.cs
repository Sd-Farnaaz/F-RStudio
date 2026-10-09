using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using SalonBook.Api.Data;
using SalonBook.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

// 1. Structured Logging (Default console logger configured with JSON / structured formatting support)
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

// 3. Database-aware Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>("database");

// 4. CORS Policy - Restricted to Vite frontend for development
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

// 5. Controllers and API documentation
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SalonBook API",
        Version = "v1",
        Description = "Phase 1: Project Setup and Database Foundation for SalonBook SaaS."
    });
});

var app = builder.Build();

// 6. Centralized Exception Handling Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// 7. Swagger UI in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "SalonBook API v1");
        options.RoutePrefix = "swagger";
    });
}

// 8. CORS Middleware
app.UseCors(FrontendCorsPolicy);

// 9. Routing & Controllers
app.UseAuthorization();
app.MapControllers();

app.Run();
