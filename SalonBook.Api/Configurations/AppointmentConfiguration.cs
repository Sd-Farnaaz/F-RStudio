using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> builder)
    {
        builder.ToTable("Appointments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Confirmed");

        builder.Property(a => a.PriceAtBooking)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(a => a.ServiceNameAtBooking)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(a => a.DurationMinutesAtBooking)
            .IsRequired();

        builder.Property(a => a.CustomerNotes)
            .HasMaxLength(500);

        builder.Property(a => a.CancellationReason)
            .HasMaxLength(500);

        builder.Property(a => a.StartAtUtc)
            .IsRequired();

        builder.Property(a => a.EndAtUtc)
            .IsRequired();

        builder.Property(a => a.CreatedAtUtc)
            .IsRequired();

        builder.Property(a => a.UpdatedAtUtc)
            .IsRequired(false);

        builder.Property(a => a.CancelledAtUtc)
            .IsRequired(false);

        // Indexes for performance and concurrency conflict lookups
        builder.HasIndex(a => new { a.StaffId, a.StartAtUtc })
            .HasDatabaseName("IX_Appointments_StaffId_StartAtUtc");

        builder.HasIndex(a => new { a.StaffId, a.Status, a.StartAtUtc })
            .HasDatabaseName("IX_Appointments_StaffId_Status_StartAtUtc");

        builder.HasIndex(a => new { a.SalonId, a.StartAtUtc })
            .HasDatabaseName("IX_Appointments_SalonId_StartAtUtc");

        builder.HasIndex(a => new { a.SalonId, a.Status, a.StartAtUtc })
            .HasDatabaseName("IX_Appointments_SalonId_Status_StartAtUtc");

        builder.HasIndex(a => new { a.CustomerId, a.StartAtUtc })
            .HasDatabaseName("IX_Appointments_CustomerId_StartAtUtc");

        // Relationships (Strict Restrict delete behaviors to preserve booking history)
        builder.HasOne(a => a.Salon)
            .WithMany(s => s.Appointments)
            .HasForeignKey(a => a.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Appointments_Salons_SalonId");

        builder.HasOne(a => a.Customer)
            .WithMany(u => u.Appointments)
            .HasForeignKey(a => a.CustomerId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Appointments_Users_CustomerId");

        builder.HasOne(a => a.Staff)
            .WithMany(st => st.Appointments)
            .HasForeignKey(a => a.StaffId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Appointments_Staff_StaffId");

        builder.HasOne(a => a.Service)
            .WithMany(svc => svc.Appointments)
            .HasForeignKey(a => a.ServiceId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Appointments_Services_ServiceId");
    }
}

