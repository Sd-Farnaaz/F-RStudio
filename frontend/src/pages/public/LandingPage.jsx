import PublicLayout from '../../components/layout/PublicLayout';
import { Link } from 'react-router-dom';
import { Calendar, Users, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-serif font-semibold text-deep-plum mb-6">
          Effortless Salon Management
        </h1>
        <p className="text-xl text-muted mb-10 max-w-2xl mx-auto">
          Streamline your bookings, delight your clients, and grow your beauty business with our premium all-in-one platform.
        </p>
        <Link to="/signup" className="inline-block px-8 py-4 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-md text-lg">
          Start Your Free Trial
        </Link>
      </div>

      <div className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-primary-rose" />
            </div>
            <h3 className="text-xl font-serif font-medium mb-3">Smart Booking</h3>
            <p className="text-muted">24/7 online scheduling that syncs seamlessly with your calendar.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-primary-rose" />
            </div>
            <h3 className="text-xl font-serif font-medium mb-3">Client Management</h3>
            <p className="text-muted">Keep track of preferences, history, and build lasting relationships.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary-rose" />
            </div>
            <h3 className="text-xl font-serif font-medium mb-3">Business Growth</h3>
            <p className="text-muted">Insights and tools to help you scale your salon efficiently.</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
