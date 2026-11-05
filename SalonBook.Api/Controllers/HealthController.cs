using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.Common;
using SalonBook.Api.Data;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IDatabaseSafetyInitializer _dbSafety;
    private readonly ILogger<HealthController> _logger;
    private readonly IHostEnvironment _environment;

    public HealthController(
        ApplicationDbContext dbContext,
        IDatabaseSafetyInitializer dbSafety,
        ILogger<HealthController> logger,
        IHostEnvironment environment)
    {
        _dbContext = dbContext;
        _dbSafety = dbSafety;
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Database-aware public health check endpoint.
    /// Returns only generic status (Healthy or Degraded) without exposing internal table,
    /// column, index, foreign-key names, or SQL query errors to unauthenticated callers.
    /// Detailed failures are captured in secure server logs.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
    {
        bool dbCanConnect = false;

        try
        {
            dbCanConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed: unable to connect to the database.");
        }

        bool isSchemaSafe = _dbSafety.IsSchemaSafe;
        bool isOverallHealthy = dbCanConnect && isSchemaSafe;

        if (!isOverallHealthy)
        {
            _logger.LogWarning(
                "Health check degraded: dbCanConnect={CanConnect}, isSchemaSafe={IsSchemaSafe}, " +
                "missingTables=[{MissingTables}], missingColumns=[{MissingColumns}], " +
                "missingIndexes=[{MissingIndexes}], missingForeignKeys=[{MissingForeignKeys}], " +
                "failedSteps=[{FailedSteps}]",
                dbCanConnect,
                isSchemaSafe,
                string.Join(", ", _dbSafety.MissingTables),
                string.Join(", ", _dbSafety.MissingColumns),
                string.Join(", ", _dbSafety.MissingIndexes),
                string.Join(", ", _dbSafety.MissingForeignKeys),
                string.Join("; ", _dbSafety.FailedSteps));

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "Degraded",
                timestamp = DateTime.UtcNow,
                service = "SalonBook.Api"
            });
        }

        return Ok(new
        {
            status = "Healthy",
            timestamp = DateTime.UtcNow,
            service = "SalonBook.Api"
        });
    }

    /// <summary>
    /// Authenticated diagnostics endpoint restricted to SuperAdmin role.
    /// Provides detailed schema validation state, database provider details,
    /// missing database objects, and failed initialization steps for operational troubleshooting.
    /// </summary>
    [HttpGet("diagnostics")]
    [Authorize(Policy = "SuperAdminOnly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetDiagnostics(CancellationToken cancellationToken)
    {
        bool dbCanConnect = false;
        string dbStatus = "Unknown";

        try
        {
            dbCanConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
            dbStatus = dbCanConnect ? "Connected" : "Unreachable";
        }
        catch (Exception ex)
        {
            dbStatus = "Unreachable";
            _logger.LogError(ex, "Diagnostics check failed: unable to connect to the database.");
        }

        bool isSchemaSafe = _dbSafety.IsSchemaSafe;
        bool isOverallHealthy = dbCanConnect && isSchemaSafe;

        var diagnosticsReport = new
        {
            status = isOverallHealthy ? "Healthy" : "Degraded",
            timestamp = DateTime.UtcNow,
            environment = _environment.EnvironmentName,
            service = "SalonBook.Api",
            database = new
            {
                provider = "Microsoft.EntityFrameworkCore.SqlServer",
                status = dbStatus,
                canConnect = dbCanConnect,
                schemaStatus = isSchemaSafe ? "Complete" : "Incomplete",
                missingTables = _dbSafety.MissingTables.ToArray(),
                missingColumns = _dbSafety.MissingColumns.ToArray(),
                missingIndexes = _dbSafety.MissingIndexes.ToArray(),
                missingForeignKeys = _dbSafety.MissingForeignKeys.ToArray(),
                failedOperations = _dbSafety.FailedSteps.ToArray()
            }
        };

        if (!isOverallHealthy)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, diagnosticsReport);
        }

        return Ok(diagnosticsReport);
    }
}
