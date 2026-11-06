import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, Users, Home, Settings, LogOut, Search, Menu, X, CreditCard, 
  Compass, User as UserIcon, Store, ShieldCheck, Star, DollarSign, 
  ShoppingBag, Zap, Sparkles, ExternalLink 
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { getImageUrl } from '../../utils/imageUrl';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarLogoError, setSidebarLogoError] = useState(false);
  const [topbarLogoError, setTopbarLogoError] = useState(false);

  useEffect(() => {
    setSidebarLogoError(false);
    setTopbarLogoError(false);
  }, [user?.salonLogoUrl]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    const role = user?.role;
    await logout();
    setIsLoggingOut(false);
    
    if (role === 'SuperAdmin') navigate('/superadmin/login', { replace: true });
    else if (role === 'Admin') navigate('/admin/login', { replace: true });
    else navigate('/login', { replace: true });
  };

  const role = user?.role || 'User';

  let navigation = [];
  if (role === 'SuperAdmin') {
    navigation = [
      { name: 'Overview', href: '/superadmin/dashboard', icon: Home },
      { name: 'Salon Management', href: '/superadmin/salons', icon: Store },
      { name: 'KYC Verification', href: '/superadmin/kyc', icon: ShieldCheck },
      { name: 'User Management', href: '/superadmin/users', icon: Users },
      { name: 'Escrow & Settlements', href: '/superadmin/settlements', icon: DollarSign },
    ];
  } else if (role === 'Admin') {
    navigation = [
      { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
      { name: 'Appointments', href: '/admin/appointments', icon: Calendar },
      { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
      { name: 'POS & Walk-In', href: '/admin/pos', icon: ShoppingBag },
      { name: 'Services', href: '/admin/services', icon: Settings },
      { name: 'Staff', href: '/admin/staff', icon: Users },
      { name: 'Customers', href: '/admin/customers', icon: Users },
      { name: 'Automations & Retention', href: '/admin/automation', icon: Zap, badge: 'Growth+' },
      { name: 'Reviews', href: '/admin/reviews', icon: Star },
      { name: 'Plan & Billing', href: '/admin/billing', icon: CreditCard },
      { name: 'Payouts & Escrow', href: '/admin/payouts', icon: DollarSign },
      { name: 'Salon Profile', href: '/admin/settings/salon', icon: Settings },
    ];
  } else {
    navigation = [
      { name: 'Overview', href: '/my-bookings', icon: Home },
      { name: 'My Appointments', href: '/my-bookings?tab=appointments', icon: Calendar },
      { name: 'Beauty Dossier', href: '/my-bookings?tab=dossier', icon: ShieldCheck },
      { name: 'AI Stylist', href: '/my-bookings?tab=ai-stylist', icon: Sparkles },
      { name: 'Payments & Escrow', href: '/my-bookings?tab=payments', icon: CreditCard },
      { name: 'Discover Salons', href: '/my-bookings?tab=salons', icon: Compass },
      { name: 'Account Profile', href: '/my-bookings?tab=account', icon: UserIcon },
    ];
  }

  const getLogoLink = () => {
    if (role === 'SuperAdmin') return '/superadmin/dashboard';
    if (role === 'Admin') return '/admin/dashboard';
    if (role === 'User') return '/my-bookings';
    return '/';
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-ivory flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-deep-plum/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-border-color flex flex-col transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 lg:static shadow-xl lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 shrink-0 flex items-center justify-between px-5 sm:px-6 border-b border-border-color">
          {role === 'Admin' && user?.salonName ? (
            <Link 
              to={getLogoLink()} 
              className="flex items-center gap-2.5 min-w-0 max-w-[210px] group transition-opacity hover:opacity-90"
              title={user.salonName}
            >
              {user?.salonLogoUrl && !sidebarLogoError ? (
                <img 
                  src={getImageUrl(user.salonLogoUrl)} 
                  alt={user.salonName} 
                  onError={() => setSidebarLogoError(true)}
                  className="w-9 h-9 object-cover rounded-full border border-border-color shadow-2xs shrink-0 bg-white" 
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-soft-blush border border-primary-rose/30 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Store className="w-4 h-4 text-primary-rose" />
                </div>
              )}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-serif font-bold text-base text-deep-plum truncate group-hover:text-primary-rose transition-colors">
                  {user.salonName}
                </span>
                <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-muted truncate">
                  Salon Portal
                </span>
              </div>
            </Link>
          ) : (
            <Link to={getLogoLink()} className="flex items-center gap-2.5 text-xl font-serif font-semibold text-deep-plum">
              <img 
                src="/images/fr-beauty-studio-logo.png" 
                alt="F&R Beauty Studio" 
                className="w-8 h-8 object-contain rounded-full border border-border-color shadow-2xs shrink-0" 
              />
              <span>F&R <span className="text-primary-rose">Studio</span></span>
            </Link>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted hover:text-deep-plum">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1.5">
            <div className="px-3 py-2 mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
              {role === 'Admin' ? 'Salon Management' : role === 'SuperAdmin' ? 'Platform' : 'My Account'}
            </div>
            {navigation.map((item) => {
              const currentPath = location.pathname + location.search;
              const active = item.href.includes('?') 
                ? currentPath === item.href 
                : location.pathname === item.href && (!location.search || location.search === '?tab=overview');
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${active ? 'bg-rose-tint text-primary-rose shadow-sm' : 'text-muted hover:bg-soft-blush hover:text-deep-plum'}`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-primary-rose' : 'text-muted group-hover:text-deep-plum'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 p-4 border-t border-border-color bg-white">
          <div className="px-3 py-3 mb-4 rounded-lg bg-ivory border border-border-color flex items-center">
            {role === 'Admin' && user?.salonLogoUrl && !sidebarLogoError ? (
              <img 
                src={getImageUrl(user.salonLogoUrl)} 
                alt={user?.salonName || user?.fullName || 'Salon'} 
                className="w-10 h-10 rounded-full object-cover border border-border-color shadow-sm shrink-0 bg-white"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-rose text-white flex items-center justify-center font-medium shadow-sm shrink-0">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-deep-plum truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-danger hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-border-color flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 shadow-sm z-30 relative">
          {/* Mobile Brand & Hamburger */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-muted hover:text-deep-plum focus:outline-none p-1.5 rounded-md hover:bg-soft-blush transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link to={getLogoLink()} className="flex items-center gap-2 font-serif font-semibold text-deep-plum text-sm max-w-[190px]">
              {user?.salonLogoUrl && !topbarLogoError ? (
                <img 
                  src={getImageUrl(user.salonLogoUrl)} 
                  alt={user?.salonName || "Salon"} 
                  onError={() => setTopbarLogoError(true)}
                  className="w-7 h-7 object-cover rounded-full border border-border-color shadow-2xs shrink-0 bg-white" 
                />
              ) : (
                <img 
                  src="/images/fr-beauty-studio-logo.png" 
                  alt="F&R Beauty Studio" 
                  className="w-7 h-7 object-contain rounded-full border border-border-color shadow-2xs shrink-0" 
                />
              )}
              <span className="truncate">{role === 'Admin' && user?.salonName ? user.salonName : 'F&R Studio'}</span>
            </Link>
          </div>

          {/* Desktop Left: Salon Identity Badge in Navbar */}
          <div className="hidden lg:flex items-center gap-3">
            {role === 'Admin' && user?.salonName ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-ivory border border-border-color shadow-2xs">
                <Store className="w-4 h-4 text-primary-rose shrink-0" />
                <span className="font-serif font-semibold text-deep-plum text-sm tracking-wide">
                  {user.salonName}
                </span>
                <span className="text-[10px] uppercase font-sans font-semibold tracking-wider px-2 py-0.5 rounded-full bg-rose-tint text-primary-rose border border-primary-rose/20">
                  Salon Portal
                </span>
                {user?.salonSlug && (
                  <a
                    href={`/salons/${user.salonSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-primary-rose transition-colors flex items-center gap-1 ml-1 pl-2.5 border-l border-border-color font-medium"
                    title="View public booking storefront"
                  >
                    <span>Storefront</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ) : role === 'SuperAdmin' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-soft-blush/60 text-deep-plum text-xs font-medium border border-border-color/60">
                <ShieldCheck className="w-4 h-4 text-primary-rose" />
                <span>F&R Platform SuperAdmin Console</span>
              </div>
            ) : (
              <div className="text-xs text-muted font-medium">
                Client Portal
              </div>
            )}
          </div>
          
          {/* Topbar Right: Search & Notifications */}
          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 text-sm border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-rose/50 w-64 bg-ivory transition-shadow"
              />
            </div>
            {role !== 'SuperAdmin' && <NotificationBell />}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-ivory">
          {children}
        </main>
      </div>
    </div>
  );
}
