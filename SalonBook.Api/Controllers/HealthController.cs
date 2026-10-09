using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.Data;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<HealthController> _logger;
    private readonly IHostEnvironment _environment;

    public HealthController(
        ApplicationDbContext dbContext,
        ILogger<HealthController> logger,
        IHostEnvironment environment)
    {
        _dbContext = dbContext;
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Database-aware health check endpoint.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
    {
        bool dbCanConnect = false;
        string dbStatus = "Unknown";
        string? dbError = null;

        try
        {
            dbCanConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
            dbStatus = dbCanConnect ? "Connected" : "Unreachable";
        }
        catch (Exception ex)
        {
            dbStatus = "Error";
            dbError = ex.Message;
            _logger.LogError(ex, "Health check failed to connect to database.");
        }

        var healthReport = new
        {
            status = dbCanConnect ? "Healthy" : "Degraded",
            timestamp = DateTime.UtcNow,
            environment = _environment.EnvironmentName,
            service = "SalonBook.Api",
            database = new
            {
                provider = "Microsoft.EntityFrameworkCore.SqlServer",
                status = dbStatus,
                canConnect = dbCanConnect,
                error = dbError
            }
        };

        if (!dbCanConnect)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, healthReport);
        }

        return Ok(healthReport);
    }
}

