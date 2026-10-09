using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class StaffConfiguration : IEntityTypeConfiguration<Staff>
{
    public void Configure(EntityTypeBuilder<Staff> builder)
    {
        builder.ToTable("Staff");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.FullName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(s => s.Email)
            .HasMaxLength(256);

        builder.Property(s => s.PhoneNumber)
            .HasMaxLength(30);

        builder.Property(s => s.Title)
            .HasMaxLength(100);

        builder.Property(s => s.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(s => s.CreatedAtUtc)
            .IsRequired();

        builder.Property(s => s.UpdatedAtUtc)
            .IsRequired(false);

        builder.HasIndex(s => s.SalonId)
            .HasDatabaseName("IX_Staff_SalonId");

        builder.HasIndex(s => new { s.SalonId, s.IsActive })
            .HasDatabaseName("IX_Staff_SalonId_IsActive");

        builder.HasOne(s => s.Salon)
            .WithMany(salon => salon.StaffMembers)
            .HasForeignKey(s => s.SalonId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Staff_Salons_SalonId");

        builder.HasMany(s => s.Schedules)
            .WithOne(sched => sched.Staff)
            .HasForeignKey(sched => sched.StaffId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_StaffSchedules_Staff_StaffId");
    }
}

