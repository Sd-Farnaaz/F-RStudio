using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.HasKey(n => n.Id);

        builder.Property(n => n.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(n => n.Channel)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("InApp");

        builder.Property(n => n.Subject)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(n => n.Message)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(n => n.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Pending");

        builder.Property(n => n.IsRead)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(n => n.ReadAtUtc)
            .IsRequired(false);

        builder.Property(n => n.SentAtUtc)
            .IsRequired(false);

        builder.Property(n => n.RetryCount)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(n => n.NextAttemptAtUtc)
            .IsRequired(false);

        builder.Property(n => n.LastErrorCode)
            .HasMaxLength(50);

        builder.Property(n => n.ErrorMessage)
            .HasMaxLength(1000);

        builder.Property(n => n.CreatedAtUtc)
            .IsRequired();

        // Indexes
        builder.HasIndex(n => new { n.RecipientUserId, n.IsRead, n.CreatedAtUtc })
            .HasDatabaseName("IX_Notifications_Recipient_IsRead_CreatedAtUtc");

        builder.HasIndex(n => new { n.SalonId, n.CreatedAtUtc })
            .HasDatabaseName("IX_Notifications_SalonId_CreatedAtUtc");

        builder.HasIndex(n => n.AppointmentId)
            .HasDatabaseName("IX_Notifications_AppointmentId");

        builder.HasIndex(n => new { n.Status, n.NextAttemptAtUtc })
            .HasDatabaseName("IX_Notifications_Status_NextAttemptAtUtc");

        // Relationships
        builder.HasOne(n => n.Recipient)
            .WithMany(u => u.Notifications)
            .HasForeignKey(n => n.RecipientUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Notifications_Users_RecipientUserId");

        builder.HasOne(n => n.Salon)
            .WithMany(s => s.Notifications)
            .HasForeignKey(n => n.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Notifications_Salons_SalonId");

        builder.HasOne(n => n.Appointment)
            .WithMany(a => a.Notifications)
            .HasForeignKey(n => n.AppointmentId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Notifications_Appointments_AppointmentId");
    }
}

