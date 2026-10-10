import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { appointmentService } from '../../services/appointmentService';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';

export default function AdminCalendarPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Date state (default to today)
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchCalendar();
  }, [currentDate]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Calculate start and end of the current day in UTC.
      // This is simplified; ideally we calculate the 00:00 local time of the selected date and convert to UTC.
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const data = await appointmentService.getCalendar(startOfDay.toISOString(), endOfDay.toISOString());
      setAppointments(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return 'bg-green-100 border-green-300 text-green-900';
      case 'Completed': return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'Pending': return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'Cancelled': return 'bg-red-100 border-red-300 text-red-900 line-through opacity-70';
      case 'NoShow': return 'bg-gray-100 border-gray-300 text-gray-900 opacity-80';
      default: return 'bg-white border-border-color text-deep-plum';
    }
  };

  // Create an hour-based grid for the Day View
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-12 flex flex-col h-full">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-deep-plum mb-2">Calendar</h1>
            <p className="text-muted">View your daily schedule.</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={goToToday} className="px-4 py-2 text-sm font-medium text-primary-rose bg-rose-tint rounded-md hover:bg-rose-tint/80 transition-colors">
              Today
            </button>
            <div className="flex items-center bg-white border border-border-color rounded-md overflow-hidden shadow-sm">
              <button onClick={prevDay} className="p-2 text-muted hover:text-deep-plum hover:bg-soft-blush transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 text-sm font-medium text-deep-plum min-w-[140px] text-center border-x border-border-color">
                {currentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <button onClick={nextDay} className="p-2 text-muted hover:text-deep-plum hover:bg-soft-blush transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="flex-1 bg-white border border-border-color rounded-xl shadow-sm overflow-hidden flex flex-col relative min-h-[600px]">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary-rose animate-spin" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="relative border-t border-border-color">
              {hours.map(hour => (
                <div key={hour} className="flex border-b border-border-color h-24">
                  <div className="w-20 shrink-0 text-right pr-4 py-2 text-sm font-medium text-muted border-r border-border-color">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  <div className="flex-1 relative">
                    {/* Render appointments that fall in this hour */}
                    {appointments.filter(a => new Date(a.startAtUtc).getHours() === hour).map(apt => {
                      const start = new Date(apt.startAtUtc);
                      const end = new Date(apt.endAtUtc);
                      const durationMins = (end - start) / 60000;
                      const topOffset = (start.getMinutes() / 60) * 100;
                      const height = Math.max((durationMins / 60) * 100, 25); // At least 25% to be clickable

                      return (
                        <div 
                          key={apt.id} 
                          className={`absolute left-2 right-2 border rounded-md shadow-sm p-2 overflow-hidden ${getStatusColor(apt.status)}`}
                          style={{ top: `${topOffset}%`, height: `${height}%`, zIndex: 5 }}
                        >
                          <div className="text-xs font-semibold mb-0.5 leading-tight">{apt.customerName}</div>
                          <div className="text-[10px] leading-tight truncate">{apt.serviceName} • {apt.staffName}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {!loading && appointments.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <CalendarIcon className="w-16 h-16 text-border-color mb-4" />
                <p className="text-muted font-medium text-lg">No appointments today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
