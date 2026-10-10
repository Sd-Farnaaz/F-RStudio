using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class AppointmentReminderConfiguration : IEntityTypeConfiguration<AppointmentReminder>
{
    public void Configure(EntityTypeBuilder<AppointmentReminder> builder)
    {
        builder.ToTable("AppointmentReminders");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.ReminderType)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(r => r.ScheduledForUtc)
            .IsRequired();

        builder.Property(r => r.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Pending");

        builder.Property(r => r.ProcessedAtUtc)
            .IsRequired(false);

        builder.Property(r => r.LastError)
            .HasMaxLength(500);

        builder.Property(r => r.CreatedAtUtc)
            .IsRequired();

        // Unique constraint so an appointment cannot have duplicate reminders of same type
        builder.HasIndex(r => new { r.AppointmentId, r.ReminderType })
            .IsUnique()
            .HasDatabaseName("IX_AppointmentReminders_AppointmentId_ReminderType");

        // Index for scheduled query
        builder.HasIndex(r => new { r.Status, r.ScheduledForUtc })
            .HasDatabaseName("IX_AppointmentReminders_Status_ScheduledForUtc");

        // Relationship
        builder.HasOne(r => r.Appointment)
            .WithMany(a => a.Reminders)
            .HasForeignKey(r => r.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_AppointmentReminders_Appointments_AppointmentId");
    }
}

