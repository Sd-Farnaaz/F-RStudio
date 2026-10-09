import PublicLayout from '../../components/layout/PublicLayout';
import { Link } from 'react-router-dom';
import { Calendar, Users, Sparkles, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-ivory">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left z-10">
            <span className="inline-block py-1 px-3 rounded-full bg-soft-blush text-primary-rose text-sm font-medium mb-6">
              The Premium Salon Experience
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-deep-plum mb-6 leading-tight">
              Elevate your beauty business.
            </h1>
            <p className="text-lg sm:text-xl text-muted mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Streamline your bookings, delight your clients, and effortlessly grow your salon with our all-in-one management platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/join" className="inline-flex items-center justify-center px-8 py-4 bg-primary-rose text-white font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-md text-base sm:text-lg">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link to="/salons" className="inline-flex items-center justify-center px-8 py-4 bg-white text-deep-plum border border-border-color font-medium rounded-lg hover:bg-soft-blush transition-all text-base sm:text-lg">
                Discover Salons
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:block h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
              alt="Salon styling" 
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24 border-t border-border-color">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-semibold text-deep-plum mb-4">Everything you need to succeed</h2>
            <p className="text-muted max-w-2xl mx-auto">Designed specifically for modern beauty professionals and their clients.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center p-6 rounded-2xl bg-ivory border border-border-color transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border-color">
                <Calendar className="w-8 h-8 text-primary-rose" />
              </div>
              <h3 className="text-xl font-serif font-medium mb-3 text-deep-plum">Smart Booking</h3>
              <p className="text-muted leading-relaxed">24/7 online scheduling that syncs seamlessly with your calendar and reduces no-shows.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-ivory border border-border-color transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border-color">
                <Users className="w-8 h-8 text-primary-rose" />
              </div>
              <h3 className="text-xl font-serif font-medium mb-3 text-deep-plum">Client Management</h3>
              <p className="text-muted leading-relaxed">Keep track of preferences, booking history, and build lasting relationships with every client.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-ivory border border-border-color transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border-color">
                <Sparkles className="w-8 h-8 text-primary-rose" />
              </div>
              <h3 className="text-xl font-serif font-medium mb-3 text-deep-plum">Business Growth</h3>
              <p className="text-muted leading-relaxed">Actionable insights, secure payments, and powerful tools to help you scale your salon efficiently.</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
