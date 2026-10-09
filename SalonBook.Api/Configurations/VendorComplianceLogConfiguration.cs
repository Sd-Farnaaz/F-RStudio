using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class VendorComplianceLogConfiguration : IEntityTypeConfiguration<VendorComplianceLog>
{
    public void Configure(EntityTypeBuilder<VendorComplianceLog> builder)
    {
        builder.ToTable("VendorComplianceLogs");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.EventType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.RejectionReason)
            .HasMaxLength(500);

        builder.Property(c => c.DocumentType)
            .HasMaxLength(100);

        builder.Property(c => c.DocumentUrl)
            .HasMaxLength(500);

        builder.Property(c => c.ReviewedBy)
            .HasMaxLength(150);

        builder.Property(c => c.DisputeDetails)
            .HasMaxLength(1000);

        builder.Property(c => c.CustomerIdentifier)
            .HasMaxLength(150);

        builder.Property(c => c.DisputedAmount)
            .HasPrecision(18, 2);

        builder.Property(c => c.CreatedAtUtc)
            .IsRequired();

        builder.HasIndex(c => c.SalonId)
            .HasDatabaseName("IX_VendorComplianceLogs_SalonId");

        builder.HasIndex(c => new { c.SalonId, c.EventType })
            .HasDatabaseName("IX_VendorComplianceLogs_SalonId_EventType");

        builder.HasOne(c => c.Salon)
            .WithMany(s => s.ComplianceLogs)
            .HasForeignKey(c => c.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_VendorComplianceLogs_Salons_SalonId");
    }
}

