import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  ShieldCheck, 
  Users, 
  DollarSign,
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  Shield,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { 
    name: 'Overview', 
    href: '/superadmin/dashboard', 
    icon: LayoutDashboard,
    exact: true 
  },
  { 
    name: 'Salon Management', 
    href: '/superadmin/salons', 
    icon: Store,
    exact: false 
  },
  { 
    name: 'KYC Verification', 
    href: '/superadmin/kyc', 
    icon: ShieldCheck,
    exact: true 
  },
  { 
    name: 'Vendor Settlements', 
    href: '/superadmin/settlements', 
    icon: DollarSign,
    exact: true 
  },
  { 
    name: 'User Management', 
    href: '/superadmin/users', 
    icon: Users,
    exact: true 
  },
];

export default function SuperAdminLayout({ children, title, breadcrumbs = [] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/superadmin/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isNavActive = (item) => {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname === item.href || (location.pathname.startsWith(`${item.href}/`) && !location.pathname.includes('/kyc'));
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-ivory flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-deep-plum/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-border-color flex flex-col transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="SuperAdmin Sidebar"
      >
        {/* Brand Header */}
        <div className="h-18 shrink-0 flex items-center justify-between px-6 border-b border-border-color bg-white">
          <div className="flex items-center gap-3">
            <img 
              src="/images/fr-beauty-studio-logo.png" 
              alt="F&R Beauty Studio" 
              className="w-10 h-10 object-contain rounded-full border border-border-color shadow-2xs" 
            />
            <div>
              <Link 
                to="/superadmin/dashboard" 
                className="font-serif text-lg font-bold text-deep-plum tracking-tight flex items-center gap-1.5"
              >
                F&R Beauty Studio
              </Link>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-primary-rose uppercase tracking-wider">
                  Platform Admin
                </span>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden text-muted hover:text-deep-plum p-1 rounded-md transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
            Platform Operations
          </div>
          <nav className="space-y-1.5" aria-label="Main menu">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                    active
                      ? 'bg-soft-blush text-deep-plum font-semibold border border-dusty-rose/40 shadow-2xs'
                      : 'text-muted hover:bg-ivory hover:text-deep-plum'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-colors ${
                      active ? 'text-primary-rose' : 'text-muted/80 group-hover:text-deep-plum'
                    }`} />
                    <span>{item.name}</span>
                  </div>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-rose" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick Platform Links */}
          <div className="mt-8 pt-6 border-t border-border-color/80">
            <div className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">
              Public Platform
            </div>
            <a
              href="/salons"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-muted hover:text-deep-plum hover:bg-ivory rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-muted/70" />
                <span>Live Salon Directory</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* User Account / Footer */}
        <div className="shrink-0 p-4 border-t border-border-color bg-white">
          <div className="p-3 mb-3 rounded-2xl bg-ivory border border-border-color flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-deep-plum text-white flex items-center justify-center font-serif text-sm font-bold shrink-0 shadow-2xs">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-deep-plum truncate">
                {user?.fullName || 'Super Administrator'}
              </p>
              <p className="text-[11px] text-muted truncate">
                {user?.email || 'superadmin@frbeautystudio.com'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out of Platform'}</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-18 bg-white border-b border-border-color flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted hover:text-deep-plum focus:outline-none p-2 rounded-xl hover:bg-soft-blush transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
                <span>SuperAdmin</span>
                <ChevronRight className="w-3 h-3 text-muted/60" />
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    {crumb.href ? (
                      <Link to={crumb.href} className="hover:text-deep-plum transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-deep-plum">{crumb.label}</span>
                    )}
                    {idx < breadcrumbs.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-muted/60" />
                    )}
                  </span>
                ))}
              </div>
              <h1 className="font-serif text-lg sm:text-xl font-medium text-deep-plum tracking-tight leading-tight">
                {title || 'Platform Overview'}
              </h1>
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-soft-blush border border-dusty-rose/40 text-deep-plum text-xs font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Platform Active</span>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-border-color">
              <div className="w-8 h-8 rounded-full bg-primary-rose text-white flex items-center justify-center font-serif text-xs font-bold shadow-2xs">
                {user?.fullName?.charAt(0) || 'S'}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-xs font-semibold text-deep-plum leading-tight">
                  {user?.fullName || 'SuperAdmin'}
                </span>
                <span className="block text-[10px] text-muted">
                  SuperAdmin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-ivory">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
