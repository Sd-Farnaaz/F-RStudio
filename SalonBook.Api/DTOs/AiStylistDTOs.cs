namespace SalonBook.Api.DTOs;

public class AiStyleRecommendationRequest
{
    public string HairLength { get; set; } = "Medium"; // "Short", "Medium", "Long", "Pixie", "Buzz"

    public string FaceShape { get; set; } = "Oval"; // "Oval", "Round", "Square", "Heart", "Diamond"

    public string MaintenanceRoutine { get; set; } = "Moderate"; // "Low", "Moderate", "High"

    public string OccasionVibe { get; set; } = "Everyday Chic"; // "Everyday Chic", "Corporate Elegance", "Wedding / Glam", "Bold Trendsetter"

    public string? PhotoUrl { get; set; }

    public string? SalonSlug { get; set; }
}

public class AiStyleRecommendationResponse
{
    public string StyleTitle { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string RecommendedColorFormula { get; set; } = string.Empty;

    public string FaceSuitability { get; set; } = string.Empty;

    public string MaintenanceAdvice { get; set; } = string.Empty;

    public List<string> TrendingKeywords { get; set; } = new();

    public List<PublicServiceResponse> SuggestedServices { get; set; } = new();
}

