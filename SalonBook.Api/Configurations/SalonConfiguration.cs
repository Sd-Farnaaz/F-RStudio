using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class SalonConfiguration : IEntityTypeConfiguration<Salon>
{
    public void Configure(EntityTypeBuilder<Salon> builder)
    {
        builder.ToTable("Salons");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(s => s.Slug)
            .IsRequired()
            .HasMaxLength(100);

        // Unique index on Slug to ensure SEO-friendly unique URL/subdomain identifiers
        builder.HasIndex(s => s.Slug)
            .IsUnique()
            .HasDatabaseName("IX_Salons_Slug");

        builder.Property(s => s.BusinessType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.TimeZone)
            .IsRequired()
            .HasMaxLength(100)
            .HasDefaultValue("Asia/Kolkata");

        builder.Property(s => s.CurrencyCode)
            .IsRequired()
            .HasMaxLength(3)
            .HasDefaultValue("INR");

        builder.Property(s => s.OnboardingState)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Created");

        builder.Property(s => s.CreatedAtUtc)
            .IsRequired();
    }
}

