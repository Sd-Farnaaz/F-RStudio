using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class ClientFormulaConfiguration : IEntityTypeConfiguration<ClientFormulaRecord>
{
    public void Configure(EntityTypeBuilder<ClientFormulaRecord> builder)
    {
        builder.ToTable("ClientFormulaRecords");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Category)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(f => f.FormulaDetails)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(f => f.Developer)
            .HasMaxLength(100);

        builder.Property(f => f.Notes)
            .HasMaxLength(2000);

        builder.Property(f => f.CreatedByStaffName)
            .HasMaxLength(150);

        builder.Property(f => f.ServiceDateUtc)
            .IsRequired();

        builder.Property(f => f.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(f => f.Salon)
            .WithMany()
            .HasForeignKey(f => f.SalonId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(f => f.Customer)
            .WithMany()
            .HasForeignKey(f => f.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(f => f.Staff)
            .WithMany()
            .HasForeignKey(f => f.StaffId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(f => f.Appointment)
            .WithMany()
            .HasForeignKey(f => f.AppointmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(f => new { f.SalonId, f.CustomerId });
        builder.HasIndex(f => f.ServiceDateUtc);
    }
}

