using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace SalonBook.Api.Services;

public interface ISlugService
{
    string GenerateSlug(string text);
}

public class SlugService : ISlugService
{
    public string GenerateSlug(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return "salon-" + Guid.NewGuid().ToString("N")[..8];

        // Normalize string
        var normalizedString = text.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                if (char.IsLetterOrDigit(c))
                {
                    stringBuilder.Append(c);
                }
                else if (c == ' ' || c == '-' || c == '_')
                {
                    stringBuilder.Append('-');
                }
            }
        }

        var result = stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        // Replace multiple dashes with single dash
        result = Regex.Replace(result, @"-+", "-").Trim('-');

        if (string.IsNullOrWhiteSpace(result))
            return "salon-" + Guid.NewGuid().ToString("N")[..8];

        if (result.Length > 90)
            result = result[..90].TrimEnd('-');

        return result;
    }
}
