import { Link } from 'react-router-dom';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <header className="px-6 py-4 flex justify-between items-center border-b border-border-color bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <Link to="/" className="text-2xl font-serif font-semibold text-primary-rose">SalonBook</Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-muted">
          <Link to="/features" className="hover:text-primary-rose transition-colors">Features</Link>
          <Link to="/pricing" className="hover:text-primary-rose transition-colors">Pricing</Link>
          <Link to="/contact" className="hover:text-primary-rose transition-colors">Contact</Link>
        </nav>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-deep-plum hover:text-primary-rose transition-colors">Log in</Link>
          <Link to="/signup" className="px-4 py-2 bg-primary-rose text-white text-sm font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm">Get Started</Link>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-deep-plum text-soft-blush py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-serif mb-4">SalonBook</h3>
            <p className="text-sm text-dusty-rose">Elevate your salon experience.</p>
          </div>
          <div>
            <h4 className="font-medium mb-4">Product</h4>
            <ul className="text-sm text-dusty-rose space-y-2">
              <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4">Support</h4>
            <ul className="text-sm text-dusty-rose space-y-2">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
