using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class SalonOffPeakRuleConfiguration : IEntityTypeConfiguration<SalonOffPeakRule>
{
    public void Configure(EntityTypeBuilder<SalonOffPeakRule> builder)
    {
        builder.ToTable("SalonOffPeakRules");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.DaysOfWeek)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.StartTime)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(r => r.EndTime)
            .IsRequired()
            .HasMaxLength(10);

        builder.Property(r => r.DiscountPercentage)
            .HasColumnType("decimal(5,2)")
            .IsRequired();

        builder.Property(r => r.IsActive)
            .HasDefaultValue(true);

        builder.Property(r => r.CreatedAtUtc)
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(r => r.Salon)
            .WithMany(s => s.OffPeakRules)
            .HasForeignKey(r => r.SalonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.SalonId)
            .HasDatabaseName("IX_SalonOffPeakRules_SalonId");

        builder.HasIndex(r => new { r.SalonId, r.IsActive })
            .HasDatabaseName("IX_SalonOffPeakRules_SalonId_IsActive");
    }
}

