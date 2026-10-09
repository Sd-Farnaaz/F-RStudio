import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory text-center px-6">
      <h1 className="text-6xl font-serif font-semibold text-primary-rose mb-4">404</h1>
      <h2 className="text-2xl font-serif text-deep-plum mb-6">Page not found</h2>
      <p className="text-muted mb-8 max-w-md">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
      <Link to="/" className="px-6 py-3 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm">
        Return Home
      </Link>
    </div>
  );
}
