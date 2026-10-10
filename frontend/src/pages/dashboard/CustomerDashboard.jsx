import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { Calendar, MapPin, Clock, Scissors, User, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      // `getMyAppointments` should ideally return a PagedResult, let's assume `items` property holds the array
      const data = await appointmentService.getMyAppointments({ pageSize: 50 });
      setAppointments(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    
    try {
      setCancellingId(id);
      await appointmentService.cancelAppointment(id, "Cancelled by customer");
      fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Confirmed': return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Confirmed</span>;
      case 'Pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
      case 'Cancelled': return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Cancelled</span>;
      case 'Completed': return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Completed</span>;
      case 'NoShow': return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">No Show</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  const upcoming = appointments.filter(a => ['Confirmed', 'Pending'].includes(a.status) && new Date(a.startAtUtc) > new Date());
  const past = appointments.filter(a => !(['Confirmed', 'Pending'].includes(a.status) && new Date(a.startAtUtc) > new Date()));

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-12">
        <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-2">Hello, {user?.fullName?.split(' ')[0]}</h1>
        <p className="text-sm text-muted mb-8">Manage your upcoming salon visits and booking history.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {error}
          </div>
        )}

        <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border-color bg-ivory/50 flex justify-between items-center">
            <h2 className="font-medium text-deep-plum">Upcoming Bookings</h2>
            <Link to="/salons" className="text-sm font-medium text-primary-rose hover:underline">Book New</Link>
          </div>
          
          {loading ? (
            <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
          ) : upcoming.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary-rose" />
              </div>
              <h3 className="text-lg font-medium text-deep-plum mb-2">No upcoming appointments</h3>
              <p className="text-muted mb-6">You don't have any upcoming salon visits scheduled.</p>
              <Link to="/salons" className="inline-block px-6 py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm">
                Discover Salons
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border-color">
              {upcoming.map(apt => (
                <div key={apt.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:bg-soft-blush/30 transition-colors">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-rose-tint rounded-xl flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6 text-primary-rose" />
                    </div>
                    <div>
                      <h3 className="font-medium text-deep-plum text-lg mb-1">{apt.salonName}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
                        <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {new Date(apt.startAtUtc).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}</span>
                        <span className="flex items-center"><Scissors className="w-4 h-4 mr-1.5" /> {apt.serviceName}</span>
                        <span className="flex items-center"><User className="w-4 h-4 mr-1.5" /> {apt.staffName}</span>
                      </div>
                      {apt.customerNotes && (
                        <p className="text-xs text-muted mt-2 italic border-l-2 border-border-color pl-2">Note: {apt.customerNotes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto mt-2 md:mt-0">
                    <div className="flex flex-col items-start md:items-end flex-1 md:flex-none">
                      <span className="font-medium text-deep-plum mb-1">${apt.price.toFixed(2)}</span>
                      {getStatusBadge(apt.status)}
                    </div>
                    <button 
                      onClick={() => handleCancel(apt.id)}
                      disabled={cancellingId === apt.id}
                      className="px-4 py-2 text-sm font-medium text-danger border border-border-color rounded-md hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 flex items-center shrink-0"
                    >
                      {cancellingId === apt.id ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-color bg-ivory/50">
              <h2 className="font-medium text-deep-plum">Past & Cancelled Bookings</h2>
            </div>
            <div className="divide-y divide-border-color">
              {past.map(apt => (
                <div key={apt.id} className="p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center opacity-75">
                  <div>
                    <h3 className="font-medium text-deep-plum mb-1">{apt.salonName} - {apt.serviceName}</h3>
                    <div className="flex gap-4 text-sm text-muted">
                      <span>{new Date(apt.startAtUtc).toLocaleDateString()}</span>
                      <span>With {apt.staffName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted">${apt.price.toFixed(2)}</span>
                    {getStatusBadge(apt.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
