import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { staffService } from '../../services/staffService';
import { appointmentService } from '../../services/appointmentService';
import { Clock, Calendar as CalendarIcon, User, AlertCircle, TrendingUp, Users, DollarSign, ChevronRight } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [staffCount, setStaffCount] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  
  const [revenueError, setRevenueError] = useState('');
  const [staffError, setStaffError] = useState('');
  const [appointmentsError, setAppointmentsError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // Fetch Revenue
      try {
        const rev = await adminService.getAnalyticsRevenue();
        setRevenueData(rev);
      } catch (err) {
        setRevenueError('Revenue data unavailable');
        console.error(err);
      }
      
      // Fetch Staff Count
      try {
        const staffResp = await staffService.getStaffList();
        const staffList = staffResp.items || staffResp || [];
        setStaffCount(staffList.filter(s => s.isActive).length);
      } catch (err) {
        setStaffError('Staff data unavailable');
        console.error(err);
      }

      // Fetch Today's Appointments via Calendar
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const cal = await appointmentService.getCalendar(startOfDay.toISOString(), endOfDay.toISOString());
        setTodayAppointments(cal.items || cal || []);
      } catch (err) {
        setAppointmentsError('Appointments unavailable');
        console.error(err);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-12">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Welcome, {user?.fullName?.split(' ')[0] || 'Admin'}</h1>
            <p className="text-sm text-muted">{user?.salonName || 'Your Salon Dashboard'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {/* Appointments Metric */}
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted">Today's Appointments</h3>
              <div className="p-2 bg-soft-blush rounded-md">
                <CalendarIcon className="w-4 h-4 text-primary-rose" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
              ) : appointmentsError ? (
                <p className="text-sm text-red-500">{appointmentsError}</p>
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-serif font-semibold text-deep-plum">
                    {todayAppointments.length}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Metric */}
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted">Total Revenue</h3>
              <div className="p-2 bg-green-50 rounded-md">
                <DollarSign className="w-4 h-4 text-success" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <div className="h-8 w-24 bg-gray-100 animate-pulse rounded"></div>
              ) : revenueError ? (
                <p className="text-sm text-red-500">{revenueError}</p>
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-serif font-semibold text-deep-plum">
                    {revenueData?.totalRealizedRevenue?.toLocaleString('en-US', { style: 'currency', currency: revenueData?.currencyCode || 'USD' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Active Staff Metric */}
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted">Active Staff</h3>
              <div className="p-2 bg-blue-50 rounded-md">
                <Users className="w-4 h-4 text-info" />
              </div>
            </div>
            <div className="mt-2">
              {loading ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
              ) : staffError ? (
                <p className="text-sm text-red-500">{staffError}</p>
              ) : (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-serif font-semibold text-deep-plum">
                    {staffCount !== null ? staffCount : 0}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-ivory/50">
            <h2 className="font-medium text-deep-plum">Today's Schedule</h2>
            <Link to="/admin/calendar" className="text-sm font-medium text-primary-rose hover:text-deep-plum transition-colors flex items-center">
              View Calendar <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary-rose border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-primary-rose" />
              </div>
              <h3 className="text-lg font-medium text-deep-plum mb-2">No Appointments Today</h3>
              <p className="text-muted max-w-md">
                Your schedule is clear for today.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-color">
              {todayAppointments.map((apt, idx) => (
                <div key={apt.id || idx} className="p-4 sm:px-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-soft-blush/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-center shrink-0">
                      <div className="text-lg font-medium text-deep-plum leading-none">
                        {new Date(apt.startAtUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="w-px h-10 bg-border-color hidden sm:block"></div>
                    <div>
                      <h4 className="font-medium text-deep-plum">{apt.customerName}</h4>
                      <p className="text-sm text-muted flex items-center mt-0.5">
                        <span className="truncate max-w-[150px] sm:max-w-xs">{apt.serviceName}</span>
                        <span className="mx-2 text-border-color">•</span>
                        <span>{apt.staffName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto mt-2 sm:mt-0 gap-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      apt.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                      apt.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                      apt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {apt.status}
                    </span>
                    <Link to="/admin/appointments" className="text-sm font-medium text-primary-rose hover:underline whitespace-nowrap">
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
