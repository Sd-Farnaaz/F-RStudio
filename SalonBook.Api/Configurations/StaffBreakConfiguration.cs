using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class StaffBreakConfiguration : IEntityTypeConfiguration<StaffBreak>
{
    public void Configure(EntityTypeBuilder<StaffBreak> builder)
    {
        builder.ToTable("StaffBreaks");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.StartTime)
            .IsRequired();

        builder.Property(b => b.EndTime)
            .IsRequired();

        builder.Property(b => b.Title)
            .HasMaxLength(100);

        builder.HasIndex(b => b.StaffScheduleId)
            .HasDatabaseName("IX_StaffBreaks_StaffScheduleId");

        builder.HasOne(b => b.StaffSchedule)
            .WithMany(s => s.Breaks)
            .HasForeignKey(b => b.StaffScheduleId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("FK_StaffBreaks_StaffSchedules_StaffScheduleId");
    }
}

