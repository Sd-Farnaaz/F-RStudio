using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SalonBook.Api.Models;

namespace SalonBook.Api.Configurations;

public class SubscriptionTransactionConfiguration : IEntityTypeConfiguration<SubscriptionTransaction>
{
    public void Configure(EntityTypeBuilder<SubscriptionTransaction> builder)
    {
        builder.ToTable("SubscriptionTransactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.PlanTier)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(t => t.BillingCycle)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("Monthly");

        builder.Property(t => t.RazorpayOrderId)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(t => t.RazorpayOrderId)
            .IsUnique()
            .HasDatabaseName("IX_SubscriptionTransactions_RazorpayOrderId");

        builder.Property(t => t.RazorpayPaymentId)
            .HasMaxLength(100);

        builder.HasIndex(t => t.RazorpayPaymentId)
            .HasDatabaseName("IX_SubscriptionTransactions_RazorpayPaymentId");

        builder.Property(t => t.RazorpaySignature)
            .HasMaxLength(255);

        builder.Property(t => t.Amount)
            .IsRequired()
            .HasPrecision(18, 2);

        builder.Property(t => t.Currency)
            .IsRequired()
            .HasMaxLength(10)
            .HasDefaultValue("INR");

        builder.Property(t => t.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Pending");

        builder.Property(t => t.VerificationStatus)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Unverified");

        builder.Property(t => t.PaymentMethod)
            .HasMaxLength(50);

        builder.Property(t => t.FailureReason)
            .HasMaxLength(500);

        builder.HasOne(t => t.Salon)
            .WithMany(s => s.SubscriptionTransactions)
            .HasForeignKey(t => t.SalonId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => new { t.SalonId, t.Status })
            .HasDatabaseName("IX_SubscriptionTransactions_SalonId_Status");
    }
}
