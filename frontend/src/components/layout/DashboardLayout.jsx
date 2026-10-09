import { Link, useLocation } from 'react-router-dom';
import { Calendar, Users, Home, Settings, LogOut, Bell, Search, Menu } from 'lucide-react';
import { useState } from 'react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Today', href: '/app/today', icon: Home },
    { name: 'Calendar', href: '#', icon: Calendar },
    { name: 'Clients', href: '#', icon: Users },
    { name: 'Settings', href: '#', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-deep-plum/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-border-color transform transition-transform duration-200 ease-in-out z-50 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center px-6 border-b border-border-color">
          <Link to="/" className="text-2xl font-serif font-semibold text-primary-rose">SalonBook</Link>
        </div>
        <div className="p-4 flex flex-col h-[calc(100vh-4rem)] justify-between">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${active ? 'bg-rose-tint text-primary-rose' : 'text-muted hover:bg-soft-blush hover:text-deep-plum'}`}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${active ? 'text-primary-rose' : 'text-muted'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border-color pt-4">
            <Link to="/login" className="flex items-center px-3 py-2.5 text-sm font-medium text-muted hover:bg-soft-blush hover:text-deep-plum rounded-md transition-colors">
              <LogOut className="mr-3 h-5 w-5 text-muted" />
              Log out
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-border-color flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center lg:hidden">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-muted hover:text-deep-plum focus:outline-none p-1 rounded-md"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex-1 flex justify-end items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input 
                type="text" 
                placeholder="Search clients..." 
                className="pl-9 pr-4 py-1.5 text-sm border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 w-64 bg-ivory"
              />
            </div>
            <button className="text-muted hover:text-primary-rose transition-colors relative p-1 rounded-full hover:bg-soft-blush">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-primary-rose rounded-full"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-rose-tint border border-primary-rose/20 flex items-center justify-center text-primary-rose font-medium text-sm">
              JS
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
