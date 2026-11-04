import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import SalonCard from '../../components/common/SalonCard';
import AiStylistModal from '../../components/ai/AiStylistModal';
import { 
  ArrowRight, 
  Calendar, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Bell, 
  MapPin, 
  Store, 
  ChevronRight, 
  Check, 
  Scissors, 
  Star 
} from 'lucide-react';

export default function LandingPage() {
  const [salons, setSalons] = useState([]);
  const [loadingSalons, setLoadingSalons] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);
  const [activeJourney, setActiveJourney] = useState('clients'); // 'clients' | 'owners'

  useEffect(() => {
    const fetchFeaturedSalons = async () => {
      try {
        setLoadingSalons(true);
        const data = await publicService.getSalons({ pageSize: 3 });
        const list = data.items || (Array.isArray(data) ? data : []);
        setSalons(list.slice(0, 3));
      } catch (err) {
        console.warn('Could not load featured salons for homepage:', err);
        setSalons([]);
      } finally {
        setLoadingSalons(false);
      }
    };

    fetchFeaturedSalons();
  }, []);

  return (
    <PublicLayout>
      {/* ========================================================================= */}
      {/* 1. HERO SECTION                                                          */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-tint/40 via-soft-blush/20 to-ivory border-b border-border-color/80">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-soft-blush/60 to-transparent rounded-full blur-3xl pointer-events-none -mt-20" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-gradient-to-tr from-rose-tint/50 to-transparent rounded-full blur-2xl pointer-events-none -mb-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Left Column */}
            <div className="lg:col-span-7 text-center lg:text-left z-10 space-y-6 sm:space-y-8">
              
              {/* Eyebrow Label */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold tracking-wider uppercase shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-primary-rose" />
                <span>Your Beauty Business, Reimagined</span>
              </div>

              {/* Expressive Editorial Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-deep-plum leading-[1.12] tracking-tight">
                Elevate your beauty business with effortless elegance.
              </h1>

              {/* Supporting Value Proposition */}
              <p className="text-base sm:text-lg lg:text-xl text-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Streamline client bookings, coordinate specialist schedules, verify advance deposits, and eliminate double-booking — all in an intuitive, luxury workspace.
              </p>

              {/* Primary & Secondary Action CTAs */}
              <div className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start pt-2">
                <Link 
                  to="/join" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary-rose text-white text-sm sm:text-base font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-sm hover:shadow-md active:scale-[0.99] transition-all gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link 
                  to="/salons" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-deep-plum border border-border-color text-sm sm:text-base font-medium rounded-2xl hover:bg-soft-blush hover:border-dusty-rose shadow-2xs transition-all gap-2"
                >
                  <Store className="w-4 h-4 text-primary-rose" />
                  <span>Discover Salons</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-deep-plum/90 to-primary-rose text-white text-sm sm:text-base font-semibold rounded-2xl hover:opacity-95 shadow-2xs transition-all gap-2"
                >
                  <Sparkles className="w-4 h-4 text-accent-gold" />
                  <span>AI Style Match</span>
                </button>
              </div>

              {/* Real Platform Trust Highlights */}
              <div className="pt-4 sm:pt-6 border-t border-border-color/80 flex flex-wrap items-center justify-center lg:justify-start gap-y-3 gap-x-6 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Live Availability Booking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Integrated Advance Tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                  <span>Multi-Tenant Salon Security</span>
                </div>
              </div>

            </div>

            {/* Hero Right Column: Photography Composition with Live Feature Pill */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-none">
                
                {/* Main Dominant Salon Interior Photo */}
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-2 border-white shadow-xl bg-soft-blush">
                  <img 
                    src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1200&q=85" 
                    alt="Luxury salon interior styling stations with arched mirrors" 
                    className="w-full h-full object-cover object-center"
                    loading="eager"
                  />
                  {/* Subtle inner gradient shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/30 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Overlapping Secondary Accent Image */}
                <div className="hidden sm:block absolute -bottom-6 -left-8 w-44 h-44 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-soft-blush">
                  <img 
                    src="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=85" 
                    alt="Master hairstylist balayage styling" 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Floating Product Highlight Card */}
                <div className="absolute -top-4 -right-4 sm:-right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-border-color shadow-lg max-w-[230px] animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Confirmed Booking
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-deep-plum truncate">
                    Signature Balayage & Cut
                  </p>
                  <div className="mt-2 pt-2 border-t border-border-color/60 flex items-center justify-between text-[11px]">
                    <span className="text-muted">Advance Status</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Verified ✓
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. FEATURED SALONS SECTION                                                */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-24 bg-white border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block mb-2">
                Curated Destinations
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum">
                Featured Salons & Studios
              </h2>
              <p className="text-sm sm:text-base text-muted mt-1 max-w-xl">
                Discover verified salons and studios offering real-time scheduling.
              </p>
            </div>

            <Link 
              to="/salons" 
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary-rose hover:text-deep-plum transition-colors group"
            >
              <span>Explore All Salons</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Salons Grid / Loading / Empty */}
          {loadingSalons ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-ivory rounded-3xl border border-border-color" />
              ))}
            </div>
          ) : salons.length === 0 ? (
            <div className="bg-ivory rounded-3xl border border-border-color p-12 text-center max-w-xl mx-auto">
              <Store className="w-10 h-10 text-dusty-rose mx-auto mb-3 opacity-60" />
              <h3 className="font-serif text-xl font-medium text-deep-plum mb-2">
                Explore the Salon Directory
              </h3>
              <p className="text-xs sm:text-sm text-muted mb-6">
                New luxury salons are regularly joining F&R Beauty Studio. Browse all registered locations to find an opening near you.
              </p>
              <Link 
                to="/salons" 
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs"
              >
                <span>Browse Directory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {salons.map(salon => (
                <SalonCard key={salon.id} salon={salon} />
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PLATFORM CAPABILITIES (EDITORIAL FEATURE MATRIX)                      */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 bg-ivory border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block mb-2">
              Built for Modern Studios
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-deep-plum leading-tight">
              Everything your salon needs to operate seamlessly.
            </h2>
            <p className="text-sm sm:text-base text-muted mt-3 leading-relaxed">
              Designed from the ground up for high-touch service businesses. Every feature maps directly to real-world salon workflows.
            </p>
          </div>

          {/* 4 Feature Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Pillar 1 */}
            <div className="bg-white rounded-3xl p-7 border border-border-color shadow-2xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-soft-blush text-primary-rose flex items-center justify-center mb-6 border border-dusty-rose/30">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-medium text-deep-plum mb-2">
                  Live Slot Booking
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Real-time calendar slot queries, double-booking prevention, and instant appointment locks across team schedules.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border-color/60 text-[11px] text-muted flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary-rose" />
                <span>Zero overlapping bookings</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-3xl p-7 border border-border-color shadow-2xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-soft-blush text-primary-rose flex items-center justify-center mb-6 border border-dusty-rose/30">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-medium text-deep-plum mb-2">
                  Specialist Roster
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Tailor weekly shift schedules, assign specific stylists to treatments, and manage staff availability effortlessly.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border-color/60 text-[11px] text-muted flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary-rose" />
                <span>Custom weekly schedules</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-3xl p-7 border border-border-color shadow-2xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-soft-blush text-primary-rose flex items-center justify-center mb-6 border border-dusty-rose/30">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-medium text-deep-plum mb-2">
                  Advance Payments
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Salon UPI QR integration, customer transaction reference tracking, and an admin verification ledger.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border-color/60 text-[11px] text-muted flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary-rose" />
                <span>Reduce costly no-shows</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white rounded-3xl p-7 border border-border-color shadow-2xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-soft-blush text-primary-rose flex items-center justify-center mb-6 border border-dusty-rose/30">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-medium text-deep-plum mb-2">
                  Live Notifications
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  In-app notification bell with unread counters, automated 24-hour reminders, and immediate booking status updates.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border-color/60 text-[11px] text-muted flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary-rose" />
                <span>Automated client reminders</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. HOW IT WORKS (DUAL-SIDED JOURNEY)                                      */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-24 bg-white border-b border-border-color">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block mb-2">
              Intuitive Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-deep-plum">
              How F&R Beauty Studio Works
            </h2>
            <p className="text-sm text-muted mt-2">
              Select a path below to see how our platform connects clients with beauty professionals.
            </p>

            {/* Path Toggle Pills */}
            <div className="mt-6 inline-flex p-1 bg-ivory rounded-2xl border border-border-color">
              <button
                type="button"
                onClick={() => setActiveJourney('clients')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeJourney === 'clients'
                    ? 'bg-deep-plum text-white shadow-xs'
                    : 'text-muted hover:text-deep-plum'
                }`}
              >
                For Clients & Guests
              </button>
              <button
                type="button"
                onClick={() => setActiveJourney('owners')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeJourney === 'owners'
                    ? 'bg-deep-plum text-white shadow-xs'
                    : 'text-muted hover:text-deep-plum'
                }`}
              >
                For Salon Owners & Admins
              </button>
            </div>
          </div>

          {/* Steps Display */}
          {activeJourney === 'clients' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="rounded-3xl bg-ivory border border-border-color overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow">
                <div className="aspect-[16/9] w-full overflow-hidden bg-soft-blush relative">
                  <img
                    src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80"
                    alt="Discover luxury salons"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-serif font-bold text-deep-plum border border-border-color shadow-2xs">
                    01
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-serif text-lg font-medium text-deep-plum mb-2">
                    Discover Curated Salons
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Browse verified hair, nail, spa, and beauty studios with transparent service menus, pricing, and locations.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-ivory border border-border-color overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow">
                <div className="aspect-[16/9] w-full overflow-hidden bg-soft-blush relative">
                  <img
                    src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"
                    alt="Stylist picking treatment"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-serif font-bold text-deep-plum border border-border-color shadow-2xs">
                    02
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-serif text-lg font-medium text-deep-plum mb-2">
                    Pick Treatment & Slot
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Select your treatment, pick your favorite stylist, and choose an available live calendar slot instantly.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-ivory border border-border-color overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow">
                <div className="aspect-[16/9] w-full overflow-hidden bg-soft-blush relative">
                  <img
                    src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
                    alt="Relaxed confirmed salon visit"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-serif font-bold text-deep-plum border border-border-color shadow-2xs">
                    03
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-serif text-lg font-medium text-deep-plum mb-2">
                    Enjoy Confirmed Visits
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Submit required advance deposit references seamlessly, receive automated reminders, and arrive with confidence.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
              <div className="rounded-3xl bg-ivory border border-border-color overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow">
                <div className="aspect-[16/9] w-full overflow-hidden bg-soft-blush relative">
                  <img
                    src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=600&q=80"
                    alt="Register your salon studio"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-serif font-bold text-deep-plum border border-border-color shadow-2xs">
                    01
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-serif text-lg font-medium text-deep-plum mb-2">
                    Register Your Business
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Create your salon workspace, upload your logo, configure currency and contact details, and publish your service menu.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-ivory border border-border-color overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow">
                <div className="aspect-[16/9] w-full overflow-hidden bg-soft-blush relative">
                  <img
                    src="https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80"
                    alt="Coordinate team shifts"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-serif font-bold text-deep-plum border border-border-color shadow-2xs">
                    02
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-serif text-lg font-medium text-deep-plum mb-2">
                    Coordinate Staff & Shifts
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Add team specialists, designate weekly working hours, and assign treatments to prevent overlapping schedules.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-ivory border border-border-color overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-sm transition-shadow">
                <div className="aspect-[16/9] w-full overflow-hidden bg-soft-blush relative">
                  <img
                    src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=600&q=80"
                    alt="Verify advance deposits"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-xs font-serif font-bold text-deep-plum border border-border-color shadow-2xs">
                    03
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-serif text-lg font-medium text-deep-plum mb-2">
                    Verify Deposits & Grow
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Review booking requests, verify UPI advance proofs, track client histories, and keep your chairs filled.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CLOSING CALL TO ACTION                                                 */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 bg-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-deep-plum text-white p-8 sm:p-14 lg:p-20 shadow-2xl border border-border-color/20">
            {/* Background luxury photo overlay */}
            <img
              src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1600&q=85"
              alt="Luxury aesthetic salon interior"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-20 mix-blend-luminosity scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-deep-plum via-deep-plum/90 to-deep-plum/60" />

            <div className="relative z-10 max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-dusty-rose text-xs font-semibold uppercase tracking-wider shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
                <span>Join F&R Beauty Studio Today</span>
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium leading-[1.15] text-white">
                Ready to elevate your salon booking experience?
              </h2>

              <p className="text-base sm:text-lg text-soft-blush/90 leading-relaxed font-normal">
                Whether you are a beauty professional scaling your business or a client looking for a seamless, confirmed appointment, F&R Beauty Studio delivers luxury at every touchpoint.
              </p>

              <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                <Link 
                  to="/join" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary-rose text-white text-sm sm:text-base font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-md hover:shadow-lg active:scale-[0.99] transition-all gap-2"
                >
                  <span>Get Started Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link 
                  to="/salons" 
                  className="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 text-sm sm:text-base font-medium rounded-2xl shadow-xs transition-all gap-2"
                >
                  <Store className="w-4 h-4 text-dusty-rose" />
                  <span>Browse Salons</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Stylist Assistant Modal */}
      <AiStylistModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
      />
    </PublicLayout>
  );
}
