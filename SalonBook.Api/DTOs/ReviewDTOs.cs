using System.ComponentModel.DataAnnotations;

namespace SalonBook.Api.DTOs;

public class CreateReviewRequest
{
    [Required]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5 stars.")]
    public int Rating { get; set; }

    [Range(1, 5, ErrorMessage = "Cleanliness rating must be between 1 and 5.")]
    public int? CleanlinessRating { get; set; }

    [Range(1, 5, ErrorMessage = "Staff rating must be between 1 and 5.")]
    public int? StaffRating { get; set; }

    [Range(1, 5, ErrorMessage = "Value rating must be between 1 and 5.")]
    public int? ValueRating { get; set; }

    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
    public string? Title { get; set; }

    [Required(ErrorMessage = "Please write a review comment.")]
    [StringLength(2000, MinimumLength = 5, ErrorMessage = "Comment must be between 5 and 2000 characters.")]
    public string Comment { get; set; } = string.Empty;

    public List<string>? PhotoUrls { get; set; }
}

public class OwnerReplyRequest
{
    [Required(ErrorMessage = "Reply text is required.")]
    [StringLength(2000, MinimumLength = 2, ErrorMessage = "Reply must be between 2 and 2000 characters.")]
    public string Reply { get; set; } = string.Empty;
}

public class ReviewResponse
{
    public int Id { get; set; }

    public int SalonId { get; set; }

    public string SalonName { get; set; } = string.Empty;

    public int CustomerId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public int AppointmentId { get; set; }

    public int? StaffId { get; set; }

    public string? StaffName { get; set; }

    public string? ServiceName { get; set; }

    public int Rating { get; set; }

    public int? CleanlinessRating { get; set; }

    public int? StaffRating { get; set; }

    public int? ValueRating { get; set; }

    public string? Title { get; set; }

    public string Comment { get; set; } = string.Empty;

    public List<string> PhotoUrls { get; set; } = new();

    public bool IsVerifiedVisit { get; set; } = true;

    public string? OwnerReply { get; set; }

    public DateTime? OwnerRepliedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }
}

public class SalonReviewSummaryResponse
{
    public double AverageRating { get; set; }

    public int TotalReviews { get; set; }

    public double? AverageCleanliness { get; set; }

    public double? AverageStaff { get; set; }

    public double? AverageValue { get; set; }

    public Dictionary<int, int> RatingBreakdown { get; set; } = new()
    {
        { 5, 0 },
        { 4, 0 },
        { 3, 0 },
        { 2, 0 },
        { 1, 0 }
    };

    public PagedResult<ReviewResponse> Reviews { get; set; } = null!;
}
