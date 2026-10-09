namespace SalonBook.Api.Common;

public static class Roles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
    public const string User = "User";

    public static readonly IReadOnlyList<string> All = new[] { SuperAdmin, Admin, User };

    public static bool IsValid(string? role) =>
        role is not null && All.Contains(role);
}
