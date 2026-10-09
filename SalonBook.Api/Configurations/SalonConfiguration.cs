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

        builder.HasIndex(s => s.Slug)
            .IsUnique()
            .HasDatabaseName("IX_Salons_Slug");

        builder.Property(s => s.BusinessType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.Description)
            .HasMaxLength(1000);

        builder.Property(s => s.AddressLine)
            .HasMaxLength(250);

        builder.Property(s => s.City)
            .HasMaxLength(100);

        builder.Property(s => s.State)
            .HasMaxLength(100);

        builder.Property(s => s.PostalCode)
            .HasMaxLength(20);

        builder.Property(s => s.Country)
            .HasMaxLength(100)
            .HasDefaultValue("India");

        builder.Property(s => s.PhoneNumber)
            .HasMaxLength(30);

        builder.Property(s => s.ContactEmail)
            .HasMaxLength(256);

        builder.Property(s => s.OpeningHoursJson)
            .HasMaxLength(2000);

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

        builder.Property(s => s.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(s => s.CreatedAtUtc)
            .IsRequired();

        builder.Property(s => s.UpdatedAtUtc)
            .IsRequired(false);

        // Index on City and IsActive for public salon discovery
        builder.HasIndex(s => new { s.City, s.IsActive })
            .HasDatabaseName("IX_Salons_City_IsActive");

        // Cascade delete or restrict for Services
        builder.HasMany(s => s.Services)
            .WithOne(svc => svc.Salon)
            .HasForeignKey(svc => svc.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Services_Salons_SalonId");
    }
}
