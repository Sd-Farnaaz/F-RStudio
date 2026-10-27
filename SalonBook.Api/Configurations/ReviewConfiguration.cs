using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("Reviews");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Rating)
            .IsRequired();

        builder.Property(r => r.CleanlinessRating)
            .IsRequired(false);

        builder.Property(r => r.StaffRating)
            .IsRequired(false);

        builder.Property(r => r.ValueRating)
            .IsRequired(false);

        builder.Property(r => r.Title)
            .HasMaxLength(200);

        builder.Property(r => r.Comment)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(r => r.PhotoUrlsJson)
            .HasMaxLength(4000);

        builder.Property(r => r.IsVerifiedVisit)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(r => r.OwnerReply)
            .HasMaxLength(2000);

        builder.Property(r => r.OwnerRepliedAtUtc)
            .IsRequired(false);

        builder.Property(r => r.CreatedAtUtc)
            .IsRequired();

        builder.Property(r => r.UpdatedAtUtc)
            .IsRequired(false);

        // Indexes for fast lookups
        builder.HasIndex(r => r.SalonId)
            .HasDatabaseName("IX_Reviews_SalonId");

        builder.HasIndex(r => new { r.SalonId, r.Rating })
            .HasDatabaseName("IX_Reviews_SalonId_Rating");

        builder.HasIndex(r => r.CustomerId)
            .HasDatabaseName("IX_Reviews_CustomerId");

        builder.HasIndex(r => r.AppointmentId)
            .IsUnique()
            .HasDatabaseName("IX_Reviews_AppointmentId");

        builder.HasIndex(r => r.StaffId)
            .HasDatabaseName("IX_Reviews_StaffId");

        // Relationships
        builder.HasOne(r => r.Salon)
            .WithMany(s => s.Reviews)
            .HasForeignKey(r => r.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Reviews_Salons_SalonId");

        builder.HasOne(r => r.Customer)
            .WithMany(u => u.Reviews)
            .HasForeignKey(r => r.CustomerId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Reviews_Users_CustomerId");

        builder.HasOne(r => r.Appointment)
            .WithOne(a => a.Review)
            .HasForeignKey<Review>(r => r.AppointmentId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Reviews_Appointments_AppointmentId");

        builder.HasOne(r => r.Staff)
            .WithMany(st => st.Reviews)
            .HasForeignKey(r => r.StaffId)
            .OnDelete(DeleteBehavior.SetNull)
            .HasConstraintName("FK_Reviews_Staff_StaffId");
    }
}
