import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { appointmentService } from '../../services/appointmentService';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, RefreshCw, Scissors } from 'lucide-react';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { pageSize: 100 };
      if (statusFilter) params.status = statusFilter;
      // In a real app, dateFilter might map to startUtc/endUtc ranges. The backend currently only has standard pagination.
      
      const data = await appointmentService.getAdminAppointments(params);
      let items = data.items || data || [];
      
      if (dateFilter) {
        items = items.filter(a => a.startAtUtc.startsWith(dateFilter));
      }
      
      setAppointments(items);
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Change appointment status to ${newStatus}?`)) return;
    try {
      setUpdatingId(id);
      await appointmentService.updateAppointmentStatus(id, newStatus, 'Status updated by admin');
      fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Confirmed': return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Confirmed</span>;
      case 'Pending': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
      case 'Cancelled': return <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Cancelled</span>;
      case 'Completed': return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">Completed</span>;
      case 'NoShow': return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">No Show</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-deep-plum mb-2">Appointments</h1>
          <p className="text-muted">Manage your salon's bookings and daily schedule.</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-border-color mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-color rounded-md focus:ring-1 focus:ring-primary-rose outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="NoShow">No Show</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wide">Date</label>
            <input 
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-color rounded-md focus:ring-1 focus:ring-primary-rose outline-none"
            />
          </div>
          {(statusFilter || dateFilter) && (
            <button 
              onClick={() => { setStatusFilter(''); setDateFilter(''); }}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-deep-plum border border-transparent"
            >
              Clear Filters
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {error}
          </div>
        )}

        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-deep-plum mb-2">No appointments found</h3>
              <p className="text-muted">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-ivory border-b border-border-color text-muted font-medium">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {appointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-soft-blush/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-deep-plum">{apt.customerName}</div>
                        <div className="text-xs text-muted">{apt.customerEmail}</div>
                        {apt.customerPhone && <div className="text-xs text-muted">{apt.customerPhone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-deep-plum">{apt.serviceName}</div>
                        <div className="text-xs text-muted">${apt.price.toFixed(2)} • {apt.durationMinutes} min</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-deep-plum">
                          <User className="w-4 h-4 mr-1.5 text-muted" />
                          {apt.staffName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-deep-plum">{new Date(apt.startAtUtc).toLocaleDateString()}</div>
                        <div className="text-xs text-muted flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(apt.startAtUtc).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(apt.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {updatingId === apt.id ? (
                          <RefreshCw className="w-5 h-5 text-muted animate-spin inline-block" />
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {['Pending', 'Confirmed'].includes(apt.status) && (
                              <>
                                <button 
                                  onClick={() => handleStatusChange(apt.id, 'Completed')}
                                  title="Mark Completed"
                                  className="p-1.5 text-success hover:bg-green-50 rounded-md transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(apt.id, 'Cancelled')}
                                  title="Cancel"
                                  className="p-1.5 text-danger hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
