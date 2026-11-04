import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Mail,
  Clock,
  Calendar,
  CreditCard,
  Lock,
  CheckCircle2,
  Send,
  Check,
  Heart,
  Store,
  Scissors
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PublicLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'SuperAdmin') return '/superadmin/dashboard';
    if (user.role === 'Admin') return '/admin/dashboard';
    return '/my-bookings';
  };

  const getLogoLink = () => {
    if (!user) return '/';
    if (user.role === 'SuperAdmin') return '/superadmin/dashboard';
    if (user.role === 'Admin') return '/admin/dashboard';
    return '/';
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-deep-plum antialiased selection:bg-rose-tint selection:text-deep-plum">
      {/* Sticky Header */}
      <header className="px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center border-b border-border-color/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          
          {/* Brand Wordmark & Official Monogram */}
          <Link to={getLogoLink()} className="group flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-rose/40 rounded-xl">
            <img 
              src="/images/fr-beauty-studio-logo.png" 
              alt="F&R Beauty Studio Logo" 
              className="w-10 h-10 object-contain rounded-full border border-border-color shadow-2xs group-hover:scale-105 transition-transform" 
            />
            <span className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-deep-plum">
              F&R <span className="text-primary-rose">Beauty Studio</span>
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <Link 
              to="/features" 
              className={`transition-colors ${isActive('/features') ? 'text-primary-rose font-semibold' : 'text-muted hover:text-deep-plum'}`}
            >
              Features
            </Link>
            <Link 
              to="/pricing" 
              className={`transition-colors ${isActive('/pricing') ? 'text-primary-rose font-semibold' : 'text-muted hover:text-deep-plum'}`}
            >
              Pricing
            </Link>
            <Link 
              to="/salons" 
              className={`transition-colors ${isActive('/salons') ? 'text-primary-rose font-semibold' : 'text-muted hover:text-deep-plum'}`}
            >
              Discover Salons
            </Link>
            <Link 
              to="/contact" 
              className={`transition-colors ${isActive('/contact') ? 'text-primary-rose font-semibold' : 'text-muted hover:text-deep-plum'}`}
            >
              Contact
            </Link>
          </nav>
          
          {/* Desktop Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link 
                  to="/login" 
                  className="px-4 py-2 text-sm font-medium text-deep-plum hover:text-primary-rose transition-colors rounded-xl"
                >
                  Log in
                </Link>
                <Link 
                  to="/join" 
                  className="px-5 py-2.5 bg-primary-rose text-white text-sm font-semibold rounded-xl hover:bg-primary-rose/90 shadow-xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center gap-1.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <Link 
                to={getDashboardLink()} 
                className="px-5 py-2.5 bg-primary-rose text-white text-sm font-semibold rounded-xl hover:bg-primary-rose/90 shadow-xs hover:shadow-sm active:scale-[0.99] transition-all"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Mobile menu toggle button */}
          <button 
            type="button"
            className="md:hidden p-2 text-deep-plum hover:text-primary-rose transition-colors rounded-lg hover:bg-soft-blush focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[61px] bg-white z-40 overflow-y-auto border-t border-border-color p-6 flex flex-col gap-6 shadow-xl animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4 text-base font-medium text-deep-plum">
            <Link 
              to="/features" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`pb-3 border-b border-border-color/60 transition-colors ${isActive('/features') ? 'text-primary-rose font-semibold' : 'text-deep-plum'}`}
            >
              Features
            </Link>
            <Link 
              to="/pricing" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`pb-3 border-b border-border-color/60 transition-colors ${isActive('/pricing') ? 'text-primary-rose font-semibold' : 'text-deep-plum'}`}
            >
              Pricing
            </Link>
            <Link 
              to="/salons" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`pb-3 border-b border-border-color/60 transition-colors ${isActive('/salons') ? 'text-primary-rose font-semibold' : 'text-deep-plum'}`}
            >
              Discover Salons
            </Link>
            <Link 
              to="/contact" 
              onClick={() => setMobileMenuOpen(false)} 
              className={`pb-3 border-b border-border-color/60 transition-colors ${isActive('/contact') ? 'text-primary-rose font-semibold' : 'text-deep-plum'}`}
            >
              Contact
            </Link>
          </nav>

          <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-border-color">
            {!user ? (
              <>
                <Link 
                  to="/login" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="w-full py-3 text-center text-deep-plum font-medium border border-border-color rounded-xl hover:bg-soft-blush transition-colors text-sm"
                >
                  Log in
                </Link>
                <Link 
                  to="/join" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="w-full py-3 text-center bg-primary-rose text-white font-semibold rounded-xl shadow-xs hover:bg-primary-rose/90 transition-all text-sm"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <Link 
                to={getDashboardLink()} 
                onClick={() => setMobileMenuOpen(false)} 
                className="w-full py-3 text-center bg-primary-rose text-white font-semibold rounded-xl shadow-xs hover:bg-primary-rose/90 transition-all text-sm"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* ========================================================================= */}
      {/* CURATED SALON AESTHETICS PHOTO RIBBON                                      */}
      {/* ========================================================================= */}
      <section className="bg-ivory border-t border-border-color overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-rose" />
              <span className="text-xs font-semibold uppercase tracking-widest text-deep-plum">
                Curated by F&R Beauty Studio
              </span>
              <span className="text-xs text-muted">• Modern Aesthetics & Luxury Studios</span>
            </div>
            <Link 
              to="/salons" 
              className="text-xs font-semibold text-primary-rose hover:text-deep-plum transition-colors flex items-center gap-1 group self-start sm:self-auto"
            >
              <span>Explore All Verified Studios</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Gallery Image 1 */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border-color bg-soft-blush shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=600&q=80"
                alt="Luxury salon styling stations with arched mirrors"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-[11px] font-medium text-white">Studio Interior</span>
              </div>
            </div>

            {/* Gallery Image 2 */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border-color bg-soft-blush shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80"
                alt="Hair stylist balayage coloring"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-[11px] font-medium text-white">Signature Balayage</span>
              </div>
            </div>

            {/* Gallery Image 3 */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border-color bg-soft-blush shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
                alt="Botanical spa and facial wellness"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-[11px] font-medium text-white">Spa & Wellness</span>
              </div>
            </div>

            {/* Gallery Image 4 */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border-color bg-soft-blush shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=600&q=80"
                alt="Organic skincare cosmetic brushes and serums"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-[11px] font-medium text-white">Clinical Formulations</span>
              </div>
            </div>

            {/* Gallery Image 5 */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border-color bg-soft-blush shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"
                alt="Hair stylist tools and shears"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-[11px] font-medium text-white">Artisan Styling</span>
              </div>
            </div>

            {/* Gallery Image 6 */}
            <div className="group relative aspect-square rounded-2xl overflow-hidden border border-border-color bg-soft-blush shadow-2xs">
              <img
                src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=600&q=80"
                alt="Contemporary salon styling chairs"
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-[11px] font-medium text-white">Boutique Studios</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ENHANCED LUXURY FOOTER                                                    */}
      {/* ========================================================================= */}
      <footer className="bg-deep-plum text-soft-blush pt-16 pb-12 px-6 sm:px-8 border-t border-[#3A2B2D] relative">
        <div className="max-w-7xl mx-auto space-y-14">

          {/* 1. Trust & Quality Guarantees Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-12 border-b border-white/10 text-xs">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-dusty-rose shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-white block">100% Verified</span>
                <span className="text-[11px] text-dusty-rose/80">Vetted beauty salons & spas</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-dusty-rose shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-white block">Real-Time Sync</span>
                <span className="text-[11px] text-dusty-rose/80">Zero double-booking guarantee</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-dusty-rose shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-white block">Escrow Security</span>
                <span className="text-[11px] text-dusty-rose/80">Protected deposit releases</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-dusty-rose shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-white block">Client Dossiers</span>
                <span className="text-[11px] text-dusty-rose/80">Skin & formula safety records</span>
              </div>
            </div>
          </div>

          {/* 2. Editorial Newsletter & VIP Club */}
          <div className="bg-gradient-to-r from-white/[0.06] to-white/[0.02] rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl text-center lg:text-left">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-dusty-rose block">
                The F&R Editorial
              </span>
              <h3 className="font-serif text-2xl font-medium text-white">
                Stay Ahead of Modern Beauty Trends
              </h3>
              <p className="text-xs sm:text-sm text-dusty-rose/80 leading-relaxed">
                Join 15,000+ salon tastemakers and beauty enthusiasts. Receive our seasonal hair & skincare trend forecasts, studio opening previews, and platform updates.
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dusty-rose/60" />
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder:text-dusty-rose/50 focus:outline-none focus:ring-2 focus:ring-dusty-rose/40"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                {subscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Subscribed!</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 3. Multi-Column Link Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-white/10">
            
            {/* Brand & Concierge */}
            <div className="sm:col-span-2 lg:col-span-2 space-y-4">
              <Link to="/" className="inline-flex items-center gap-3">
                <img 
                  src="/images/fr-beauty-studio-logo.png" 
                  alt="F&R Beauty Studio Logo" 
                  className="w-10 h-10 object-contain rounded-full border border-white/20 shadow-xs" 
                />
                <span className="font-serif text-2xl font-bold tracking-tight text-white block">
                  F&R <span className="text-dusty-rose">Beauty Studio</span>
                </span>
              </Link>
              <p className="text-sm text-dusty-rose/90 max-w-sm leading-relaxed">
                The premier appointment scheduling and salon management platform crafted for modern beauty professionals and discerning clients.
              </p>
              
              {/* Concierge Desk */}
              <div className="pt-2 space-y-2 text-xs text-dusty-rose/80">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-dusty-rose shrink-0" />
                  <a 
                    href="mailto:rufnixstudio@gmail.com" 
                    className="hover:text-white transition-colors"
                  >
                    rufnixstudio@gmail.com
                  </a>
                </div>
              </div>

              {/* Social Channels */}
              <div className="flex items-center gap-2.5 pt-2">
                <a 
                  href="https://www.instagram.com/rufnix.studio/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Instagram" 
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-dusty-rose hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            {/* Discover Services */}
            <div className="space-y-4">
              <h4 className="font-medium text-white uppercase tracking-wider text-xs font-sans">
                Curated Treatments
              </h4>
              <ul className="text-sm text-dusty-rose space-y-2.5">
                <li><Link to="/salons" className="hover:text-white transition-colors">Hair Styling & Balayage</Link></li>
                <li><Link to="/salons" className="hover:text-white transition-colors">Luxury Spa & Massages</Link></li>
                <li><Link to="/salons" className="hover:text-white transition-colors">Medi-Facials & Skincare</Link></li>
                <li><Link to="/salons" className="hover:text-white transition-colors">Bridal & Makeover</Link></li>
                <li><Link to="/salons" className="hover:text-white transition-colors">Nail Bar & Extensions</Link></li>
                <li><Link to="/salons" className="hover:text-white transition-colors">Men's Barbering</Link></li>
              </ul>
            </div>

            {/* Platform & Salon Features */}
            <div className="space-y-4">
              <h4 className="font-medium text-white uppercase tracking-wider text-xs font-sans">
                Platform Suite
              </h4>
              <ul className="text-sm text-dusty-rose space-y-2.5">
                <li><Link to="/features" className="hover:text-white transition-colors">Calendar & Shift Scheduling</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">SaaS Subscription Plans</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Client Intake Dossiers</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Point of Sale (POS) & Invoicing</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Verified Customer Reviews</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Vendor Escrow Settlements</Link></li>
              </ul>
            </div>

            {/* Portals & Legal */}
            <div className="space-y-4">
              <h4 className="font-medium text-white uppercase tracking-wider text-xs font-sans">
                Portals & Company
              </h4>
              <ul className="text-sm text-dusty-rose space-y-2.5">
                <li><Link to="/admin/register" className="hover:text-white transition-colors">Register Your Salon</Link></li>
                <li><Link to="/admin/login" className="hover:text-white transition-colors">Salon Admin Portal</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Client Booking Account</Link></li>
                <li><Link to="/superadmin/login" className="hover:text-white transition-colors">SuperAdmin Gateway</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              </ul>
            </div>

          </div>

          {/* 4. Operating City Network Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-dusty-rose/70 pt-2">
            <span className="font-medium text-dusty-rose">Available Across India:</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-dusty-rose/60">
              <span>Mumbai</span>
              <span>•</span>
              <span>Delhi NCR</span>
              <span>•</span>
              <span>Bengaluru</span>
              <span>•</span>
              <span>Hyderabad</span>
              <span>•</span>
              <span>Pune</span>
              <span>•</span>
              <span>Kolkata</span>
              <span>•</span>
              <span>Chennai</span>
              <span>•</span>
              <span>Jaipur</span>
              <span>•</span>
              <span>Goa</span>
              <span>•</span>
              <span>Chandigarh</span>
            </div>
          </div>

          {/* 5. Copyright, Accepted Payments & Social Bar */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-dusty-rose/70">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
              <p>© {new Date().getFullYear()} F&R Beauty Studio Technologies Inc. All rights reserved.</p>
              <span className="hidden sm:inline text-white/20">|</span>
              <p className="flex items-center gap-1.5 text-dusty-rose/60">
                <span>Crafted with</span>
                <Heart className="w-3.5 h-3.5 text-primary-rose fill-primary-rose inline" />
                <span>for modern beauty studios</span>
              </p>
            </div>

            {/* Accepted Payments & Security Indicator */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-dusty-rose/80 font-mono">
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">UPI</span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">RuPay</span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">Visa</span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">Mastercard</span>
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                256-Bit SSL
              </span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}

