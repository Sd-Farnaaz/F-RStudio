namespace SalonBook.Api.DTOs;

public class MediaUploadResponse
{
    public string FileUrl { get; set; } = string.Empty;

    public string OriginalFileName { get; set; } = string.Empty;

    public string StoredFileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    public string Category { get; set; } = string.Empty;

    public DateTime UploadedAtUtc { get; set; }
}

