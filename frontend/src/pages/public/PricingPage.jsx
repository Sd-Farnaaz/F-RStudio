import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Store, 
  HelpCircle, 
  Mail, 
  HeartHandshake 
} from 'lucide-react';

export default function PricingPage() {
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
              <span>Transparent Platform Access</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-deep-plum max-w-3xl mx-auto leading-tight">
              Simple, transparent access for modern beauty businesses.
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              No hidden platform commissions. No complex subscription tiers. Direct, honest software built for salons and their discerning clientele.
            </p>

            <div className="inline-flex items-center gap-2 p-3 bg-white/80 border border-border-color rounded-2xl text-xs text-muted shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Current Platform Release: Zero subscription fees for all registered partner salons.</span>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. PLANS & ACCESS TIERS                                                  */}
        {/* ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* TIER 1: CLIENT GUEST (ALWAYS FREE) */}
            <div className="bg-white rounded-3xl p-8 border border-border-color shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
                  For Clients & Guests
                </span>
                <h3 className="font-serif text-2xl font-medium text-deep-plum mb-2">
                  Client Booking
                </h3>
                <p className="text-xs text-muted leading-relaxed mb-6">
                  Discover top studios, book treatments, and manage all your beauty appointments in one place.
                </p>

                <div className="mb-6 pb-6 border-b border-border-color/80">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-bold text-deep-plum">Free</span>
                    <span className="text-xs text-muted">/ forever</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">No booking fees or platform markups</p>
                </div>

                <ul className="space-y-3 text-xs text-deep-plum">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Unlimited appointment booking across all salons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Live real-time slot calendar availability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Self-service appointment cancellations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Direct UPI advance deposit submissions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>In-app notifications and email confirmations</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/signup"
                  className="w-full py-3 bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose text-xs font-semibold rounded-2xl text-center block transition-colors"
                >
                  Create Client Account
                </Link>
              </div>
            </div>

            {/* TIER 2: SALON PARTNER (PROMOTED - FREE LAUNCH EDITION) */}
            <div className="bg-white rounded-3xl p-8 border-2 border-primary-rose shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary-rose text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-xl">
                Launch Partner Edition
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-rose block mb-2">
                  For Salons & Independent Studios
                </span>
                <h3 className="font-serif text-2xl font-medium text-deep-plum mb-2">
                  Partner Salon
                </h3>
                <p className="text-xs text-muted leading-relaxed mb-6">
                  Complete salon management workspace to run your team, bookings, services, and payments.
                </p>

                <div className="mb-6 pb-6 border-b border-border-color/80">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-4xl font-bold text-deep-plum">Free Access</span>
                    <span className="text-xs text-muted">/ current rollout</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">Zero platform subscription during early launch</p>
                </div>

                <ul className="space-y-3 text-xs text-deep-plum">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Custom public salon profile & vanity URL</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Unlimited service treatments & category catalog</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Specialist roster & weekly working shifts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Automated SQL concurrency slot protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>UPI QR advance payment configuration & verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Client management directory & verified revenue tracking</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/admin/register"
                  className="w-full py-3.5 bg-primary-rose text-white text-xs font-semibold rounded-2xl shadow-xs hover:bg-primary-rose/90 text-center block transition-all"
                >
                  Register Your Salon Now →
                </Link>
              </div>
            </div>

            {/* TIER 3: ENTERPRISE & MULTI-LOCATION */}
            <div className="bg-white rounded-3xl p-8 border border-border-color shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-2">
                  For Multi-Location Franchises
                </span>
                <h3 className="font-serif text-2xl font-medium text-deep-plum mb-2">
                  Studio Enterprise
                </h3>
                <p className="text-xs text-muted leading-relaxed mb-6">
                  Custom onboarding and multi-location setup tailored for large beauty franchises and luxury chains.
                </p>

                <div className="mb-6 pb-6 border-b border-border-color/80">
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold text-deep-plum">Custom Setup</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">Dedicated migration & priority support</p>
                </div>

                <ul className="space-y-3 text-xs text-deep-plum">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Multi-salon tenant architecture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Custom domain & brand integration assistance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Bulk staff schedule and service imports</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                    <span>Dedicated technical onboarding specialist</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link
                  to="/contact"
                  className="w-full py-3 bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose text-xs font-semibold rounded-2xl text-center block transition-colors"
                >
                  Contact Us for Custom Setup
                </Link>
              </div>
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* 3. TRANSPARENCY & FAQS                                                   */}
        {/* ========================================================================= */}
        <section className="bg-white py-16 sm:py-20 border-t border-border-color">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center mb-12 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl font-serif font-medium text-deep-plum">
                Everything You Need to Know
              </h2>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-ivory border border-border-color">
                <h4 className="font-serif text-base font-medium text-deep-plum mb-2">
                  Are there any hidden fees or commission percentages taken from bookings?
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  No. F&R Beauty Studio does not collect a percentage fee or per-booking surcharge. When clients submit advance deposits via UPI, those funds go directly from the client to your salon's specified UPI account.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-ivory border border-border-color">
                <h4 className="font-serif text-base font-medium text-deep-plum mb-2">
                  How does the UPI advance payment verification work?
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  In your salon settings, configure your UPI ID and optional QR code image. When a client books a treatment requiring an advance, they are shown your QR code and submit their bank UTR/transaction reference. Salon admins then verify the payment directly in their dashboard ledger.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-ivory border border-border-color">
                <h4 className="font-serif text-base font-medium text-deep-plum mb-2">
                  Can clients cancel their appointments?
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Yes. Clients can cancel upcoming appointments from their customer dashboard before the appointment begins. Completed, in-progress, or already cancelled appointments are protected against duplicate cancellation.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-ivory border border-border-color">
                <h4 className="font-serif text-base font-medium text-deep-plum mb-2">
                  How do I register and start accepting bookings?
                </h4>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Simply navigate to <Link to="/admin/register" className="text-primary-rose underline font-semibold">Register Your Salon</Link>, set up your salon profile and password, add your services and specialists, and your salon page will be instantly live in our public directory.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. CLOSING CTA                                                           */}
        {/* ========================================================================= */}
        <section className="py-16 text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            <h2 className="text-3xl font-serif font-medium text-deep-plum">
              Ready to take your salon to the next level?
            </h2>
            <p className="text-sm text-muted">
              Join F&R Beauty Studio today with zero platform subscription fees.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                to="/admin/register"
                className="px-8 py-3.5 bg-primary-rose text-white text-xs font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs transition-all"
              >
                Register Your Salon Free
              </Link>
              <Link
                to="/contact"
                className="px-8 py-3.5 bg-white text-deep-plum border border-border-color text-xs font-medium rounded-2xl hover:bg-soft-blush transition-all"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
