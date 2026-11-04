using SalonBook.Api.Models;

namespace SalonBook.Api.Services;

public record EmailTemplateResult(string Subject, string HtmlBody, string PlainTextBody);

public interface IEmailTemplateBuilder
{
    EmailTemplateResult BuildCustomerWelcomeEmail(string customerName, string customerEmail);
    EmailTemplateResult BuildSalonAdminWelcomeEmail(string adminName, string salonName, string salonSlug);
    EmailTemplateResult BuildBookingConfirmationEmail(Appointment appt);
    EmailTemplateResult BuildOwnerNewBookingEmail(Appointment appt, string? adminName = null);
    EmailTemplateResult BuildAppointmentReminderEmail(Appointment appt, string reminderType);
    EmailTemplateResult BuildAppointmentCancelledEmail(Appointment appt, bool isForCustomer, string? adminName = null);
    EmailTemplateResult BuildAppointmentRescheduledEmail(Appointment appt, bool isForCustomer, string? adminName = null, DateTime? previousStartUtc = null);
    EmailTemplateResult BuildPaymentStatusEmail(Appointment appt, string eventType);
    EmailTemplateResult BuildPaymentProofSubmittedEmail(Appointment appt, string? adminName = null);
    EmailTemplateResult BuildPasswordResetEmail(string recipientName, string resetCode, int expirationMinutes = 30);
    EmailTemplateResult BuildPostVisitReviewEmail(Appointment appt);
    EmailTemplateResult BuildInternalSmtpTestEmail(string recipientEmail);
}
