import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { paymentService } from '../../services/paymentService';
import { publicService } from '../../services/publicService';
import { 
  Calendar, MapPin, Clock, Scissors, User, XCircle, AlertCircle, 
  RefreshCw, CreditCard, QrCode, CheckCircle2, Copy, Check, ExternalLink, 
  X, Compass, Sparkles, ChevronRight, Search, ShieldCheck, DollarSign, 
  Phone, Mail, Info, FileText, ArrowRight, Store
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Data State
  const [appointments, setAppointments] = useState([]);
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salonsLoading, setSalonsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [appointmentFilter, setAppointmentFilter] = useState('all'); // 'all' | 'upcoming' | 'completed' | 'cancelled'
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [salonSearch, setSalonSearch] = useState('');

  // Cancellation State
  const [cancellingApt, setCancellingApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Payment Proof Modal State
  const [activePaymentApt, setActivePaymentApt] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentTransactionReference: '',
    paymentMethod: 'UPI',
    paymentProofUrl: '',
    amountPaid: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSubmitError, setPaymentSubmitError] = useState('');
  const [paymentSubmitSuccess, setPaymentSubmitSuccess] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Appointment Details Modal State
  const [activeDetailsApt, setActiveDetailsApt] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchAppointments();
    if (activeTab === 'salons' || activeTab === 'overview') {
      fetchSalons();
    }
  }, [activeTab]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await appointmentService.getMyAppointments({ pageSize: 100 });
      setAppointments(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalons = async () => {
    try {
      setSalonsLoading(true);
      const data = await publicService.getSalons({ pageSize: 12 });
      setSalons(data.items || data || []);
    } catch (err) {
      console.warn('Failed to load salons list:', err);
    } finally {
      setSalonsLoading(false);
    }
  };

  const handleTabChange = (tabName) => {
    setSearchParams(tabName === 'overview' ? {} : { tab: tabName });
  };

  // Open Details Modal
  const openDetailsModal = async (apt) => {
    setActiveDetailsApt(apt);
    try {
      setLoadingDetails(true);
      const fresh = await appointmentService.getAppointment(apt.id);
      setActiveDetailsApt(fresh);
    } catch (err) {
      console.warn('Failed to fetch full appointment details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Cancellation Handlers
  const openCancelModal = (apt) => {
    setCancellingApt(apt);
    setCancelReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancellingApt) return;
    
    setCancellingLoading(true);
    setCancelError('');

    try {
      const updated = await appointmentService.cancelAppointment(
        cancellingApt.id, 
        cancelReason.trim() || 'Cancelled by customer'
      );
      
      // Update locally
      setAppointments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      if (activeDetailsApt?.id === updated.id) {
        setActiveDetailsApt(updated);
      }
      setCancellingApt(null);
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancellingLoading(false);
    }
  };

  // Payment Proof Modal Handlers
  const openPaymentModal = (apt) => {
    setActivePaymentApt(apt);
    const suggestedAmount = apt.advanceAmountRequired > 0 
      ? Math.max(0, apt.advanceAmountRequired - (apt.amountPaid || 0))
      : apt.price;

    setPaymentForm({
      paymentTransactionReference: apt.paymentTransactionReference || '',
      paymentMethod: apt.paymentMethod || 'UPI',
      paymentProofUrl: apt.paymentProofUrl || '',
      amountPaid: suggestedAmount > 0 ? suggestedAmount.toString() : ''
    });
    setPaymentSubmitError('');
    setPaymentSubmitSuccess('');
    setCopiedUpi(false);
  };

  const closePaymentModal = () => {
    setActivePaymentApt(null);
    setPaymentSubmitError('');
    setPaymentSubmitSuccess('');
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!activePaymentApt) return;

    if (!paymentForm.paymentTransactionReference || paymentForm.paymentTransactionReference.trim().length < 3) {
      setPaymentSubmitError('Please enter a valid transaction reference / UTR (at least 3 characters).');
      return;
    }

    const amt = parseFloat(paymentForm.amountPaid);
    if (isNaN(amt) || amt <= 0) {
      setPaymentSubmitError('Amount paid must be greater than 0.');
      return;
    }

    if (amt > activePaymentApt.price) {
      setPaymentSubmitError(`Submitted amount cannot exceed the total price of $${activePaymentApt.price}.`);
      return;
    }

    setSubmittingPayment(true);
    setPaymentSubmitError('');
    setPaymentSubmitSuccess('');

    try {
      const payload = {
        paymentTransactionReference: paymentForm.paymentTransactionReference.trim(),
        paymentMethod: paymentForm.paymentMethod?.trim() || 'UPI',
        paymentProofUrl: paymentForm.paymentProofUrl?.trim() || null,
        amountPaid: amt
      };

      const updated = await paymentService.submitPaymentProof(activePaymentApt.id, payload);
      setPaymentSubmitSuccess('Payment proof submitted successfully! Verification is pending from salon staff.');
      
      // Update local state immediately
      setAppointments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      if (activeDetailsApt?.id === updated.id) {
        setActiveDetailsApt(updated);
      }

      setTimeout(() => {
        closePaymentModal();
      }, 1800);
    } catch (err) {
      if (err.status === 409) {
        setPaymentSubmitError(err.message || 'This transaction reference has already been submitted for another booking.');
      } else {
        setPaymentSubmitError(err.message || 'Failed to submit payment proof.');
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Helper Badges
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Confirmed': return <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Confirmed</span>;
      case 'Pending': return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">Pending</span>;
      case 'Cancelled': return <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Cancelled</span>;
      case 'Completed': return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Completed</span>;
      case 'NoShow': return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">No Show</span>;
      default: return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">{status}</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch(status) {
      case 'Paid': return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
      case 'PartiallyPaid': return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><CreditCard className="w-3 h-3" /> Partially Paid</span>;
      case 'Pending': return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Payment Pending</span>;
      case 'Failed': return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'Refunded': return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-semibold rounded-full w-fit">Refunded</span>;
      case 'NotRequired': return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-full w-fit">No Advance</span>;
      default: return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-full w-fit">{status}</span>;
    }
  };

  const isTerminalStatus = (status) => ['Cancelled', 'Completed', 'NoShow'].includes(status);

  // Derived Real Data Metrics
  const now = new Date();
  const upcomingAppointments = appointments.filter(a => !isTerminalStatus(a.status) && new Date(a.startAtUtc) > now);
  const completedAppointments = appointments.filter(a => a.status === 'Completed');
  const cancelledAppointments = appointments.filter(a => a.status === 'Cancelled');
  const totalPaidSum = appointments.reduce((sum, a) => sum + (Number(a.amountPaid) || 0), 0);
  const nextVisit = upcomingAppointments.sort((a, b) => new Date(a.startAtUtc) - new Date(b.startAtUtc))[0];

  // Filtering for Appointments Tab
  const filteredAppointments = appointments.filter(a => {
    if (appointmentFilter === 'upcoming') {
      if (isTerminalStatus(a.status) || new Date(a.startAtUtc) <= now) return false;
    } else if (appointmentFilter === 'completed') {
      if (a.status !== 'Completed') return false;
    } else if (appointmentFilter === 'cancelled') {
      if (a.status !== 'Cancelled') return false;
    }

    if (appointmentSearch.trim()) {
      const q = appointmentSearch.toLowerCase();
      const matchSalon = a.salonName?.toLowerCase().includes(q);
      const matchService = a.serviceName?.toLowerCase().includes(q);
      const matchStaff = a.staffName?.toLowerCase().includes(q);
      if (!matchSalon && !matchService && !matchStaff) return false;
    }

    return true;
  });

  // Filtered Salons for Discovery Tab
  const filteredSalons = salons.filter(s => {
    if (!salonSearch.trim()) return true;
    const q = salonSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || 
           s.businessType?.toLowerCase().includes(q) || 
           s.city?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-16 space-y-8">
        
        {/* Personalized Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-tint text-primary-rose flex items-center justify-center font-serif font-bold text-2xl shadow-xs">
              {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-rose">Client Portal</span>
                {user?.isEmailVerified && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Account
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-serif font-semibold text-deep-plum mt-0.5">
                Welcome, {user?.fullName || 'Valued Client'}
              </h1>
              <p className="text-sm text-muted">
                {user?.email} • Member since {user?.createdAtUtc ? new Date(user.createdAtUtc).toLocaleDateString() : 'recent'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTabChange('salons')}
              className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" /> Book Treatment
            </button>
            <button
              onClick={fetchAppointments}
              disabled={loading}
              className="p-2 border border-border-color bg-white text-muted hover:text-deep-plum rounded-lg transition-colors"
              title="Refresh Appointments"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              {error}
            </span>
            <button onClick={fetchAppointments} className="text-xs font-semibold underline hover:text-red-900">Retry</button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-border-color gap-2 sm:gap-6 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <Sparkles className="w-4 h-4" /> Overview
          </button>
          
          <button
            type="button"
            onClick={() => handleTabChange('appointments')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'appointments'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <Calendar className="w-4 h-4" /> My Appointments
            {upcomingAppointments.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[10px] bg-rose-tint text-primary-rose font-bold rounded-full">
                {upcomingAppointments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('payments')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'payments'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Payments & Advance
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('salons')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'salons'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <Compass className="w-4 h-4" /> Discover Salons
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('account')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'account'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <User className="w-4 h-4" /> Account Profile
          </button>
        </div>

        {/* ----------------- TAB 1: OVERVIEW ----------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            {/* 4 Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => { setAppointmentFilter('upcoming'); handleTabChange('appointments'); }}
                className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/40 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Upcoming Visits</span>
                  <div className="p-2 bg-soft-blush rounded-lg">
                    <Calendar className="w-4 h-4 text-primary-rose" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-serif font-bold text-deep-plum">
                    {loading ? '—' : upcomingAppointments.length}
                  </span>
                  <p className="text-[11px] text-muted mt-1 flex items-center">
                    <span>Active bookings</span> <ChevronRight className="w-3 h-3 ml-0.5" />
                  </p>
                </div>
              </div>

              <div 
                onClick={() => { setAppointmentFilter('completed'); handleTabChange('appointments'); }}
                className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/40 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Completed Treatments</span>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-serif font-bold text-deep-plum">
                    {loading ? '—' : completedAppointments.length}
                  </span>
                  <p className="text-[11px] text-muted mt-1 flex items-center">
                    <span>Past visits</span> <ChevronRight className="w-3 h-3 ml-0.5" />
                  </p>
                </div>
              </div>

              <div 
                onClick={() => { setAppointmentFilter('cancelled'); handleTabChange('appointments'); }}
                className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/40 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Cancelled</span>
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-3xl font-serif font-bold text-deep-plum">
                    {loading ? '—' : cancelledAppointments.length}
                  </span>
                  <p className="text-[11px] text-muted mt-1 flex items-center">
                    <span>Cancelled records</span> <ChevronRight className="w-3 h-3 ml-0.5" />
                  </p>
                </div>
              </div>

              <div 
                onClick={() => handleTabChange('payments')}
                className="bg-white p-5 rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/40 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">Deposits Paid</span>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-serif font-bold text-deep-plum">
                    {loading ? '—' : `$${totalPaidSum.toFixed(2)}`}
                  </span>
                  <p className="text-[11px] text-muted mt-1 flex items-center">
                    <span>Verified transfers</span> <ChevronRight className="w-3 h-3 ml-0.5" />
                  </p>
                </div>
              </div>
            </div>

            {/* Spotlight Card: Next Upcoming Visit */}
            <div className="bg-white rounded-2xl border border-border-color shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-ivory/60 border-b border-border-color flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-rose" />
                  <h3 className="font-serif font-semibold text-deep-plum text-base">Next Upcoming Appointment</h3>
                </div>
                {nextVisit && getStatusBadge(nextVisit.status)}
              </div>

              {loading ? (
                <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
              ) : !nextVisit ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-rose-tint rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8 text-primary-rose" />
                  </div>
                  <h4 className="font-serif font-semibold text-deep-plum text-lg mb-1">No Upcoming Appointments</h4>
                  <p className="text-xs text-muted max-w-md mx-auto mb-6">
                    You don't have any upcoming salon visits scheduled at the moment. Browse salons and reserve your next treatment.
                  </p>
                  <button
                    onClick={() => handleTabChange('salons')}
                    className="px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm"
                  >
                    Discover Salons & Book Now
                  </button>
                </div>
              ) : (
                <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-rose">
                        {new Date(nextVisit.startAtUtc).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <h4 className="text-2xl font-serif font-bold text-deep-plum mt-0.5">
                        {nextVisit.serviceName} at {nextVisit.salonName}
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1.5 text-primary-rose/70" />
                        {new Date(nextVisit.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({nextVisit.durationMinutes} min)
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1.5 text-primary-rose/70" />
                        Stylist: {nextVisit.staffName}
                      </span>
                      <span className="flex items-center font-medium text-deep-plum">
                        Total: ${nextVisit.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Payment Status Bar */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-muted">Payment:</span>
                      {getPaymentBadge(nextVisit.paymentStatus)}
                      {nextVisit.advanceAmountRequired > 0 && (
                        <span className="text-xs text-amber-800 font-medium">
                          (Advance Required: ${nextVisit.advanceAmountRequired.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Spotlight Actions */}
                  <div className="flex flex-wrap gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-border-color">
                    {nextVisit.paymentStatus !== 'Paid' && !isTerminalStatus(nextVisit.status) && (
                      <button
                        onClick={() => openPaymentModal(nextVisit)}
                        className="px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" /> Pay via UPI / Submit Proof
                      </button>
                    )}
                    <button
                      onClick={() => openDetailsModal(nextVisit)}
                      className="px-4 py-2.5 bg-white border border-border-color text-deep-plum text-xs font-semibold rounded-lg hover:bg-ivory transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openCancelModal(nextVisit)}
                      className="px-4 py-2.5 border border-border-color text-danger text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2-Column: Recent Bookings & Recommended Salons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Bookings List */}
              <div className="bg-white rounded-2xl border border-border-color shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-color">
                  <h4 className="font-serif font-semibold text-deep-plum text-base">Recent Bookings</h4>
                  <button 
                    onClick={() => handleTabChange('appointments')}
                    className="text-xs font-semibold text-primary-rose hover:underline"
                  >
                    View All ({appointments.length})
                  </button>
                </div>

                {appointments.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">No booking history recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.slice(0, 3).map(apt => (
                      <div 
                        key={apt.id} 
                        onClick={() => openDetailsModal(apt)}
                        className="p-3.5 bg-ivory/40 rounded-xl border border-border-color/70 hover:bg-soft-blush/30 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-deep-plum text-sm">{apt.salonName}</div>
                          <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                            <span>{apt.serviceName}</span>
                            <span>•</span>
                            <span>{new Date(apt.startAtUtc).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(apt.status)}
                          <ChevronRight className="w-4 h-4 text-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Salons Discovery Quick Spotlight */}
              <div className="bg-white rounded-2xl border border-border-color shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-color">
                  <h4 className="font-serif font-semibold text-deep-plum text-base flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary-rose" /> Salons on SalonBook
                  </h4>
                  <button 
                    onClick={() => handleTabChange('salons')}
                    className="text-xs font-semibold text-primary-rose hover:underline"
                  >
                    Explore All
                  </button>
                </div>

                {salons.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">Loading available salons...</p>
                ) : (
                  <div className="space-y-3">
                    {salons.slice(0, 3).map(s => (
                      <Link 
                        key={s.id || s.slug}
                        to={`/salons/${s.slug}`}
                        className="p-3.5 bg-ivory/40 rounded-xl border border-border-color/70 hover:bg-soft-blush/30 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-semibold text-deep-plum text-sm group-hover:text-primary-rose transition-colors">
                            {s.name}
                          </div>
                          <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-primary-rose/70" />
                            <span>{[s.city, s.state].filter(Boolean).join(', ') || 'Online Booking'}</span>
                            <span>•</span>
                            <span className="font-medium">{s.businessType || 'Salon'}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-primary-rose group-hover:translate-x-1 transition-transform">
                          Book →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: MY APPOINTMENTS ----------------- */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border-color shadow-sm flex flex-wrap gap-4 items-center justify-between">
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {[
                  { id: 'all', label: 'All Bookings' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setAppointmentFilter(f.id)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      appointmentFilter === f.id
                        ? 'bg-primary-rose text-white shadow-xs'
                        : 'bg-ivory text-muted hover:text-deep-plum'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  placeholder="Search salon, service, staff..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none"
                />
              </div>
            </div>

            {/* Appointments List */}
            <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-16 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
              ) : filteredAppointments.length === 0 ? (
                <div className="p-16 text-center">
                  <Calendar className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                  <h4 className="font-serif font-semibold text-deep-plum text-base mb-1">No appointments found</h4>
                  <p className="text-xs text-muted mb-4">No records match your selected filter criteria.</p>
                  <button 
                    onClick={() => { setAppointmentFilter('all'); setAppointmentSearch(''); }}
                    className="text-xs font-semibold text-primary-rose underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border-color">
                  {filteredAppointments.map(apt => {
                    const isUpcoming = !isTerminalStatus(apt.status) && new Date(apt.startAtUtc) > now;
                    const canPay = !isTerminalStatus(apt.status) && apt.paymentStatus !== 'Paid';

                    return (
                      <div key={apt.id} className="p-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center hover:bg-soft-blush/20 transition-colors">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-rose-tint rounded-xl flex items-center justify-center shrink-0">
                            <Scissors className="w-6 h-6 text-primary-rose" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-serif font-semibold text-deep-plum text-lg">{apt.salonName}</h3>
                              {getStatusBadge(apt.status)}
                              {getPaymentBadge(apt.paymentStatus)}
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                              <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-primary-rose/70" /> {new Date(apt.startAtUtc).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}</span>
                              <span className="flex items-center"><Scissors className="w-4 h-4 mr-1 text-primary-rose/70" /> {apt.serviceName} ({apt.durationMinutes} min)</span>
                              <span className="flex items-center"><User className="w-4 h-4 mr-1 text-primary-rose/70" /> {apt.staffName}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted pt-1">
                              <span>Total: <strong className="text-deep-plum">${apt.price.toFixed(2)}</strong></span>
                              {apt.advanceAmountRequired > 0 && (
                                <span>Advance Req: <strong className="text-amber-800">${apt.advanceAmountRequired.toFixed(2)}</strong></span>
                              )}
                              <span>Paid: <strong className="text-emerald-700">${(apt.amountPaid || 0).toFixed(2)}</strong></span>
                              {apt.paymentTransactionReference && (
                                <span className="font-mono bg-ivory px-1.5 py-0.5 rounded border border-border-color">UTR: {apt.paymentTransactionReference}</span>
                              )}
                            </div>

                            {apt.cancellationReason && (
                              <p className="text-xs text-danger/80 italic mt-1">Reason: {apt.cancellationReason}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-border-color">
                          {canPay && (
                            <button
                              onClick={() => openPaymentModal(apt)}
                              className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Pay Advance
                            </button>
                          )}

                          <button
                            onClick={() => openDetailsModal(apt)}
                            className="px-3.5 py-2 bg-white border border-border-color text-deep-plum text-xs font-medium rounded-lg hover:bg-ivory transition-colors"
                          >
                            Details
                          </button>

                          {!isTerminalStatus(apt.status) && (
                            <button
                              onClick={() => openCancelModal(apt)}
                              className="px-3.5 py-2 border border-border-color text-danger text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: PAYMENTS & ADVANCE ----------------- */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Advance Deposit Explanation Banner */}
            <div className="p-5 bg-ivory/60 rounded-2xl border border-border-color flex items-start gap-3">
              <Info className="w-5 h-5 text-primary-rose shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-muted leading-relaxed">
                <span className="font-semibold text-deep-plum text-sm block">How Advance Deposits Work</span>
                <p>
                  Salons may require an advance deposit to secure your appointment slot. You can transfer funds directly to the salon's verified UPI ID or scan their QR code, then submit your 12-digit UTR transaction reference number. Salon staff will verify the payment before your treatment.
                </p>
              </div>
            </div>

            {/* Payments List */}
            <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-ivory/50 border-b border-border-color flex items-center justify-between">
                <h3 className="font-serif font-semibold text-deep-plum text-base">Booking Payment Ledger</h3>
                <span className="text-xs text-muted font-medium">Total Paid: ${totalPaidSum.toFixed(2)}</span>
              </div>

              {appointments.length === 0 ? (
                <div className="p-16 text-center text-muted text-xs">No appointment payment records found.</div>
              ) : (
                <div className="divide-y divide-border-color">
                  {appointments.map(apt => {
                    const balanceDue = Math.max(0, apt.price - (apt.amountPaid || 0));

                    return (
                      <div key={apt.id} className="p-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center hover:bg-soft-blush/20 transition-colors">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-deep-plum text-base">{apt.salonName} — {apt.serviceName}</h4>
                            {getPaymentBadge(apt.paymentStatus)}
                          </div>

                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                            <span>Service Total: <strong className="text-deep-plum">${apt.price.toFixed(2)}</strong></span>
                            <span>Advance Required: <strong className="text-amber-800">${apt.advanceAmountRequired.toFixed(2)}</strong></span>
                            <span>Amount Paid: <strong className="text-emerald-700">${(apt.amountPaid || 0).toFixed(2)}</strong></span>
                            <span>Balance Due: <strong className="text-deep-plum">${balanceDue.toFixed(2)}</strong></span>
                          </div>

                          {/* UPI & Verification Sub-box */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted pt-1">
                            {apt.salonUpiId && (
                              <span className="font-mono bg-ivory px-2 py-0.5 rounded border border-border-color">
                                Salon UPI: {apt.salonUpiId}
                              </span>
                            )}
                            {apt.paymentTransactionReference && (
                              <span className="font-mono bg-ivory px-2 py-0.5 rounded border border-border-color">
                                UTR: {apt.paymentTransactionReference}
                              </span>
                            )}
                            {apt.paymentVerifiedAtUtc && (
                              <span className="text-emerald-700 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified on {new Date(apt.paymentVerifiedAtUtc).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Payment Actions */}
                        <div className="flex items-center gap-3 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-border-color">
                          {apt.paymentStatus !== 'Paid' && !isTerminalStatus(apt.status) && (
                            <button
                              onClick={() => openPaymentModal(apt)}
                              className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {apt.paymentTransactionReference ? 'Update Proof' : 'Submit UPI Proof'}
                            </button>
                          )}
                          <button
                            onClick={() => openDetailsModal(apt)}
                            className="px-3.5 py-2 bg-white border border-border-color text-deep-plum text-xs font-medium rounded-lg hover:bg-ivory transition-colors"
                          >
                            Receipt Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: DISCOVER SALONS ----------------- */}
        {activeTab === 'salons' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Salon Search */}
            <div className="bg-white p-4 rounded-2xl border border-border-color shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={salonSearch}
                  onChange={(e) => setSalonSearch(e.target.value)}
                  placeholder="Search salons by name, business type, or city..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none"
                />
              </div>
              <span className="text-xs text-muted font-medium">
                {filteredSalons.length} registered salons available
              </span>
            </div>

            {/* Salons Grid */}
            {salonsLoading ? (
              <div className="p-16 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
            ) : filteredSalons.length === 0 ? (
              <div className="p-16 bg-white rounded-2xl border border-border-color text-center">
                <Store className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                <h4 className="font-serif font-semibold text-deep-plum text-base mb-1">No Salons Found</h4>
                <p className="text-xs text-muted">Try clearing your search query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSalons.map(salon => (
                  <div 
                    key={salon.id || salon.slug}
                    className="bg-white rounded-2xl border border-border-color shadow-sm hover:border-primary-rose/50 transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-6 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 bg-rose-tint text-primary-rose font-semibold text-[10px] rounded-full uppercase tracking-wider">
                          {salon.businessType || 'Salon'}
                        </span>
                        {salon.timeZone && (
                          <span className="text-[10px] text-muted font-mono">{salon.timeZone}</span>
                        )}
                      </div>

                      <h3 className="font-serif font-bold text-deep-plum text-xl">
                        {salon.name}
                      </h3>

                      <p className="text-xs text-muted line-clamp-2">
                        {salon.description || 'Premium salon providing luxury hair, skin, and wellness treatments.'}
                      </p>

                      <div className="pt-2 border-t border-border-color/60 space-y-1.5 text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary-rose/70 shrink-0" />
                          <span className="truncate">{[salon.addressLine, salon.city, salon.state].filter(Boolean).join(', ') || 'Online Booking'}</span>
                        </div>
                        {salon.phoneNumber && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-primary-rose/70 shrink-0" />
                            <span>{salon.phoneNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-ivory/50 border-t border-border-color flex justify-between items-center">
                      <span className="text-xs text-muted font-medium">Verified Vendor</span>
                      <Link
                        to={`/salons/${salon.slug}`}
                        className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1"
                      >
                        Book Appointment <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB 5: ACCOUNT PROFILE ----------------- */}
        {activeTab === 'account' && (
          <div className="space-y-6 animate-in fade-in max-w-3xl">
            {/* Account Details Card */}
            <div className="bg-white rounded-2xl border border-border-color shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border-color">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-tint text-primary-rose flex items-center justify-center font-serif font-bold text-2xl">
                    {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-deep-plum text-xl">{user?.fullName || 'Client'}</h3>
                    <p className="text-xs font-mono text-muted">{user?.email}</p>
                    <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Active Customer Account
                    </span>
                  </div>
                </div>
              </div>

              {/* Supported User Info Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-ivory/50 rounded-xl border border-border-color">
                  <span className="text-muted block mb-1">Customer ID</span>
                  <strong className="text-deep-plum font-mono text-sm">#{user?.id}</strong>
                </div>

                <div className="p-4 bg-ivory/50 rounded-xl border border-border-color">
                  <span className="text-muted block mb-1">Global Platform Role</span>
                  <strong className="text-deep-plum text-sm">{user?.role || 'User'}</strong>
                </div>

                <div className="p-4 bg-ivory/50 rounded-xl border border-border-color">
                  <span className="text-muted block mb-1">Email Verification</span>
                  <strong className="text-emerald-700 text-sm flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> {user?.isEmailVerified ? 'Verified' : 'Unverified'}
                  </strong>
                </div>

                <div className="p-4 bg-ivory/50 rounded-xl border border-border-color">
                  <span className="text-muted block mb-1">Account Created</span>
                  <strong className="text-deep-plum text-sm">
                    {user?.createdAtUtc ? new Date(user.createdAtUtc).toLocaleDateString() : 'Active Member'}
                  </strong>
                </div>
              </div>

              {/* Account Note */}
              <div className="p-4 bg-soft-blush/30 rounded-xl border border-border-color text-xs text-muted flex items-start gap-2.5">
                <Info className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Your customer account is a platform-wide identity on SalonBook. It allows you to schedule visits, track appointments, and submit advance payment proofs across all registered salons.
                </p>
              </div>

              {/* Logout Action */}
              <div className="pt-4 border-t border-border-color flex justify-between items-center">
                <span className="text-xs text-muted">Ready to sign out?</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 border border-border-color text-danger text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: APPOINTMENT DETAILS ----------------- */}
        {activeDetailsApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Booking Details</h3>
                  <p className="text-xs text-muted">Appointment #{activeDetailsApt.id} • {activeDetailsApt.salonName}</p>
                </div>
                <button
                  onClick={() => setActiveDetailsApt(null)}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
                {/* Status Badges */}
                <div className="flex items-center justify-between p-3 bg-ivory/50 rounded-xl border border-border-color">
                  <div>
                    <span className="text-muted block text-[11px]">Appointment Status</span>
                    <div className="mt-1">{getStatusBadge(activeDetailsApt.status)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted block text-[11px]">Payment Status</span>
                    <div className="mt-1 flex justify-end">{getPaymentBadge(activeDetailsApt.paymentStatus)}</div>
                  </div>
                </div>

                {/* Treatment Details */}
                <div className="space-y-2.5 p-4 bg-white rounded-xl border border-border-color">
                  <div className="flex justify-between">
                    <span className="text-muted">Salon:</span>
                    <strong className="text-deep-plum">{activeDetailsApt.salonName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Service Treatment:</span>
                    <strong className="text-deep-plum">{activeDetailsApt.serviceName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Stylist / Staff:</span>
                    <strong className="text-deep-plum">{activeDetailsApt.staffName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Scheduled Time:</span>
                    <strong className="text-deep-plum">
                      {new Date(activeDetailsApt.startAtUtc).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Duration:</span>
                    <strong className="text-deep-plum">{activeDetailsApt.durationMinutes} minutes</strong>
                  </div>
                </div>

                {/* Pricing & Advance Ledger */}
                <div className="space-y-2.5 p-4 bg-soft-blush/20 rounded-xl border border-border-color">
                  <div className="flex justify-between">
                    <span className="text-muted">Total Treatment Price:</span>
                    <strong className="text-deep-plum font-semibold">${activeDetailsApt.price.toFixed(2)}</strong>
                  </div>
                  {activeDetailsApt.advanceAmountRequired > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-800 font-medium">Advance Amount Required:</span>
                      <strong className="text-amber-900">${activeDetailsApt.advanceAmountRequired.toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-emerald-800 font-medium">Amount Paid to Date:</span>
                    <strong className="text-emerald-900">${(activeDetailsApt.amountPaid || 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border-color/60">
                    <span className="text-muted">Remaining Balance:</span>
                    <strong className="text-deep-plum font-bold">
                      ${Math.max(0, activeDetailsApt.price - (activeDetailsApt.amountPaid || 0)).toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Payment Proof Reference */}
                {activeDetailsApt.paymentTransactionReference && (
                  <div className="p-3 bg-ivory/50 rounded-xl border border-border-color space-y-1.5">
                    <span className="font-semibold text-deep-plum block">Submitted Payment Reference</span>
                    <div className="flex justify-between">
                      <span className="text-muted">UTR / Transaction Ref:</span>
                      <span className="font-mono text-deep-plum font-bold">{activeDetailsApt.paymentTransactionReference}</span>
                    </div>
                    {activeDetailsApt.paymentSubmittedAtUtc && (
                      <div className="flex justify-between">
                        <span className="text-muted">Submitted At:</span>
                        <span>{new Date(activeDetailsApt.paymentSubmittedAtUtc).toLocaleString()}</span>
                      </div>
                    )}
                    {activeDetailsApt.paymentVerifiedAtUtc && (
                      <div className="flex justify-between text-emerald-800 font-medium">
                        <span>Verified At:</span>
                        <span>{new Date(activeDetailsApt.paymentVerifiedAtUtc).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Notes */}
                {activeDetailsApt.customerNotes && (
                  <div className="p-3 bg-ivory/40 rounded-xl border border-border-color">
                    <span className="font-semibold text-deep-plum block mb-0.5">Your Booking Notes:</span>
                    <p className="text-muted italic">{activeDetailsApt.customerNotes}</p>
                  </div>
                )}

                {/* Cancellation Info */}
                {activeDetailsApt.cancellationReason && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200">
                    <span className="font-semibold block mb-0.5">Cancellation Details:</span>
                    <p>{activeDetailsApt.cancellationReason}</p>
                  </div>
                )}

                {/* Footer Modal Actions */}
                <div className="pt-4 border-t border-border-color flex justify-end gap-2.5">
                  {activeDetailsApt.paymentStatus !== 'Paid' && !isTerminalStatus(activeDetailsApt.status) && (
                    <button
                      onClick={() => {
                        const target = activeDetailsApt;
                        setActiveDetailsApt(null);
                        openPaymentModal(target);
                      }}
                      className="px-4 py-2 bg-primary-rose text-white font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Pay Advance
                    </button>
                  )}

                  {!isTerminalStatus(activeDetailsApt.status) && (
                    <button
                      onClick={() => {
                        const target = activeDetailsApt;
                        setActiveDetailsApt(null);
                        openCancelModal(target);
                      }}
                      className="px-4 py-2 border border-border-color text-danger font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}

                  <button
                    onClick={() => setActiveDetailsApt(null)}
                    className="px-4 py-2 border border-border-color bg-white text-muted hover:text-deep-plum rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: SUBMIT PAYMENT PROOF ----------------- */}
        {activePaymentApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Submit Advance Payment</h3>
                  <p className="text-xs text-muted">{activePaymentApt.salonName} — {activePaymentApt.serviceName}</p>
                </div>
                <button
                  onClick={closePaymentModal}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Salon Payment Details Card */}
                <div className="p-4 bg-soft-blush/30 rounded-xl border border-border-color space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">Total Service Price:</span>
                    <strong className="text-deep-plum">${activePaymentApt.price.toFixed(2)}</strong>
                  </div>

                  {activePaymentApt.advanceAmountRequired > 0 && (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-border-color/60">
                      <span className="text-muted font-medium">Advance Amount Required:</span>
                      <strong className="text-primary-rose text-base">${activePaymentApt.advanceAmountRequired.toFixed(2)}</strong>
                    </div>
                  )}

                  {/* Salon UPI Details */}
                  {activePaymentApt.salonUpiId ? (
                    <div className="pt-2 border-t border-border-color/60">
                      <span className="text-xs font-semibold uppercase text-muted block mb-1.5">Salon UPI ID / VPA</span>
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-border-color font-mono text-sm text-deep-plum justify-between">
                        <span className="truncate">{activePaymentApt.salonUpiId}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activePaymentApt.salonUpiId)}
                          className="px-2.5 py-1 text-xs bg-rose-tint text-primary-rose font-sans font-medium rounded hover:bg-rose-tint/80 transition-colors flex items-center gap-1 shrink-0"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedUpi ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">No direct UPI ID configured by salon.</p>
                  )}

                  {/* Salon QR Code */}
                  {activePaymentApt.salonQrCodeImageUrl && (
                    <div className="pt-2 border-t border-border-color/60 text-center">
                      <span className="text-xs font-semibold uppercase text-muted block mb-2">Scan & Pay via UPI</span>
                      <img
                        src={activePaymentApt.salonQrCodeImageUrl}
                        alt="Salon QR Scanner"
                        className="w-40 h-40 object-contain mx-auto rounded-lg bg-white p-2 border border-border-color shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Form Alert */}
                {paymentSubmitError && (
                  <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{paymentSubmitError}</span>
                  </div>
                )}

                {paymentSubmitSuccess && (
                  <div className="p-3.5 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{paymentSubmitSuccess}</span>
                  </div>
                )}

                {/* Proof Submission Form */}
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-deep-plum mb-1.5">
                      Transaction Reference / UTR Number <span className="text-primary-rose">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={100}
                      value={paymentForm.paymentTransactionReference}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentTransactionReference: e.target.value }))}
                      placeholder="e.g. 423589123456 or UPI Ref ID"
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm font-mono text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                    />
                    <p className="text-[11px] text-muted mt-1">Copy the 12-digit UTR/Ref number from your payment receipt in GPay, PhonePe, or Paytm.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-deep-plum mb-1.5">
                        Amount Paid ($) <span className="text-primary-rose">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={activePaymentApt.price}
                        required
                        value={paymentForm.amountPaid}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-deep-plum mb-1.5">
                        Payment Method
                      </label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Google Pay">Google Pay</option>
                        <option value="PhonePe">PhonePe</option>
                        <option value="Paytm">Paytm</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-deep-plum mb-1.5">
                      Screenshot / Receipt Proof URL (Optional)
                    </label>
                    <input
                      type="url"
                      maxLength={500}
                      value={paymentForm.paymentProofUrl}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentProofUrl: e.target.value }))}
                      placeholder="https://example.com/receipt.jpg"
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                    />
                  </div>

                  {/* Submission Footer */}
                  <div className="pt-4 border-t border-border-color flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closePaymentModal}
                      disabled={submittingPayment}
                      className="px-4 py-2 text-sm text-muted hover:text-deep-plum rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayment}
                      className="px-5 py-2 bg-primary-rose text-white text-sm font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                    >
                      {submittingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Submit Proof
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* ----------------- MODAL: CANCEL BOOKING ----------------- */}
        {cancellingApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-border-color shadow-2xl overflow-hidden my-8">
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <h3 className="font-serif font-semibold text-deep-plum text-lg">Cancel Appointment</h3>
                <button
                  onClick={() => setCancellingApt(null)}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-muted leading-relaxed">
                  Are you sure you want to cancel your visit for <strong className="text-deep-plum">{cancellingApt.serviceName}</strong> at <strong className="text-deep-plum">{cancellingApt.salonName}</strong> scheduled for {new Date(cancellingApt.startAtUtc).toLocaleString()}?
                </p>

                {cancelError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {cancelError}
                  </div>
                )}

                <form onSubmit={handleConfirmCancel} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-deep-plum mb-1.5">
                      Cancellation Reason (Optional)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Schedule conflict, feeling unwell..."
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setCancellingApt(null)}
                      disabled={cancellingLoading}
                      className="px-4 py-2 text-sm text-muted hover:text-deep-plum rounded-lg transition-colors"
                    >
                      Keep Booking
                    </button>
                    <button
                      type="submit"
                      disabled={cancellingLoading}
                      className="px-5 py-2 bg-danger text-white text-xs font-semibold rounded-lg hover:bg-danger/90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {cancellingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Confirm Cancellation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
