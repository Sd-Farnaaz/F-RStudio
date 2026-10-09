import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { staffService } from '../../services/staffService';
import { Clock, Calendar as CalendarIcon, User, AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState(null);
  const [staffCount, setStaffCount] = useState(null);
  const [revenueError, setRevenueError] = useState('');
  const [staffError, setStaffError] = useState('');

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

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
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
              <p className="text-sm italic text-muted">Backend endpoint not available yet</p>
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
                <p className="text-3xl font-serif font-semibold text-deep-plum">{staffCount}</p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-ivory/50">
            <h2 className="font-medium text-deep-plum">Today's Schedule</h2>
          </div>
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-primary-rose" />
            </div>
            <h3 className="text-lg font-medium text-deep-plum mb-2">Appointments Not Yet Available</h3>
            <p className="text-muted max-w-md">
              The backend API for managing bookings and appointments is not yet implemented. This section will display real appointments once the booking feature is released.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
