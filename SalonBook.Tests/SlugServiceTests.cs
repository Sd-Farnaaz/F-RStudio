using SalonBook.Api.Services;

namespace SalonBook.Tests;

public class SlugServiceTests
{
    private readonly SlugService _slugService = new();

    [Theory]
    [InlineData("Luxe Hair Studio", "luxe-hair-studio")]
    [InlineData("Barber & Co. Saloon!", "barber-co-saloon")]
    [InlineData("  Style   Hub   ", "style-hub")]
    [InlineData("Salon_123_Special", "salon-123-special")]
    public void GenerateSlug_ProducesNormalizedUrlFriendlySlug(string input, string expected)
    {
        var result = _slugService.GenerateSlug(input);
        Assert.Equal(expected, result);
    }
}
