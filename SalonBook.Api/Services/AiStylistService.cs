using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Data;
using SalonBook.Api.DTOs;

namespace SalonBook.Api.Services;

public interface IAiStylistService
{
    Task<AiStyleRecommendationResponse> GetStyleRecommendationAsync(
        AiStyleRecommendationRequest request,
        CancellationToken cancellationToken = default);
}

public class AiStylistService : IAiStylistService
{
    private readonly ApplicationDbContext _dbContext;

    public AiStylistService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AiStyleRecommendationResponse> GetStyleRecommendationAsync(
        AiStyleRecommendationRequest request,
        CancellationToken cancellationToken = default)
    {
        var face = request.FaceShape?.Trim().ToLowerInvariant() ?? "oval";
        var length = request.HairLength?.Trim().ToLowerInvariant() ?? "medium";
        var routine = request.MaintenanceRoutine?.Trim().ToLowerInvariant() ?? "moderate";
        var vibe = request.OccasionVibe?.Trim().ToLowerInvariant() ?? "everyday chic";

        // AI Stylist Inference Matrix
        string title;
        string category;
        string description;
        string colorFormula;
        string faceSuitability;
        string maintenanceAdvice;
        List<string> keywords;

        if (face.Contains("round") || (face.Contains("square") && length.Contains("long")))
        {
            title = "Textured Butterfly Layers & Soft Dimensional Balayage";
            category = "Hair Styling & Color";
            description = "Elongating face-framing curtain layers designed to sculpt your cheekbones and create effortless, bouncy movement. Complemented by soft sun-kissed dimension.";
            colorFormula = "Base: 6.1 Cool Ash Brown (20 Vol) | Balayage Highlights: 9.3 Golden Honey Blonde + 10P Gloss Glaze (10 Vol)";
            faceSuitability = $"Ideal for {request.FaceShape} faces: Creates optical vertical elongation and softens sharp jawlines or fuller cheeks.";
            maintenanceAdvice = routine.Contains("low") 
                ? "Low-maintenance: Grows out seamlessly over 10-12 weeks without harsh regrowth lines."
                : "Salon toner refresh recommended every 6-8 weeks with hydrating argan oil serum at home.";
            keywords = new List<string> { "Curtain Bangs", "Butterfly Cut", "Balayage", "Bouncy Volume" };
        }
        else if (length.Contains("short") || length.Contains("pixie"))
        {
            title = "Modern Parisian French Bob with Espresso Gloss";
            category = "Couture Haircut & Gloss";
            description = "A chic jawline-grazing cut with textured interior layers, micro-fringe accents, and mirror-shine gloss for an instant high-fashion statement.";
            colorFormula = "Color Gloss: 4.0 Natural Rich Espresso with 5 Vol Demi-Permanent Activator (Processing Time: 20 mins)";
            faceSuitability = $"Flattering for {request.FaceShape} face shapes: Highlights neck contours, cheekbones, and collarbones with sculpted precision.";
            maintenanceAdvice = "Trimming every 4-6 weeks retains sharp architecture. Blow dry with round ceramic brush.";
            keywords = new List<string> { "French Bob", "Glass Hair", "Rich Espresso", "High Shine" };
        }
        else if (vibe.Contains("bold") || vibe.Contains("trend"))
        {
            title = "Copper Velvet Shag & Dimensional Money-Piece";
            category = "Trendsetter Color & Cut";
            description = "Modern 70s-inspired shag with feathered crown layers and vibrant warm copper illumination that radiates warmth and personality.";
            colorFormula = "Formula: 7.44 Intense Copper Blonde + 8.4 Copper Gold (20 Vol Developer, 35 mins processing)";
            faceSuitability = $"Bold accent for {request.FaceShape}: Draws instant focus to eyes and cheek contours.";
            maintenanceAdvice = "Use sulfate-free color-safe shampoo and cold water rinse. Color-depositing mask once weekly.";
            keywords = new List<string> { "Velvet Copper", "Modern Shag", "Money Piece", "Feathered Layers" };
        }
        else if (vibe.Contains("wedding") || vibe.Contains("glam"))
        {
            title = "Hollywood Glamour Waves & Champagne Melt";
            category = "Luxury Styling & Tone";
            description = "Ultra-luxe sculpted cascading waves with seamless champagne-beige melting tones, engineered for red carpet events and celebrations.";
            colorFormula = "Formula: Shadow Root 5N + Melt into 10.21 Champagne Pearl Blonde (10 Vol Toner)";
            faceSuitability = $"Universally harmonious for {request.FaceShape} silhouettes: Adds symmetric elegance and photo-ready poise.";
            maintenanceAdvice = "Deep conditioning mask 48h before event. Set with flexible hold hairspray.";
            keywords = new List<string> { "Hollywood Waves", "Champagne Melt", "Red Carpet Glam", "Pearl Tone" };
        }
        else
        {
            title = "Lived-In French Layers & Warm Mocha Dimension";
            category = "Classic Chic Styling";
            description = "The ultimate effortlessly polished salon cut with soft textured ends, fluid bounce, and rich mocha undertones that catch natural light.";
            colorFormula = "Formula: 5.35 Warm Mocha Brown + Babylights 8.31 Light Sand Blonde (20 Vol Developer)";
            faceSuitability = $"Tailored for {request.FaceShape}: Frames facial features with natural, soft harmony.";
            maintenanceAdvice = "Very low upkeep: Salon visit every 8-10 weeks with weekly leave-in moisture spray.";
            keywords = new List<string> { "Lived-in Cut", "Mocha Dimension", "Effortless Chic", "Soft Movement" };
        }

        // Match with real services from the salon if slug is provided
        var matchingServices = new List<PublicServiceResponse>();

        if (!string.IsNullOrWhiteSpace(request.SalonSlug))
        {
            var normalizedSlug = request.SalonSlug.Trim().ToLowerInvariant();
            var salon = await _dbContext.Salons
                .AsNoTracking()
                .Include(s => s.Services.Where(svc => svc.IsActive))
                .FirstOrDefaultAsync(s => s.Slug == normalizedSlug && s.IsActive, cancellationToken);

            if (salon != null)
            {
                matchingServices = salon.Services
                    .OrderBy(svc => svc.Price)
                    .Take(4)
                    .Select(svc => new PublicServiceResponse
                    {
                        Id = svc.Id,
                        Name = svc.Name,
                        Category = svc.Category,
                        Description = svc.Description,
                        Price = svc.Price,
                        DurationMinutes = svc.DurationMinutes,
                        ImageUrl = svc.ImageUrl
                    })
                    .ToList();
            }
        }

        return new AiStyleRecommendationResponse
        {
            StyleTitle = title,
            Category = category,
            Description = description,
            RecommendedColorFormula = colorFormula,
            FaceSuitability = faceSuitability,
            MaintenanceAdvice = maintenanceAdvice,
            TrendingKeywords = keywords,
            SuggestedServices = matchingServices
        };
    }
}
