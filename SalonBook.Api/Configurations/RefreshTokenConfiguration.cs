using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens");

        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.TokenHash)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(rt => rt.JwtId)
            .HasMaxLength(100);

        builder.Property(rt => rt.FamilyId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(rt => rt.ReplacedByTokenHash)
            .HasMaxLength(128);

        builder.Property(rt => rt.CreatedByIp)
            .HasMaxLength(50);

        builder.Property(rt => rt.RevokedByIp)
            .HasMaxLength(50);

        builder.Property(rt => rt.ReasonRevoked)
            .HasMaxLength(256);

        builder.Property(rt => rt.CreatedAtUtc)
            .IsRequired();

        builder.Property(rt => rt.ExpiresAtUtc)
            .IsRequired();

        builder.Property(rt => rt.RevokedAtUtc)
            .IsRequired(false);

        // Indexes for lookups and token family revocations
        builder.HasIndex(rt => rt.TokenHash)
            .IsUnique()
            .HasDatabaseName("IX_RefreshTokens_TokenHash");

        builder.HasIndex(rt => rt.FamilyId)
            .HasDatabaseName("IX_RefreshTokens_FamilyId");

        builder.HasIndex(rt => rt.UserId)
            .HasDatabaseName("IX_RefreshTokens_UserId");
    }
}

