import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PublicLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

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
          
          {/* Brand Wordmark */}
          <Link to={getLogoLink()} className="group flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-rose/40 rounded-lg">
            <span className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-deep-plum">
              Salon<span className="text-primary-rose">Book</span>
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

      {/* Polished Footer */}
      <footer className="bg-deep-plum text-soft-blush pt-16 pb-12 px-6 sm:px-8 border-t border-[#3A2B2D]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-14 border-b border-white/10">
            
            {/* Brand Column */}
            <div className="sm:col-span-2 lg:col-span-2 space-y-4">
              <span className="font-serif text-2xl font-bold tracking-tight text-white block">
                Salon<span className="text-dusty-rose">Book</span>
              </span>
              <p className="text-sm text-dusty-rose/90 max-w-sm leading-relaxed">
                The premier appointment scheduling and salon management platform crafted for modern beauty professionals and discerning clients.
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs text-dusty-rose/80">
                <ShieldCheck className="w-4 h-4 text-dusty-rose shrink-0" />
                <span>Verified Salon Double-Booking Protection</span>
              </div>
            </div>

            {/* Navigation Column: For Clients */}
            <div className="space-y-4">
              <h4 className="font-medium text-white uppercase tracking-wider text-xs font-sans">
                Discover
              </h4>
              <ul className="text-sm text-dusty-rose space-y-2.5">
                <li><Link to="/salons" className="hover:text-white transition-colors">Browse Salons</Link></li>
                <li><Link to="/features" className="hover:text-white transition-colors">Platform Features</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing Plans</Link></li>
              </ul>
            </div>

            {/* Navigation Column: For Salon Owners */}
            <div className="space-y-4">
              <h4 className="font-medium text-white uppercase tracking-wider text-xs font-sans">
                For Salons
              </h4>
              <ul className="text-sm text-dusty-rose space-y-2.5">
                <li><Link to="/admin/register" className="hover:text-white transition-colors">Register Your Salon</Link></li>
                <li><Link to="/admin/login" className="hover:text-white transition-colors">Salon Admin Sign In</Link></li>
                <li><Link to="/join" className="hover:text-white transition-colors">Join as Professional</Link></li>
              </ul>
            </div>

            {/* Navigation Column: Company */}
            <div className="space-y-4">
              <h4 className="font-medium text-white uppercase tracking-wider text-xs font-sans">
                Company
              </h4>
              <ul className="text-sm text-dusty-rose space-y-2.5">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Client Login</Link></li>
              </ul>
            </div>

          </div>

          {/* Copyright Subfooter */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-dusty-rose/70">
            <p>© {new Date().getFullYear()} SalonBook SaaS. All rights reserved.</p>
            <p className="text-center sm:text-right">
              Crafted with elegance for salons, spas, and wellness studios.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

