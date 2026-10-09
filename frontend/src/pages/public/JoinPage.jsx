import PublicLayout from '../../components/layout/PublicLayout';
import { Link } from 'react-router-dom';
import { Sparkles, Scissors } from 'lucide-react';

export default function JoinPage() {
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold text-deep-plum mb-4">
            How would you like to use SalonBook?
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Whether you're booking your next beauty appointment or managing your salon, we've got you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Customer */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border-color hover:shadow-md transition-all group flex flex-col">
            <div className="h-48 bg-rose-tint relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-rose/20 to-deep-plum/20 mix-blend-multiply z-10" />
              <img 
                src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Client relaxing" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <div className="w-12 h-12 bg-soft-blush rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-primary-rose" />
              </div>
              <h2 className="text-2xl font-serif font-medium text-deep-plum mb-3">Book Beauty Services</h2>
              <p className="text-muted flex-1 mb-8">
                Discover top-rated salons, manage your appointments, and easily rebook your favorite stylists all in one place.
              </p>
              <Link 
                to="/signup" 
                className="block text-center w-full py-3 bg-white text-primary-rose font-medium rounded-md border border-primary-rose hover:bg-rose-tint transition-all"
              >
                Continue as Customer
              </Link>
            </div>
          </div>

          {/* Card 2: Salon Owner */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border-color hover:shadow-md transition-all group flex flex-col">
            <div className="h-48 bg-rose-tint relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-rose/20 to-deep-plum/20 mix-blend-multiply z-10" />
              <img 
                src="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Salon owner working" 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <div className="w-12 h-12 bg-soft-blush rounded-full flex items-center justify-center mb-6">
                <Scissors className="w-6 h-6 text-primary-rose" />
              </div>
              <h2 className="text-2xl font-serif font-medium text-deep-plum mb-3">Grow Your Salon</h2>
              <p className="text-muted flex-1 mb-8">
                Streamline operations, manage your team, reduce no-shows, and deliver an exceptional booking experience to your clients.
              </p>
              <Link 
                to="/admin/register" 
                className="block text-center w-full py-3 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm"
              >
                Register Your Salon
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
