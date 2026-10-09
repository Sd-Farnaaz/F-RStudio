import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Calendar, MapPin } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-6">Hello, {user?.fullName?.split(' ')[0]}</h1>

        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border-color bg-ivory/50">
            <h2 className="font-medium text-deep-plum">Upcoming Bookings</h2>
          </div>
          
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary-rose" />
            </div>
            <h3 className="text-lg font-medium text-deep-plum mb-2">No upcoming appointments</h3>
            <p className="text-muted mb-6">You don't have any salon appointments scheduled at the moment.</p>
            <button className="px-6 py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm">
              Discover Salons
            </button>
          </div>
        </div>

        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-color bg-ivory/50">
            <h2 className="font-medium text-deep-plum">Favorite Salons</h2>
          </div>
          
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary-rose" />
            </div>
            <p className="text-muted">You haven't saved any favorite salons yet.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
