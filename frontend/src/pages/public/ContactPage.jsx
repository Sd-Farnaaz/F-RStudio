import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Store, 
  HelpCircle, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';

const SUPPORT_EMAIL = 'rufnixstudio@gmail.com';

const INQUIRY_TOPICS = [
  'Salon Partnership & Onboarding',
  'Client Appointment Inquiries',
  'Technical & Account Assistance',
  'Enterprise & Multi-Location Studio',
  'General Feedback'
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    topic: INQUIRY_TOPICS[0],
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs.fullName = 'Please enter your full name (at least 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      errs.message = 'Please provide a message with at least 10 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build mailto URI
    const subject = `[F&R Beauty Studio Inquiry] ${formData.topic} - ${formData.fullName.trim()}`;
    const body = `Name: ${formData.fullName.trim()}\nEmail: ${formData.email.trim()}\nTopic: ${formData.topic}\n\nMessage:\n${formData.message.trim()}`;
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Trigger user mail client
    window.location.href = mailtoUrl;
    setSubmitted(true);
  };

  const handleCopyMessage = () => {
    const fullText = `To: ${SUPPORT_EMAIL}\nSubject: [F&R Beauty Studio Inquiry] ${formData.topic} - ${formData.fullName.trim()}\nFrom: ${formData.fullName.trim()} (${formData.email.trim()})\n\n${formData.message.trim()}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <PublicLayout>
      <div className="bg-ivory min-h-screen pb-20">
        
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                          */}
        {/* ========================================================================= */}
        <section className="bg-gradient-to-b from-rose-tint/40 via-soft-blush/20 to-ivory border-b border-border-color py-16 sm:py-20 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>We're Here to Help</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-deep-plum max-w-3xl mx-auto leading-tight">
              Get in touch with the F&R Beauty Studio team.
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              Have questions about salon onboarding, appointment bookings, or platform features? Send us a message and our support team will assist you.
            </p>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. CONTACT WORKSPACE                                                     */}
        {/* ========================================================================= */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Direct Support Channels */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-border-color shadow-xs space-y-6">
                <div>
                  <h3 className="font-serif text-2xl font-medium text-deep-plum mb-2">
                    Direct Contact Channels
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Our team provides support for salon owners, stylists, and clients using F&R Beauty Studio.
                  </p>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Email Support */}
                  <div className="p-4 rounded-2xl bg-ivory border border-border-color flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-border-color flex items-center justify-center text-primary-rose shrink-0 shadow-2xs">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">Official Support Email</span>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-deep-plum hover:text-primary-rose transition-colors">
                        {SUPPORT_EMAIL}
                      </a>
                      <p className="text-[11px] text-muted mt-0.5">Response typically within 24 business hours.</p>
                    </div>
                  </div>

                  {/* Salon Owner Fast-Track */}
                  <div className="p-4 rounded-2xl bg-ivory border border-border-color flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-border-color flex items-center justify-center text-primary-rose shrink-0 shadow-2xs">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">Salon Onboarding</span>
                      <Link to="/admin/register" className="font-semibold text-primary-rose hover:underline block">
                        Register Your Salon Directly →
                      </Link>
                      <p className="text-[11px] text-muted mt-0.5">Instant registration with zero platform subscription fees.</p>
                    </div>
                  </div>

                  {/* Client Appointment Questions */}
                  <div className="p-4 rounded-2xl bg-ivory border border-border-color flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-border-color flex items-center justify-center text-primary-rose shrink-0 shadow-2xs">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">Booking Assistance</span>
                      <Link to="/my-bookings" className="font-semibold text-primary-rose hover:underline block">
                        Manage Existing Bookings →
                      </Link>
                      <p className="text-[11px] text-muted mt-0.5">View appointments, payment statuses, and cancel slots.</p>
                    </div>
                  </div>
                </div>

                {/* Transparency Note */}
                <div className="pt-2 text-[11px] text-muted leading-relaxed border-t border-border-color/80 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-primary-rose shrink-0 mt-0.5" />
                  <span>
                    Note: Direct form submissions open in your email client addressed to <strong className="text-deep-plum">{SUPPORT_EMAIL}</strong> to ensure direct delivery without silent server-side message drops.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Functional Validated Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-border-color shadow-sm">
              <div className="mb-6">
                <h3 className="font-serif text-2xl font-medium text-deep-plum mb-1">
                  Send an Inquiry
                </h3>
                <p className="text-xs sm:text-sm text-muted">
                  Fill in your details below to generate and dispatch your message directly to our support desk.
                </p>
              </div>

              {submitted && (
                <div className="mb-8 p-5 bg-emerald-50 rounded-2xl border border-emerald-200/80 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs sm:text-sm font-semibold">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Inquiry Prepared for Dispatch</span>
                  </div>
                  <p className="text-xs text-emerald-900/90 leading-relaxed">
                    Your email client should have opened with your inquiry addressed to <strong>{SUPPORT_EMAIL}</strong>. If your mail client did not launch automatically, you can copy the message below:
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 hover:bg-emerald-50 shadow-2xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Full Message'}</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Jane Doe"
                    className={`w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 transition-all ${
                      errors.fullName ? 'border-rose-400 bg-rose-50/30' : 'border-border-color'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Your Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. jane@example.com"
                    className={`w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 transition-all ${
                      errors.email ? 'border-rose-400 bg-rose-50/30' : 'border-border-color'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Topic / Category */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Inquiry Topic
                  </label>
                  <select
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 transition-all"
                  >
                    {INQUIRY_TOPICS.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Your Message *
                  </label>
                  <textarea
                    rows={5}
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we assist your salon or booking experience?"
                    className={`w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 resize-none transition-all ${
                      errors.message ? 'border-rose-400 bg-rose-50/30' : 'border-border-color'
                    }`}
                  />
                  {errors.message && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.message}</p>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message to Support</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
