using Microsoft.AspNetCore.Http;
using SalonBook.Api.DTOs;

namespace SalonBook.Api.Services;

public interface IMediaStorageService
{
    Task<MediaUploadResponse> UploadMediaAsync(IFormFile file, string? category = "general", CancellationToken cancellationToken = default);
}

public class LocalMediaStorageService : IMediaStorageService
{
    private readonly IWebHostEnvironment _environment;
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".webp"
    };

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

    public LocalMediaStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<MediaUploadResponse> UploadMediaAsync(IFormFile file, string? category = "general", CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("No file provided or file is empty.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new InvalidOperationException($"File size exceeds the allowed limit of {MaxFileSizeBytes / (1024 * 1024)} MB.");
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"File type '{extension}' is not supported. Allowed extensions: {string.Join(", ", AllowedExtensions)}");
        }

        var sanitizedCategory = string.IsNullOrWhiteSpace(category) ? "general" : category.Trim().ToLowerInvariant();
        var safeChars = sanitizedCategory.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray();
        sanitizedCategory = safeChars.Length > 0 ? new string(safeChars) : "general";

        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", sanitizedCategory);
        Directory.CreateDirectory(uploadsFolder);

        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsFolder, storedFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var publicUrl = $"/uploads/{sanitizedCategory}/{storedFileName}";

        return new MediaUploadResponse
        {
            FileUrl = publicUrl,
            OriginalFileName = Path.GetFileName(file.FileName),
            StoredFileName = storedFileName,
            ContentType = file.ContentType ?? "application/octet-stream",
            FileSizeBytes = file.Length,
            Category = sanitizedCategory,
            UploadedAtUtc = DateTime.UtcNow
        };
    }
}

