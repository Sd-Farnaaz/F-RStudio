using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class PasswordResetTokenConfiguration : IEntityTypeConfiguration<PasswordResetToken>
{
    public void Configure(EntityTypeBuilder<PasswordResetToken> builder)
    {
        builder.ToTable("PasswordResetTokens");

        builder.HasKey(prt => prt.Id);

        builder.Property(prt => prt.TokenHash)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(prt => prt.CreatedByIp)
            .HasMaxLength(50);

        builder.Property(prt => prt.UsedByIp)
            .HasMaxLength(50);

        builder.Property(prt => prt.CreatedAtUtc)
            .IsRequired();

        builder.Property(prt => prt.ExpiresAtUtc)
            .IsRequired();

        builder.Property(prt => prt.UsedAtUtc)
            .IsRequired(false);

        // Index on TokenHash for fast lookup
        builder.HasIndex(prt => prt.TokenHash)
            .IsUnique()
            .HasDatabaseName("IX_PasswordResetTokens_TokenHash");

        builder.HasIndex(prt => prt.UserId)
            .HasDatabaseName("IX_PasswordResetTokens_UserId");
    }
}

