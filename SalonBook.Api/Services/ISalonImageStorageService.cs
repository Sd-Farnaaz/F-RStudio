using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace SalonBook.Api.Services;

public interface ISalonImageStorageService
{
    Task<string> SaveSalonLogoAsync(int salonId, IFormFile file, CancellationToken cancellationToken = default);
    Task DeleteSalonLogoAsync(int salonId, string? logoUrl, CancellationToken cancellationToken = default);
    Task<string> SaveServiceImageAsync(int salonId, int serviceId, IFormFile file, CancellationToken cancellationToken = default);
    Task DeleteServiceImageAsync(int salonId, int serviceId, string? imageUrl, CancellationToken cancellationToken = default);
}

public static class ImageValidator
{
    private static readonly Dictionary<string, List<byte[]>> ImageSignatures = new(StringComparer.OrdinalIgnoreCase)
    {
        { ".jpg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF } } },
        { ".png", new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } } },
        { ".gif", new List<byte[]> { new byte[] { 0x47, 0x49, 0x46, 0x38 } } }, // GIF87a, GIF89a
        { ".webp", new List<byte[]> { new byte[] { 0x52, 0x49, 0x46, 0x46 } } } // RIFF....WEBP
    };

    public static bool IsValidImage(Stream stream, string extension)
    {
        if (string.IsNullOrWhiteSpace(extension) || !ImageSignatures.TryGetValue(extension, out var signatures))
        {
            return false;
        }

        if (stream.Length < 12)
        {
            return false;
        }

        var header = new byte[12];
        var originalPosition = stream.Position;
        stream.Position = 0;
        var bytesRead = stream.Read(header, 0, 12);
        stream.Position = originalPosition;

        if (bytesRead < 12)
        {
            return false;
        }

        // WebP requires RIFF at 0..3 and WEBP at 8..11
        if (extension.Equals(".webp", StringComparison.OrdinalIgnoreCase))
        {
            return header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                   header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50;
        }

        return signatures.Any(sig => header.Take(sig.Length).SequenceEqual(sig));
    }
}

public class LocalSalonImageStorageService : ISalonImageStorageService
{
    private readonly IWebHostEnvironment _environment;
    private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5MB

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    public LocalSalonImageStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string> SaveSalonLogoAsync(int salonId, IFormFile file, CancellationToken cancellationToken = default)
    {
        return await SaveImageInternalAsync(file, Path.Combine("salons", salonId.ToString()), $"/uploads/salons/{salonId}/", cancellationToken);
    }

    public Task DeleteSalonLogoAsync(int salonId, string? logoUrl, CancellationToken cancellationToken = default)
    {
        return DeleteImageInternalAsync(logoUrl, Path.Combine("salons", salonId.ToString()), $"/uploads/salons/{salonId}/", cancellationToken);
    }

    public async Task<string> SaveServiceImageAsync(int salonId, int serviceId, IFormFile file, CancellationToken cancellationToken = default)
    {
        return await SaveImageInternalAsync(file, Path.Combine("salons", salonId.ToString(), "services", serviceId.ToString()), $"/uploads/salons/{salonId}/services/{serviceId}/", cancellationToken);
    }

    public Task DeleteServiceImageAsync(int salonId, int serviceId, string? imageUrl, CancellationToken cancellationToken = default)
    {
        return DeleteImageInternalAsync(imageUrl, Path.Combine("salons", salonId.ToString(), "services", serviceId.ToString()), $"/uploads/salons/{salonId}/services/{serviceId}/", cancellationToken);
    }

    private async Task<string> SaveImageInternalAsync(IFormFile file, string relativeFolder, string urlPrefix, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("Please select a valid image file to upload.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new InvalidOperationException($"Image file size exceeds the allowed limit of {MaxFileSizeBytes / (1024 * 1024)} MB.");
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"File type '{extension}' is not supported. Allowed image types: {string.Join(", ", AllowedExtensions)}");
        }

        using (var memoryStream = new MemoryStream())
        {
            await file.CopyToAsync(memoryStream, cancellationToken);
            if (!ImageValidator.IsValidImage(memoryStream, extension))
            {
                throw new InvalidOperationException("Invalid image file content. The file header does not match a recognized image format.");
            }
        }

        var rootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadFolder = Path.Combine(rootPath, "uploads", relativeFolder);
        Directory.CreateDirectory(uploadFolder);

        var storedFileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullFilePath = Path.Combine(uploadFolder, storedFileName);

        // Path traversal guard
        var canonicalUploadDir = Path.GetFullPath(uploadFolder) + Path.DirectorySeparatorChar;
        var canonicalFilePath = Path.GetFullPath(fullFilePath);
        if (!canonicalFilePath.StartsWith(canonicalUploadDir, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid file destination path.");
        }

        using (var fileStream = new FileStream(fullFilePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream, cancellationToken);
        }

        return $"{urlPrefix}{storedFileName}";
    }

    private Task DeleteImageInternalAsync(string? fileUrl, string relativeFolder, string urlPrefix, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(fileUrl))
        {
            return Task.CompletedTask;
        }

        try
        {
            // Verify the URL prefix matches this tenant's upload namespace
            if (!fileUrl.StartsWith(urlPrefix, StringComparison.OrdinalIgnoreCase))
            {
                // If it doesn't belong to this exact namespace, do not attempt to delete to protect other tenants/services
                return Task.CompletedTask;
            }

            var fileName = Path.GetFileName(fileUrl);
            var rootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadFolder = Path.Combine(rootPath, "uploads", relativeFolder);
            var fullFilePath = Path.Combine(uploadFolder, fileName);

            // Path traversal guard
            var canonicalUploadDir = Path.GetFullPath(uploadFolder) + Path.DirectorySeparatorChar;
            var canonicalFilePath = Path.GetFullPath(fullFilePath);
            if (!canonicalFilePath.StartsWith(canonicalUploadDir, StringComparison.OrdinalIgnoreCase))
            {
                return Task.CompletedTask;
            }

            if (File.Exists(fullFilePath))
            {
                File.Delete(fullFilePath);
            }
        }
        catch
        {
            // File cleanup is best-effort and non-fatal
        }

        return Task.CompletedTask;
    }
}
