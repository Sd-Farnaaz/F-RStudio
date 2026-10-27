using Microsoft.EntityFrameworkCore;
using SalonBook.Api.Models;

namespace SalonBook.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Salon> Salons => Set<Salon>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<VendorPayout> VendorPayouts => Set<VendorPayout>();
    public DbSet<VendorComplianceLog> VendorComplianceLogs => Set<VendorComplianceLog>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<StaffSchedule> StaffSchedules => Set<StaffSchedule>();
    public DbSet<StaffBreak> StaffBreaks => Set<StaffBreak>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AppointmentReminder> AppointmentReminders => Set<AppointmentReminder>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ClientConsultationCard> ClientConsultationCards => Set<ClientConsultationCard>();
    public DbSet<ClientFormulaRecord> ClientFormulaRecords => Set<ClientFormulaRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all entity configurations in this assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
