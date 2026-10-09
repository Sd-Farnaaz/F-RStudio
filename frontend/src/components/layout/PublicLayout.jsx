import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function PublicLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <header className="px-6 py-4 flex justify-between items-center border-b border-border-color bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <Link to="/" className="text-2xl font-serif font-semibold text-primary-rose">SalonBook</Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted">
          <Link to="/features" className="hover:text-primary-rose transition-colors">Features</Link>
          <Link to="/pricing" className="hover:text-primary-rose transition-colors">Pricing</Link>
          <Link to="/salons" className="hover:text-primary-rose transition-colors">Discover Salons</Link>
          <Link to="/contact" className="hover:text-primary-rose transition-colors">Contact</Link>
        </nav>
        
        <div className="hidden md:flex gap-4 items-center">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-deep-plum hover:text-primary-rose transition-colors">Log in</Link>
          <Link to="/join" className="px-5 py-2.5 bg-primary-rose text-white text-sm font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm">Get Started</Link>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden p-2 text-deep-plum hover:text-primary-rose transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[73px] bg-white z-40 overflow-y-auto border-t border-border-color p-6 flex flex-col gap-6 shadow-xl animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4 text-lg font-medium text-deep-plum">
            <Link to="/features" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-rose transition-colors border-b border-border-color pb-4">Features</Link>
            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-rose transition-colors border-b border-border-color pb-4">Pricing</Link>
            <Link to="/salons" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-rose transition-colors border-b border-border-color pb-4">Discover Salons</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-primary-rose transition-colors border-b border-border-color pb-4">Contact</Link>
          </nav>
          <div className="flex flex-col gap-4 mt-auto pt-8">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center text-deep-plum font-medium border border-border-color rounded-lg hover:bg-soft-blush transition-colors">Log in</Link>
            <Link to="/join" onClick={() => setMobileMenuOpen(false)} className="w-full py-3 text-center bg-primary-rose text-white font-medium rounded-lg shadow-sm hover:bg-primary-rose/90 transition-colors">Get Started</Link>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="bg-deep-plum text-soft-blush py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-2xl font-serif mb-4 text-white">SalonBook</h3>
            <p className="text-sm text-dusty-rose leading-relaxed pr-4">
              Elevate your salon experience. The premium platform for beauty professionals and their clients.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-6 text-white uppercase tracking-wider text-xs">Product</h4>
            <ul className="text-sm text-dusty-rose space-y-3">
              <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/salons" className="hover:text-white transition-colors">Discover Salons</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-6 text-white uppercase tracking-wider text-xs">Support</h4>
            <ul className="text-sm text-dusty-rose space-y-3">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-6 text-white uppercase tracking-wider text-xs">Legal</h4>
            <ul className="text-sm text-dusty-rose space-y-3">
              <li><Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-white/10 text-center md:text-left text-xs text-dusty-rose flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} SalonBook. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Twitter</span>
            <span className="hover:text-white cursor-pointer transition-colors">Instagram</span>
            <span className="hover:text-white cursor-pointer transition-colors">LinkedIn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
