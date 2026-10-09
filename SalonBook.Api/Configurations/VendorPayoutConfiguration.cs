using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class VendorPayoutConfiguration : IEntityTypeConfiguration<VendorPayout>
{
    public void Configure(EntityTypeBuilder<VendorPayout> builder)
    {
        builder.ToTable("VendorPayouts");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.EscrowTransactionId)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(p => p.EscrowTransactionId)
            .IsUnique()
            .HasDatabaseName("IX_VendorPayouts_EscrowTransactionId");

        builder.Property(p => p.Amount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(p => p.CommissionAmount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(p => p.NetAmount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(p => p.CurrencyCode)
            .IsRequired()
            .HasMaxLength(3)
            .HasDefaultValue("INR");

        builder.Property(p => p.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Pending");

        builder.Property(p => p.UtrNumber)
            .HasMaxLength(100);

        builder.Property(p => p.Notes)
            .HasMaxLength(500);

        builder.Property(p => p.CreatedAtUtc)
            .IsRequired();

        builder.HasIndex(p => p.SalonId)
            .HasDatabaseName("IX_VendorPayouts_SalonId");

        builder.HasIndex(p => new { p.SalonId, p.Status })
            .HasDatabaseName("IX_VendorPayouts_SalonId_Status");

        builder.HasOne(p => p.Salon)
            .WithMany(s => s.Payouts)
            .HasForeignKey(p => p.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_VendorPayouts_Salons_SalonId");
    }
}

