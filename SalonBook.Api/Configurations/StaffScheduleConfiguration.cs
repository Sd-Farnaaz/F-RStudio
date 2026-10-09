using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class StaffScheduleConfiguration : IEntityTypeConfiguration<StaffSchedule>
{
    public void Configure(EntityTypeBuilder<StaffSchedule> builder)
    {
        builder.ToTable("StaffSchedules");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.DayOfWeek)
            .IsRequired();

        builder.Property(s => s.IsWorkingDay)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(s => s.StartTime)
            .IsRequired();

        builder.Property(s => s.EndTime)
            .IsRequired();

        // Each staff member has at most one schedule per day of the week
        builder.HasIndex(s => new { s.StaffId, s.DayOfWeek })
            .IsUnique()
            .HasDatabaseName("IX_StaffSchedules_StaffId_DayOfWeek");

        builder.HasOne(s => s.Staff)
            .WithMany(staff => staff.Schedules)
            .HasForeignKey(s => s.StaffId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_StaffSchedules_Staff_StaffId");

        builder.HasMany(s => s.Breaks)
            .WithOne(b => b.StaffSchedule)
            .HasForeignKey(b => b.StaffScheduleId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_StaffBreaks_StaffSchedules_StaffScheduleId");
    }
}

