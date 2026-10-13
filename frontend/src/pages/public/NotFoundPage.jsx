import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { ArrowLeft, Compass, Store } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-20 bg-ivory">
        <div className="w-16 h-16 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose mb-6 shadow-2xs">
          <Compass className="w-8 h-8 opacity-75" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose block mb-2">
          Error 404
        </span>

        <h1 className="text-4xl sm:text-5xl font-serif font-medium text-deep-plum mb-3 tracking-tight">
          Page Not Found
        </h1>

        <p className="text-sm sm:text-base text-muted max-w-md mx-auto mb-8 leading-relaxed">
          The page or salon profile you're looking for might have been moved, renamed, or is temporarily unavailable.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-deep-plum border border-border-color text-xs sm:text-sm font-semibold rounded-2xl hover:bg-soft-blush transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Link>

          <Link
            to="/salons"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 transition-all shadow-2xs"
          >
            <Store className="w-4 h-4" />
            <span>Discover Salons</span>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
