using Microsoft.AspNetCore.Mvc;
using SalonBook.Api.DTOs;
using SalonBook.Api.Services;

namespace SalonBook.Api.Controllers;

[ApiController]
[Route("api/public/ai")]
public class AiStylistController : ControllerBase
{
    private readonly IAiStylistService _aiStylistService;

    public AiStylistController(IAiStylistService aiStylistService)
    {
        _aiStylistService = aiStylistService;
    }

    /// <summary>
    /// Interactive AI Hairstyle & Color Recommendation engine.
    /// Analyzes hair length, face shape, maintenance routine, and occasion vibe to propose trending styles,
    /// complete with color formulas and direct salon booking recommendations.
    /// </summary>
    [HttpPost("recommend-style")]
    [ProducesResponseType(typeof(AiStyleRecommendationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecommendStyle([FromBody] AiStyleRecommendationRequest request, CancellationToken cancellationToken)
    {
        var result = await _aiStylistService.GetStyleRecommendationAsync(request, cancellationToken);
        return Ok(result);
    }
}

