import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { staffService } from '../../services/staffService';
import { appointmentService } from '../../services/appointmentService';
import { 
  Clock, Calendar as CalendarIcon, User, AlertCircle, TrendingUp, Users, 
  DollarSign, ChevronRight, CreditCard, ShieldCheck, CheckCircle2, Scissors, 
  RefreshCw, Sparkles, ArrowUpRight
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [staffCount, setStaffCount] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);
  
  const [summaryError, setSummaryError] = useState('');
  const [staffError, setStaffError] = useState('');
  const [appointmentsError, setAppointmentsError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setSummaryError('');
    setStaffError('');
    setAppointmentsError('');

    // 1. Fetch Comprehensive Dashboard Analytics
    try {
      const summary = await adminService.getDashboardSummary();
      setDashboardSummary(summary);
    } catch (err) {
      setSummaryError('Analytics summary unavailable');
      console.warn('Dashboard summary error:', err);
    }

    // 2. Fetch Active Staff Count
    try {
      const staffResp = await staffService.getStaffList();
      const staffList = staffResp.items || staffResp || [];
      setStaffCount(staffList.filter(s => s.isActive).length);
    } catch (err) {
      setStaffError('Staff count unavailable');
    }

    // 3. Fetch Today's Appointments & Pending Verification Queue
    try {
      // Get today's local date string YYYY-MM-DD
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      const aptsResp = await appointmentService.getAdminAppointments({ pageSize: 100 });
      const allApts = aptsResp.items || aptsResp || [];

      // Appointments scheduled for today
      const todays = allApts.filter(a => a.startAtUtc && a.startAtUtc.startsWith(todayStr));
      setTodayAppointments(todays);

      // Pending payment verification count
      const pendingVerify = allApts.filter(a => a.paymentStatus === 'Pending');
      setPendingPaymentCount(pendingVerify.length);
    } catch (err) {
      setAppointmentsError('Appointments queue unavailable');
    } finally {
      setLoading(false);
    }
  };

  const currency = dashboardSummary?.currencyCode || 'USD';
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : 'USD',
      maximumFractionDigits: 2
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12 space-y-8">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-rose">Salon Management Portal</span>
            <h1 className="text-3xl font-serif font-semibold text-deep-plum mt-1">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-sm text-muted mt-0.5">{user?.salonName || 'Salon Overview & Daily Operations'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-deep-plum bg-white border border-border-color rounded-lg hover:bg-ivory transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link
              to="/admin/calendar"
              className="px-4 py-2 text-xs font-semibold text-white bg-primary-rose rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5" /> View Calendar
            </Link>
          </div>
        </div>

        {/* Global Error Banner */}
        {summaryError && (
          <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              {summaryError} — Falling back to live appointment calculations.
            </span>
            <button onClick={fetchDashboardData} className="underline font-semibold hover:text-amber-900">Retry</button>
          </div>
        )}

        {/* 6 Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: Today's Appointments */}
          <Link to="/admin/appointments" className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/50 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Today's Visits</span>
              <div className="p-2 bg-soft-blush rounded-lg group-hover:scale-105 transition-transform">
                <CalendarIcon className="w-4 h-4 text-primary-rose" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif font-bold text-deep-plum">
                {loading ? '—' : todayAppointments.length}
              </span>
              <p className="text-[11px] text-muted mt-1 flex items-center">
                <span>View daily schedule</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </p>
            </div>
          </Link>

          {/* Card 2: Upcoming Bookings */}
          <Link to="/admin/appointments?status=Confirmed" className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/50 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Upcoming</span>
              <div className="p-2 bg-blue-50 rounded-lg group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif font-bold text-deep-plum">
                {loading ? '—' : (dashboardSummary?.upcomingAppointments ?? 0)}
              </span>
              <p className="text-[11px] text-muted mt-1 flex items-center">
                <span>Confirmed appointments</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </p>
            </div>
          </Link>

          {/* Card 3: Pending Payment Verification */}
          <Link to="/admin/appointments" className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/50 transition-all flex flex-col justify-between group relative overflow-hidden">
            {pendingPaymentCount > 0 && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full m-2"></div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Pay Verification</span>
              <div className="p-2 bg-amber-50 rounded-lg group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-serif font-bold ${pendingPaymentCount > 0 ? 'text-amber-700' : 'text-deep-plum'}`}>
                {loading ? '—' : pendingPaymentCount}
              </span>
              <p className="text-[11px] text-muted mt-1 flex items-center">
                <span>UTR verification queue</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </p>
            </div>
          </Link>

          {/* Card 4: Verified Revenue */}
          <div className="bg-white p-5 rounded-2xl border border-border-color shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Verified Revenue</span>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-serif font-bold text-deep-plum">
                {loading ? '—' : formatCurrency(dashboardSummary?.revenue?.totalVerifiedRevenue ?? 0)}
              </span>
              <p className="text-[11px] text-muted mt-1">Confirmed payments</p>
            </div>
          </div>

          {/* Card 5: Total Clients */}
          <Link to="/admin/customers" className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/50 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Clients</span>
              <div className="p-2 bg-purple-50 rounded-lg group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif font-bold text-deep-plum">
                {loading ? '—' : (dashboardSummary?.totalCustomers ?? 0)}
              </span>
              <p className="text-[11px] text-muted mt-1 flex items-center">
                <span>Directory & history</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </p>
            </div>
          </Link>

          {/* Card 6: Active Staff */}
          <Link to="/admin/staff" className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/50 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">Active Stylists</span>
              <div className="p-2 bg-rose-tint rounded-lg group-hover:scale-105 transition-transform">
                <User className="w-4 h-4 text-primary-rose" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-serif font-bold text-deep-plum">
                {loading ? '—' : (staffCount ?? 0)}
              </span>
              <p className="text-[11px] text-muted mt-1 flex items-center">
                <span>Staff & schedules</span>
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </p>
            </div>
          </Link>
        </div>

        {/* Financial & Advance Deposit Breakdown Bar */}
        {dashboardSummary?.revenue && (
          <div className="bg-white rounded-2xl border border-border-color p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-color pb-3">
              <div>
                <h3 className="font-serif font-medium text-deep-plum text-base">Financial Overview</h3>
                <p className="text-xs text-muted">Accurate accounting breakdown from actual appointment booking records</p>
              </div>
              <span className="text-xs font-mono font-medium px-2.5 py-1 bg-ivory rounded-full border border-border-color text-muted">
                Currency: {currency}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-1">
              <div className="p-3 bg-ivory/40 rounded-xl border border-border-color">
                <span className="text-[11px] font-semibold text-muted uppercase block">Total Booking Value</span>
                <span className="text-lg font-serif font-bold text-deep-plum block mt-1">
                  {formatCurrency(dashboardSummary.revenue.totalBookingValue)}
                </span>
                <span className="text-[10px] text-muted">All scheduled services</span>
              </div>

              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60">
                <span className="text-[11px] font-semibold text-amber-800 uppercase block">Advance Deposit Req.</span>
                <span className="text-lg font-serif font-bold text-amber-900 block mt-1">
                  {formatCurrency(dashboardSummary.revenue.totalAdvanceRequired)}
                </span>
                <span className="text-[10px] text-amber-700">Required upfront</span>
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/60">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Verified Collected</span>
                <span className="text-lg font-serif font-bold text-emerald-900 block mt-1">
                  {formatCurrency(dashboardSummary.revenue.totalVerifiedRevenue)}
                </span>
                <span className="text-[10px] text-emerald-700">Bank verified funds</span>
              </div>

              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200/60">
                <span className="text-[11px] font-semibold text-blue-800 uppercase block">Pending Verification</span>
                <span className="text-lg font-serif font-bold text-blue-900 block mt-1">
                  {formatCurrency(dashboardSummary.revenue.totalPendingRevenue)}
                </span>
                <span className="text-[10px] text-blue-700">UTR submitted by clients</span>
              </div>

              <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-200/60">
                <span className="text-[11px] font-semibold text-purple-800 uppercase block">Refunded Amount</span>
                <span className="text-lg font-serif font-bold text-purple-900 block mt-1">
                  {formatCurrency(dashboardSummary.revenue.totalRefundedAmount)}
                </span>
                <span className="text-[10px] text-purple-700">Returned on cancellation</span>
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Section: Today's Schedule & Popular Services */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Today's Schedule (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border-color shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-ivory/50">
              <div>
                <h2 className="font-serif font-medium text-deep-plum text-lg">Today's Schedule</h2>
                <p className="text-xs text-muted">Appointments booked for today's salon hours</p>
              </div>
              <Link 
                to="/admin/appointments" 
                className="text-xs font-semibold text-primary-rose hover:text-deep-plum transition-colors flex items-center gap-1"
              >
                All Appointments <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="flex-1">
              {loading ? (
                <div className="p-16 flex justify-center">
                  <div className="w-8 h-8 border-2 border-primary-rose border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 bg-rose-tint rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-7 h-7 text-primary-rose" />
                  </div>
                  <h3 className="text-base font-serif font-semibold text-deep-plum mb-1">No Appointments Today</h3>
                  <p className="text-xs text-muted max-w-sm">
                    There are no customer visits scheduled for today. Customers can book upcoming slots via your public salon page.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-color">
                  {todayAppointments.map(apt => (
                    <div key={apt.id} className="p-4 sm:px-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-soft-blush/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-14 text-center shrink-0">
                          <div className="text-base font-bold text-deep-plum leading-none">
                            {new Date(apt.startAtUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </div>
                          <span className="text-[10px] text-muted block mt-1 uppercase">Today</span>
                        </div>
                        <div className="w-px h-10 bg-border-color hidden sm:block"></div>
                        <div>
                          <h4 className="font-semibold text-deep-plum text-sm">{apt.customerName}</h4>
                          <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <span className="font-medium text-deep-plum">{apt.serviceName}</span>
                            <span>•</span>
                            <span>{apt.staffName}</span>
                            <span>•</span>
                            <span>${apt.price.toFixed(2)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Status Badges */}
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                            apt.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                            apt.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            apt.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {apt.status}
                          </span>

                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
                            apt.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                            apt.paymentStatus === 'Pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {apt.paymentStatus}
                          </span>
                        </div>

                        <Link 
                          to="/admin/appointments" 
                          className="text-xs font-semibold text-primary-rose hover:underline"
                        >
                          Manage →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Popular Services & Quick Navigation (1 col) */}
          <div className="space-y-6">
            
            {/* Popular Services */}
            <div className="bg-white rounded-2xl border border-border-color shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-color">
                <h3 className="font-serif font-semibold text-deep-plum text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-rose" /> Top Booked Services
                </h3>
                <Link to="/admin/services" className="text-xs font-medium text-primary-rose hover:underline">
                  Catalog
                </Link>
              </div>

              {!dashboardSummary?.popularServices || dashboardSummary.popularServices.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted">
                  <Scissors className="w-8 h-8 text-muted/30 mx-auto mb-2" />
                  <p>No service booking analytics yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardSummary.popularServices.slice(0, 5).map((s, idx) => (
                    <div key={s.serviceId || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-ivory/50 border border-border-color/60 text-xs">
                      <div>
                        <span className="font-semibold text-deep-plum block truncate max-w-[150px]">{s.serviceName}</span>
                        <span className="text-[10px] text-muted">{s.bookingCount} bookings</span>
                      </div>
                      <span className="font-bold text-deep-plum">
                        {formatCurrency(s.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Operational Shortcuts */}
            <div className="bg-white rounded-2xl border border-border-color shadow-sm p-6 space-y-3">
              <h3 className="font-serif font-semibold text-deep-plum text-sm mb-2">Salon Administration</h3>
              
              <Link 
                to="/admin/appointments"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-soft-blush/40 transition-colors text-xs font-medium text-deep-plum group"
              >
                <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-rose" /> Manage Appointments</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-primary-rose transition-colors" />
              </Link>

              <Link 
                to="/admin/customers"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-soft-blush/40 transition-colors text-xs font-medium text-deep-plum group"
              >
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary-rose" /> Customer Directory</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-primary-rose transition-colors" />
              </Link>

              <Link 
                to="/admin/settings/salon"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-soft-blush/40 transition-colors text-xs font-medium text-deep-plum group"
              >
                <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary-rose" /> UPI & Payment Settings</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-primary-rose transition-colors" />
              </Link>

              <Link 
                to="/admin/staff"
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-soft-blush/40 transition-colors text-xs font-medium text-deep-plum group"
              >
                <span className="flex items-center gap-2"><User className="w-4 h-4 text-primary-rose" /> Staff & Schedules</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted group-hover:text-primary-rose transition-colors" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
