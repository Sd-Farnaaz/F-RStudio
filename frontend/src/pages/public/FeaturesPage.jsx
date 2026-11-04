import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { 
  Calendar, 
  Users, 
  CreditCard, 
  Bell, 
  ShieldCheck, 
  Store, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Sliders, 
  FileText, 
  Lock 
} from 'lucide-react';

export default function FeaturesPage() {
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
              <span>Platform Capabilities</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-deep-plum max-w-3xl mx-auto leading-tight">
              Crafted for luxury studios. Engineered for precision.
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              Every tool beauty professionals need to coordinate specialists, eliminate scheduling conflicts, verify deposits, and deliver an elevated client experience.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
              <Link
                to="/join"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/salons"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-deep-plum border border-border-color text-xs sm:text-sm font-medium rounded-2xl hover:bg-soft-blush hover:border-dusty-rose shadow-2xs transition-all gap-2"
              >
                <Store className="w-4 h-4 text-primary-rose" />
                <span>Explore Salons</span>
              </Link>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. CORE FEATURE MATRIX                                                   */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20">
          
          {/* Feature 1: Concurrency Booking */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block">
                Intelligent Scheduling
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum leading-snug">
                Zero Double-Booking with Live Concurrency Protection
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed">
                F&R Beauty Studio calculates real availability in real time across specialist working shifts, breaks, and existing appointments. When two clients choose the same moment, our database-level concurrency safeguards ensure conflicting slots are locked instantly.
              </p>
              
              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-deep-plum">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Real-time slot generation mapped to staff shift schedules</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Configurable service buffer and treatment duration tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Automatic conflict rejection with clear alternative slot prompts</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 bg-white p-7 sm:p-9 rounded-3xl border border-border-color shadow-sm relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border-color">
                  <div>
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Live Booking Simulation</span>
                    <h4 className="font-serif text-lg font-medium text-deep-plum">Balayage & Blowdry (120m)</h4>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100">
                    Slot Available
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl border border-border-color bg-ivory text-muted line-through">10:00 AM</div>
                  <div className="p-2.5 rounded-xl border border-primary-rose bg-soft-blush text-primary-rose font-bold shadow-2xs">11:30 AM</div>
                  <div className="p-2.5 rounded-xl border border-border-color bg-white text-deep-plum">02:00 PM</div>
                </div>

                <div className="p-4 bg-soft-blush/40 rounded-2xl border border-border-color/80 text-xs text-muted flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                  <span>When a client locks 11:30 AM, staff calendar availability is immediately reserved across all devices.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Team & Specialist Shifts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 bg-white p-7 sm:p-9 rounded-3xl border border-border-color shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-color">
                  <span className="text-xs font-semibold uppercase tracking-wider text-deep-plum">Weekly Working Shifts</span>
                  <span className="text-xs text-primary-rose font-medium">Monday – Sunday</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-ivory rounded-xl border border-border-color/80 flex items-center justify-between">
                    <span className="font-medium text-deep-plum">Stylist Elena Vance</span>
                    <span className="text-muted">Mon–Fri • 09:00 – 18:00 (Break: 13:00)</span>
                  </div>
                  <div className="p-3 bg-ivory rounded-xl border border-border-color/80 flex items-center justify-between">
                    <span className="font-medium text-deep-plum">Colorist Marcus Chen</span>
                    <span className="text-muted">Tue–Sat • 10:00 – 19:00 (Break: 14:00)</span>
                  </div>
                  <div className="p-3 bg-ivory rounded-xl border border-border-color/80 flex items-center justify-between">
                    <span className="font-medium text-deep-plum">Master Nail Artist Sofia</span>
                    <span className="text-muted">Thu–Sun • 11:00 – 20:00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block">
                Specialist Roster
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum leading-snug">
                Custom Weekly Rosters & Break Management
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed">
                Empower salon administrators to set exact working hours for each stylist, barber, and technician. Define daily shift hours, designate mid-day rest intervals, and map team members directly to their authorized service specialties.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-deep-plum">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Customizable day-by-day weekly shift hours</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Specialist-to-service mapping for precision appointment assignment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Automatic rest break exclusion from public booking slots</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: Advance Deposit & UPI Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block">
                Deposit Protection
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum leading-snug">
                Advance Deposit Tracking & UPI Verification
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed">
                Eliminate expensive no-shows by configuring advance deposit requirements on bookings. Salon owners can showcase their dedicated UPI ID and QR code, while customers securely submit their UTR transaction references for admin verification.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-deep-plum">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Configurable salon UPI QR code and instant payment ID display</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Customer payment proof submission with duplicate reference protection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Salon admin verification ledger with Paid, Partial, and Refunded status states</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 bg-white p-7 sm:p-9 rounded-3xl border border-border-color shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-color">
                  <span className="text-xs font-semibold uppercase tracking-wider text-deep-plum">Payment Ledger</span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    Live Status
                  </span>
                </div>

                <div className="p-4 bg-ivory rounded-2xl border border-border-color space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Advance Deposit Required:</span>
                    <span className="font-bold text-deep-plum">₹500.00</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Transaction Ref (UTR):</span>
                    <span className="font-mono text-deep-plum font-semibold">UPI/984372918342</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Admin Verification:</span>
                    <span className="text-emerald-700 font-semibold">Verified by Salon Admin ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: Live Notifications & Background Reminders */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 bg-white p-7 sm:p-9 rounded-3xl border border-border-color shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-color">
                  <span className="text-xs font-semibold uppercase tracking-wider text-deep-plum">Notification Center</span>
                  <span className="text-xs bg-soft-blush text-primary-rose font-bold px-2 py-0.5 rounded-full">
                    3 New
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-soft-blush/30 rounded-xl border border-border-color/80 flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-deep-plum">New Appointment Confirmed</p>
                      <p className="text-muted text-[11px]">Jane Doe booked Deluxe Facial for tomorrow at 14:00.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-soft-blush/30 rounded-xl border border-border-color/80 flex items-start gap-2.5">
                    <CreditCard className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-deep-plum">Payment Proof Submitted</p>
                      <p className="text-muted text-[11px]">Ref: UPI/984372918342 submitted for review.</p>
                    </div>
                  </div>
                  <div className="p-3 bg-ivory rounded-xl border border-border-color/80 flex items-start gap-2.5 opacity-80">
                    <Clock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-deep-plum">24-Hour Reminder Dispatched</p>
                      <p className="text-muted text-[11px]">Automated background worker notification sent.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose">
                <Bell className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block">
                Communication Engine
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum leading-snug">
                Dual-Channel In-App & Email Notifications
              </h2>
              <p className="text-sm sm:text-base text-muted leading-relaxed">
                Keep both clients and salon teams aligned without manual phone tag. F&R Beauty Studio includes an active in-app notification center with live unread badge counters, instant mark-as-read toggles, and hosted background worker tasks for 24-hour and 2-hour appointment reminders.
              </p>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-deep-plum">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Real-time in-app bell notification popover with deep-links</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Automated background hosted service for 24h & 2h reminders</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Role-isolated alert dispatch for Admin and Customer accounts</span>
                </li>
              </ul>
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* 3. DUAL-SIDED VALUE COMPARISON                                           */}
        {/* ========================================================================= */}
        <section className="bg-white py-20 border-y border-border-color">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block">
                Two Tailored Experiences
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum">
                Built for Both Sides of the Beauty Chair
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* For Clients */}
              <div className="p-8 rounded-3xl bg-ivory border border-border-color space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border-color flex items-center justify-center text-primary-rose">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl font-medium text-deep-plum">For Clients & Guests</h3>
                    <p className="text-xs text-muted">A effortless, luxury booking journey</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-deep-plum">
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Search verified salons by city and business specialty</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Live 7-day date selector with morning/afternoon/evening time slots</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Self-service booking cancellation with terminal status safeguards</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>UPI QR code preview and transaction proof submission</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Centralized booking ledger and notification inbox</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/salons"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-rose hover:text-deep-plum transition-colors"
                  >
                    <span>Browse Salons Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* For Salon Owners */}
              <div className="p-8 rounded-3xl bg-ivory border border-border-color space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-border-color flex items-center justify-center text-primary-rose">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl font-medium text-deep-plum">For Salon Owners & Staff</h3>
                    <p className="text-xs text-muted">A powerhouse management workspace</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-deep-plum">
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Custom public salon profile slug, branding, and opening hours</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Unlimited service treatments with pricing, duration, and imagery</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Specialist roster management with custom weekly shifts and breaks</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Client history tracking and manual appointment creation</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Advance deposit tracking, UPI configuration, and revenue analytics</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    to="/admin/register"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-rose hover:text-deep-plum transition-colors"
                  >
                    <span>Register Your Salon</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. CLOSING CTA                                                           */}
        {/* ========================================================================= */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum">
              Experience the F&R Beauty Studio difference today.
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
              Join the modern platform designed specifically for beauty professionals and their clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
              <Link
                to="/join"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs transition-all gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/salons"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-deep-plum border border-border-color text-xs sm:text-sm font-medium rounded-2xl hover:bg-soft-blush shadow-2xs transition-all gap-2"
              >
                <span>Discover Salons</span>
              </Link>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
