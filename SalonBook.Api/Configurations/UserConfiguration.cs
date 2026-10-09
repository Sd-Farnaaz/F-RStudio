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

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(u => u.Role)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(u => u.IsEmailVerified)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(u => u.CreatedAtUtc)
            .IsRequired();

        // Index on SalonId to optimize tenant-scoped user lookups and foreign key joins
        builder.HasIndex(u => u.SalonId)
            .HasDatabaseName("IX_Users_SalonId");

        // Index on Email for login lookup performance.
        // NOTE FOR PHASE 2: This is a non-unique index in Phase 1.
        // During Phase 2 auth architecture, decide whether email uniqueness is:
        // Option A: Global unique across all tenants (unique index on Email).
        // Option B: Tenant-scoped unique (composite unique index on SalonId + Email, allowing same customer email across different salons).
        builder.HasIndex(u => u.Email)
            .HasDatabaseName("IX_Users_Email");

        // Explicit foreign key relationship and delete behavior
        // DeleteBehavior.Restrict prevents cascading delete of user accounts when a salon is deleted
        builder.HasOne(u => u.Salon)
            .WithMany(s => s.Users)
            .HasForeignKey(u => u.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Users_Salons_SalonId");
    }
}

