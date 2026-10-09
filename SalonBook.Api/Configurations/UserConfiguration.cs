using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.SalonId)
            .IsRequired(false);

        builder.Property(u => u.FullName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        // Global unique email index:
        // Ensures unique identity across SalonBook platform, preventing cross-tenant identity collisions.
        builder.HasIndex(u => u.Email)
            .IsUnique()
            .HasDatabaseName("IX_Users_Email");

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(u => u.Role)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(u => u.IsEmailVerified)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(u => u.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(u => u.CreatedAtUtc)
            .IsRequired();

        builder.Property(u => u.UpdatedAtUtc)
            .IsRequired(false);

        builder.Property(u => u.LastLoginAtUtc)
            .IsRequired(false);

        // Index on SalonId for fast tenant queries
        builder.HasIndex(u => u.SalonId)
            .HasDatabaseName("IX_Users_SalonId");

        // Restrict delete behavior on Salon -> Users
        builder.HasOne(u => u.Salon)
            .WithMany(s => s.Users)
            .HasForeignKey(u => u.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Users_Salons_SalonId");

        // Cascade delete tokens when user is deleted
        builder.HasMany(u => u.RefreshTokens)
            .WithOne(rt => rt.User)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(u => u.PasswordResetTokens)
            .WithOne(prt => prt.User)
            .HasForeignKey(prt => prt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
