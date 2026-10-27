using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class ClientConsultationConfiguration : IEntityTypeConfiguration<ClientConsultationCard>
{
    public void Configure(EntityTypeBuilder<ClientConsultationCard> builder)
    {
        builder.ToTable("ClientConsultationCards");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Allergies)
            .HasMaxLength(1000);

        builder.Property(c => c.SkinOrHairNotes)
            .HasMaxLength(2000);

        builder.Property(c => c.PrivateStaffNotes)
            .HasMaxLength(3000);

        builder.Property(c => c.EmergencyContactName)
            .HasMaxLength(150);

        builder.Property(c => c.EmergencyContactPhone)
            .HasMaxLength(50);

        builder.Property(c => c.CreatedAtUtc)
            .IsRequired();

        builder.HasOne(c => c.Salon)
            .WithMany()
            .HasForeignKey(c => c.SalonId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Customer)
            .WithMany()
            .HasForeignKey(c => c.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => new { c.SalonId, c.CustomerId })
            .IsUnique();
    }
}

