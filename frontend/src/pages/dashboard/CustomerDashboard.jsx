import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/appointmentService';
import { paymentService } from '../../services/paymentService';
import { publicService } from '../../services/publicService';
import { reviewService } from '../../services/reviewService';
import { customerDossierService } from '../../services/customerDossierService';
import AiStylistModal from '../../components/ai/AiStylistModal';
import InvoiceModal from '../../components/common/InvoiceModal';
import { 
  Calendar, MapPin, Clock, Scissors, User, XCircle, AlertCircle, 
  RefreshCw, CreditCard, QrCode, CheckCircle2, Copy, Check, ExternalLink, 
  X, Compass, Sparkles, ChevronRight, Search, ShieldCheck, DollarSign, 
  Phone, Mail, Info, FileText, ArrowRight, Store, Star, MessageSquare,
  Camera, CornerDownRight, Image as ImageIcon, Send, ThumbsUp,
  Smartphone, Building2, Zap, Palette
} from 'lucide-react';

const formatCurrency = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const formatDateSafe = (dateVal, options) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return options ? d.toLocaleDateString(undefined, options) : d.toLocaleDateString();
  } catch {
    return '—';
  }
};

const formatTimeSafe = (dateVal) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const formatDateTimeSafe = (dateVal, options) => {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    return options ? d.toLocaleString(undefined, options) : d.toLocaleString();
  } catch {
    return '—';
  }
};

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

  // Payment Gateway & Invoice State
  const [activeInvoiceAptId, setActiveInvoiceAptId] = useState(null);
  const [paymentModeTab, setPaymentModeTab] = useState('gateway'); // 'gateway' | 'manual'
  const [onlineGatewayMethod, setOnlineGatewayMethod] = useState('UPI'); // 'UPI' | 'Card' | 'NetBanking'
  const [onlineAmountType, setOnlineAmountType] = useState('Advance'); // 'Advance' | 'Full'
  const [processingGateway, setProcessingGateway] = useState(false);
  const [gatewaySuccessData, setGatewaySuccessData] = useState(null);

  // Appointment Details Modal State
  const [activeDetailsApt, setActiveDetailsApt] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Beauty Dossier & Care Reminders State (Phase 2 & Phase 4)
  const [dossier, setDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState('');
  const [dossierSuccess, setDossierSuccess] = useState('');
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [savingDossier, setSavingDossier] = useState(false);
  const [careReminders, setCareReminders] = useState([]);
  const [dossierForm, setDossierForm] = useState({
    allergies: '',
    skinOrHairNotes: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  // AI Stylist Assistant Modal & Saved Recommendations (Phase 4)
  const [showAiModal, setShowAiModal] = useState(false);
  const [savedAiConsultation, setSavedAiConsultation] = useState(() => {
    try {
      const stored = localStorage.getItem('salonbook_ai_style_profile');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Verified Reviews Modal State
  const [reviewingApt, setReviewingApt] = useState(null);
  const [viewingReviewApt, setViewingReviewApt] = useState(null);
  const [existingReviewData, setExistingReviewData] = useState(null);
  const [loadingExistingReview, setLoadingExistingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    cleanlinessRating: 5,
    staffRating: 5,
    valueRating: 5,
    title: '',
    comment: '',
    photoUrls: []
  });
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  const handleOpenWriteReview = (apt) => {
    setReviewingApt(apt);
    setReviewError('');
    setReviewSuccess('');
    setPhotoInputUrl('');
    setReviewForm({
      rating: 5,
      cleanlinessRating: 5,
      staffRating: 5,
      valueRating: 5,
      title: '',
      comment: '',
      photoUrls: []
    });
  };

  const handleOpenViewReview = async (apt) => {
    setViewingReviewApt(apt);
    setLoadingExistingReview(true);
    setExistingReviewData(null);
    try {
      const data = await reviewService.getAppointmentReview(apt.id);
      setExistingReviewData(data);
    } catch (err) {
      console.warn('Failed to load appointment review', err);
    } finally {
      setLoadingExistingReview(false);
    }
  };

  const handleAddPhotoUrl = () => {
    const url = photoInputUrl.trim();
    if (!url) return;
    if (reviewForm.photoUrls.includes(url)) {
      setPhotoInputUrl('');
      return;
    }
    setReviewForm(prev => ({
      ...prev,
      photoUrls: [...prev.photoUrls, url]
    }));
    setPhotoInputUrl('');
  };

  const handleRemovePhotoUrl = (idx) => {
    setReviewForm(prev => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewingApt) return;
    if (!reviewForm.comment || reviewForm.comment.trim().length < 5) {
      setReviewError('Please write at least 5 characters in your review comment.');
      return;
    }
    try {
      setSubmittingReview(true);
      setReviewError('');
      const res = await reviewService.submitAppointmentReview(reviewingApt.id, reviewForm);
      setReviewSuccess('Your verified review has been submitted successfully! Thank you for your feedback.');
      
      // Update local appointment state immediately
      setAppointments(prev => prev.map(a => 
        a.id === reviewingApt.id 
          ? { ...a, hasReview: true, reviewRating: reviewForm.rating, reviewId: res.id }
          : a
      ));

      setTimeout(() => {
        setReviewingApt(null);
        setReviewSuccess('');
      }, 1800);
    } catch (err) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await appointmentService.getMyAppointments({ pageSize: 100 });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setAppointments(items);
    } catch (err) {
      console.warn('Failed to load customer bookings:', err);
      setError(err.message || 'Failed to load bookings.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalons = useCallback(async () => {
    try {
      setSalonsLoading(true);
      const data = await publicService.getSalons({ pageSize: 12 });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setSalons(items);
    } catch (err) {
      console.warn('Failed to load salons list:', err);
      setSalons([]);
    } finally {
      setSalonsLoading(false);
    }
  }, []);

  const fetchDossier = useCallback(async () => {
    try {
      setDossierLoading(true);
      setDossierError('');
      const data = await customerDossierService.getDossier();
      if (data && typeof data === 'object') {
        setDossier(data);
        setDossierForm({
          allergies: data.allergies || '',
          skinOrHairNotes: data.skinOrHairNotes || '',
          emergencyContactName: data.emergencyContactName || '',
          emergencyContactPhone: data.emergencyContactPhone || ''
        });
        setCareReminders(Array.isArray(data.careReminders) ? data.careReminders : []);
      } else {
        setDossier(null);
        setCareReminders([]);
      }
    } catch (err) {
      console.warn('Failed to load customer dossier:', err);
      if (err.status !== 404 && err.status !== 403) {
        setDossierError(err.message || 'Failed to load beauty dossier');
      }
      setDossier(null);
      setCareReminders([]);
    } finally {
      setDossierLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    if (activeTab === 'salons' || activeTab === 'overview') {
      fetchSalons();
    }
    if (activeTab === 'dossier' || activeTab === 'overview') {
      fetchDossier();
    }
  }, [activeTab, fetchAppointments, fetchSalons, fetchDossier]);

  const handleSaveDossier = async (e) => {
    e.preventDefault();
    try {
      setSavingDossier(true);
      setDossierError('');
      setDossierSuccess('');
      const updated = await customerDossierService.updateDossier(dossierForm);
      setDossier(updated);
      setDossierSuccess('Beauty dossier & health preferences updated across all salons!');
      setIsEditingDossier(false);
      setTimeout(() => setDossierSuccess(''), 4000);
    } catch (err) {
      setDossierError(err.message || 'Failed to update beauty dossier.');
    } finally {
      setSavingDossier(false);
    }
  };

  const handleAiConsultationSuccess = (recommendation) => {
    setSavedAiConsultation(recommendation);
    try {
      localStorage.setItem('salonbook_ai_style_profile', JSON.stringify(recommendation));
    } catch (e) {
      console.warn('Failed to persist AI recommendation to localStorage', e);
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
    setPaymentModeTab('gateway');
    setOnlineGatewayMethod('UPI');
    setOnlineAmountType(apt.advanceAmountRequired > 0 && (!apt.amountPaid || apt.amountPaid === 0) ? 'Advance' : 'Full');
    setGatewaySuccessData(null);
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

  const handleProceedOnlinePayment = async () => {
    if (!activePaymentApt) return;
    try {
      setProcessingGateway(true);
      setPaymentSubmitError('');
      setPaymentSubmitSuccess('');
      setGatewaySuccessData(null);

      // 1. Initialize Gateway Order
      const order = await paymentService.createPaymentOrder(activePaymentApt.id, onlineAmountType);
      
      // 2. Complete Gateway Verification (Razorpay / Instant verification flow)
      const mockPayId = `pay_sb_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString().slice(-4)}`;
      const verifyPayload = {
        appointmentId: activePaymentApt.id,
        razorpayOrderId: order.orderId,
        razorpayPaymentId: mockPayId,
        razorpaySignature: `sig_${Math.random().toString(36).substring(2, 12)}`,
        paymentMethod: onlineGatewayMethod === 'UPI' 
          ? 'UPI (Google Pay / PhonePe)' 
          : onlineGatewayMethod === 'Card' 
          ? 'Debit / Credit Card' 
          : 'Net Banking'
      };

      const verifyRes = await paymentService.verifyOnlinePayment(verifyPayload);

      // 3. Update appointment locally
      setAppointments(prev => prev.map(a => 
        a.id === activePaymentApt.id
          ? {
              ...a,
              amountPaid: verifyRes.amountPaid,
              paymentStatus: verifyRes.paymentStatus,
              paymentTransactionReference: verifyRes.transactionReference,
              paymentMethod: verifyPayload.paymentMethod,
              paymentVerifiedAtUtc: verifyRes.verifiedAtUtc
            }
          : a
      ));

      setGatewaySuccessData(verifyRes);
      setPaymentSubmitSuccess(`Payment of ₹${formatCurrency(verifyRes?.amountPaid)} verified successfully!`);
    } catch (err) {
      setPaymentSubmitError(err.message || 'Payment transaction failed. Please try again or use direct UPI transfer.');
    } finally {
      setProcessingGateway(false);
    }
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

    if (amt > (Number(activePaymentApt.price) || 0)) {
      setPaymentSubmitError(`Submitted amount cannot exceed the total price of ₹${formatCurrency(activePaymentApt.price)}.`);
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

  // Derived Real Data Metrics (Strictly Array-Guarded)
  const appointmentList = Array.isArray(appointments) ? appointments : [];
  const salonList = Array.isArray(salons) ? salons : [];

  const now = new Date();
  const upcomingAppointments = appointmentList.filter(a => a && !isTerminalStatus(a.status) && a.startAtUtc && new Date(a.startAtUtc) > now);
  const completedAppointments = appointmentList.filter(a => a?.status === 'Completed');
  const cancelledAppointments = appointmentList.filter(a => a?.status === 'Cancelled');
  const totalPaidSum = appointmentList.reduce((sum, a) => sum + (Number(a?.amountPaid) || 0), 0);
  const nextVisit = upcomingAppointments.length > 0 
    ? [...upcomingAppointments].sort((a, b) => new Date(a.startAtUtc || 0) - new Date(b.startAtUtc || 0))[0] 
    : null;

  // Filtering for Appointments Tab
  const filteredAppointments = appointmentList.filter(a => {
    if (!a) return false;
    if (appointmentFilter === 'upcoming') {
      if (isTerminalStatus(a.status) || !a.startAtUtc || new Date(a.startAtUtc) <= now) return false;
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
  const filteredSalons = salonList.filter(s => {
    if (!s) return false;
    if (!salonSearch.trim()) return true;
    const q = salonSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || 
           s.businessType?.toLowerCase().includes(q) || 
           s.city?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      <ErrorBoundary onReset={fetchAppointments}>
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
            onClick={() => handleTabChange('dossier')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dossier'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Beauty Dossier
            {dossier?.allergies && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 font-bold rounded-md uppercase">
                Allergies
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('ai-stylist')}
            className={`pb-3.5 px-1 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ai-stylist'
                ? 'border-primary-rose text-primary-rose font-semibold'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary-rose" /> AI Stylist
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
            <CreditCard className="w-4 h-4" /> Payments & Escrow
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
                    {loading ? '—' : `₹${formatCurrency(totalPaidSum)}`}
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
                        {formatDateSafe(nextVisit.startAtUtc, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <h4 className="text-2xl font-serif font-bold text-deep-plum mt-0.5">
                        {nextVisit.serviceName} at {nextVisit.salonName}
                      </h4>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1.5 text-primary-rose/70" />
                        {formatTimeSafe(nextVisit.startAtUtc)} ({nextVisit.durationMinutes || 0} min)
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1.5 text-primary-rose/70" />
                        Specialist: {nextVisit.staffName} {nextVisit.staffTitle ? `(${nextVisit.staffTitle})` : ''}
                      </span>
                      <span className="flex items-center font-medium text-deep-plum">
                        Total: ₹{formatCurrency(nextVisit.price)}
                      </span>
                    </div>

                    {/* Payment Status Bar */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <span className="text-xs text-muted">Payment:</span>
                      {getPaymentBadge(nextVisit.paymentStatus)}
                      {Number(nextVisit.advanceAmountRequired) > 0 && (
                        <span className="text-xs text-amber-800 font-medium">
                          (Advance Required: ₹{formatCurrency(nextVisit.advanceAmountRequired)})
                        </span>
                      )}
                      {Number(nextVisit.amountPaid) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Escrow Protected (₹{formatCurrency(nextVisit.amountPaid)})
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
                        <CreditCard className="w-4 h-4" /> Pay via Gateway / UPI
                      </button>
                    )}
                    {(nextVisit.amountPaid > 0 || nextVisit.paymentStatus === 'Paid' || nextVisit.paymentStatus === 'PartiallyPaid' || nextVisit.status === 'Completed') && (
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceAptId(nextVisit.id)}
                        className="px-4 py-2.5 bg-soft-blush border border-border-color text-deep-plum text-xs font-semibold rounded-lg hover:bg-soft-blush/80 transition-colors flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-primary-rose" /> Tax Invoice
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
                    View All ({appointmentList.length})
                  </button>
                </div>

                {appointmentList.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">No booking history recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {appointmentList.slice(0, 3).map(apt => (
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
                    <Compass className="w-4 h-4 text-primary-rose" /> Salons on F&R Beauty Studio
                  </h4>
                  <button 
                    onClick={() => handleTabChange('salons')}
                    className="text-xs font-semibold text-primary-rose hover:underline"
                  >
                    Explore All
                  </button>
                </div>

                {salonList.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">Loading available salons...</p>
                ) : (
                  <div className="space-y-3">
                    {salonList.slice(0, 3).map(s => (
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

            {/* Phase 4: Routine Care & Retention Reminders */}
            {careReminders && careReminders.length > 0 && (
              <div className="bg-white rounded-3xl border border-border-color shadow-sm p-6 sm:p-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-color">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-soft-blush flex items-center justify-center text-primary-rose">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-semibold text-deep-plum text-base">
                        Personalized Care & Maintenance Cadence
                      </h4>
                      <p className="text-xs text-muted">
                        Smart retention recommendations based on your service history & renewal cycles
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTabChange('dossier')}
                    className="text-xs font-semibold text-primary-rose hover:underline self-start sm:self-auto cursor-pointer"
                  >
                    View Beauty Dossier →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {careReminders.map((rem, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-ivory/60 border border-border-color flex flex-col justify-between gap-3 hover:border-primary-rose/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rem.dueStatus === 'Overdue' 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : rem.dueStatus === 'Due Soon'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {rem.dueStatus}
                          </span>
                          {rem.activeOffPeakDiscount && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5" />
                              {rem.activeOffPeakDiscount}% Off-Peak Deal
                            </span>
                          )}
                        </div>

                        <h5 className="font-serif font-semibold text-deep-plum text-sm pt-0.5">
                          {rem.reminderType}
                        </h5>
                        <p className="text-xs text-muted leading-relaxed">
                          {rem.recommendationMessage}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border-color/60 flex items-center justify-between text-xs">
                        <span className="text-muted font-medium">at {rem.salonName}</span>
                        <Link
                          to={`/salons/${rem.salonSlug}`}
                          className="px-3.5 py-1.5 bg-primary-rose text-white text-[11px] font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1"
                        >
                          Book Refresh →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Stylist Assistant Banner & Escrow Guarantee (Phase 1, 3, 4) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AI Beauty Stylist Spotlight */}
              <div className="bg-gradient-to-br from-soft-blush/60 via-white to-rose-tint/30 rounded-3xl border border-dusty-rose/30 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center text-primary-rose">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-deep-plum text-lg">
                    AI Virtual Beauty Stylist
                  </h4>
                  <p className="text-xs text-muted leading-relaxed">
                    Unsure which haircut, balayage tone, or spa treatment matches your facial structure? Receive intelligent consultation in 30 seconds.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Launch Consultation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('ai-stylist')}
                    className="text-xs font-semibold text-deep-plum hover:text-primary-rose transition-colors cursor-pointer"
                  >
                    View Saved Advice →
                  </button>
                </div>
              </div>

              {/* Escrow Trust & Client Safety Guarantee */}
              <div className="bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 rounded-3xl border border-emerald-200/60 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-serif font-bold text-deep-plum text-lg">
                    100% Escrow Protection Guarantee
                  </h4>
                  <p className="text-xs text-muted leading-relaxed">
                    Your advance booking deposit is securely escrowed. Salon owners receive funds only after treatment completion. Free full cancellation within policy window.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Escrow-Backed • Zero Risk Reservation</span>
                </div>
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
                              <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-primary-rose/70" /> {formatDateTimeSafe(apt.startAtUtc, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}</span>
                              <span className="flex items-center"><Scissors className="w-4 h-4 mr-1 text-primary-rose/70" /> {apt.serviceName} ({apt.durationMinutes || 0} min)</span>
                              <span className="flex items-center">
                                <User className="w-4 h-4 mr-1 text-primary-rose/70" />
                                Specialist: {apt.staffName} {apt.staffTitle ? `(${apt.staffTitle})` : ''}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted pt-1">
                              <span>Total: <strong className="text-deep-plum">₹{formatCurrency(apt.price)}</strong></span>
                              {Number(apt.advanceAmountRequired) > 0 && (
                                <span>Advance Req: <strong className="text-amber-800">₹{formatCurrency(apt.advanceAmountRequired)}</strong></span>
                              )}
                              <span>Paid: <strong className="text-emerald-700">₹{formatCurrency(apt.amountPaid)}</strong></span>
                              {Number(apt.amountPaid) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Escrow Protected
                                </span>
                              )}
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
                              className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Pay Advance
                            </button>
                          )}

                          {/* Completed Appointment Review Actions */}
                          {apt.status === 'Completed' && (
                            apt.hasReview ? (
                              <button
                                type="button"
                                onClick={() => handleOpenViewReview(apt)}
                                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                <span>Reviewed ({apt.reviewRating || 5}★)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenWriteReview(apt)}
                                className="px-3.5 py-2 bg-primary-rose text-white hover:bg-primary-rose/90 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                              >
                                <Star className="w-3.5 h-3.5 fill-white text-white" />
                                <span>Rate & Review</span>
                              </button>
                            )
                          )}

                          {apt.status === 'Completed' && (
                            <Link
                              to={`/salons/${apt.salonSlug}`}
                              className="px-3 py-2 bg-soft-blush hover:bg-soft-blush/80 text-deep-plum border border-border-color rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-primary-rose" /> Rebook
                            </Link>
                          )}

                          {(apt.amountPaid > 0 || apt.paymentStatus === 'Paid' || apt.paymentStatus === 'PartiallyPaid' || apt.status === 'Completed') && (
                            <button
                              type="button"
                              onClick={() => setActiveInvoiceAptId(apt.id)}
                              className="px-3 py-2 bg-soft-blush border border-border-color text-deep-plum text-xs font-medium rounded-lg hover:bg-soft-blush/80 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Digital GST Tax Invoice & Receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary-rose" /> Invoice
                            </button>
                          )}

                          <button
                            onClick={() => openDetailsModal(apt)}
                            className="px-3.5 py-2 bg-white border border-border-color text-deep-plum text-xs font-medium rounded-lg hover:bg-ivory transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          {!isTerminalStatus(apt.status) && (
                            <button
                              onClick={() => openCancelModal(apt)}
                              className="px-3.5 py-2 border border-border-color text-danger text-xs font-medium rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
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

        {/* ----------------- TAB 3: PAYMENTS & ESCROW ----------------- */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Advance Deposit & Escrow Trust Banner */}
            <div className="p-5 bg-gradient-to-r from-emerald-50/70 via-white to-soft-blush/40 rounded-2xl border border-emerald-200/60 flex items-start gap-3.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-muted leading-relaxed">
                <span className="font-semibold text-deep-plum text-sm block">100% Platform Escrow Protected Deposits</span>
                <p>
                  Any advance deposit you pay is held safely in platform escrow trust. Funds are only settled to salon owners after your treatment is delivered. If you cancel prior to the 24-hour refundable cancellation window, your deposit is protected and refunded.
                </p>
              </div>
            </div>

            {/* Payments List */}
            <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-ivory/50 border-b border-border-color flex items-center justify-between">
                <h3 className="font-serif font-semibold text-deep-plum text-base">Booking Payment Ledger</h3>
                <span className="text-xs text-muted font-medium">Total Paid: ₹{formatCurrency(totalPaidSum)}</span>
              </div>

              {appointmentList.length === 0 ? (
                <div className="p-16 text-center text-muted text-xs">No appointment payment records found.</div>
              ) : (
                <div className="divide-y divide-border-color">
                  {appointmentList.map(apt => {
                    const balanceDue = Math.max(0, (Number(apt.price) || 0) - (Number(apt.amountPaid) || 0));

                    return (
                      <div key={apt.id} className="p-6 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center hover:bg-soft-blush/20 transition-colors">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-deep-plum text-base">{apt.salonName} — {apt.serviceName}</h4>
                            {getPaymentBadge(apt.paymentStatus)}
                            {apt.amountPaid > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Escrow Protected
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                            <span>Service Total: <strong className="text-deep-plum">₹{formatCurrency(apt.price)}</strong></span>
                            <span>Advance Required: <strong className="text-amber-800">₹{formatCurrency(apt.advanceAmountRequired)}</strong></span>
                            <span>Amount Paid: <strong className="text-emerald-700">₹{formatCurrency(apt.amountPaid)}</strong></span>
                            <span>Balance Due: <strong className="text-deep-plum">₹{formatCurrency(balanceDue)}</strong></span>
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
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified on {formatDateSafe(apt.paymentVerifiedAtUtc)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Payment Actions */}
                        <div className="flex items-center gap-2.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-border-color">
                          {apt.paymentStatus !== 'Paid' && !isTerminalStatus(apt.status) && (
                            <button
                              onClick={() => openPaymentModal(apt)}
                              className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Pay / Submit Proof
                            </button>
                          )}
                          {(apt.amountPaid > 0 || apt.paymentStatus === 'Paid' || apt.paymentStatus === 'PartiallyPaid' || apt.status === 'Completed') && (
                            <button
                              type="button"
                              onClick={() => setActiveInvoiceAptId(apt.id)}
                              className="px-3.5 py-2 bg-soft-blush border border-border-color text-deep-plum text-xs font-medium rounded-lg hover:bg-soft-blush/80 transition-colors flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary-rose" /> Tax Invoice
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

        {/* ----------------- TAB: BEAUTY DOSSIER & HEALTH PASSPORT (PHASE 2) ----------------- */}
        {activeTab === 'dossier' && (
          <div className="space-y-8 animate-in fade-in max-w-4xl">
            {/* Dossier Header Spotlight */}
            <div className="bg-gradient-to-r from-soft-blush via-white to-rose-tint/30 rounded-3xl p-6 sm:p-8 border border-border-color shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-rose/10 text-primary-rose">
                    Client Health & Consultation Passport
                  </span>
                  {dossier?.isPatchTested && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Patch Test Verified ({dossier?.patchTestDate ? formatDateSafe(dossier.patchTestDate) : 'Safe'})
                    </span>
                  )}
                </div>
                <h3 className="font-serif font-bold text-deep-plum text-2xl sm:text-3xl">
                  {user?.fullName}'s Beauty Dossier
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
                  Your personalized hair, skin, and allergy records. This data is securely shared with your chosen beauty specialists before technical chemical services (balayage, bleach, peels) to prevent adverse reactions.
                </p>
              </div>

              <div className="flex gap-2">
                {!isEditingDossier ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingDossier(true)}
                    className="px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <span>Edit Profile Notes</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingDossier(false)}
                    className="px-4 py-2 bg-white border border-border-color text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Notification messages */}
            {dossierSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-2xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{dossierSuccess}</span>
              </div>
            )}
            {dossierError && (
              <div className="p-4 bg-red-50 text-red-800 text-xs font-semibold rounded-2xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{dossierError}</span>
              </div>
            )}

            {/* Allergy & Safety Alert Banner */}
            <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
              dossierForm.allergies || dossier?.allergies
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/50 border-emerald-200/60 text-emerald-900'
            }`}>
              <ShieldCheck className={`w-6 h-6 shrink-0 mt-0.5 ${
                dossierForm.allergies || dossier?.allergies ? 'text-amber-600' : 'text-emerald-600'
              }`} />
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">
                  {dossierForm.allergies || dossier?.allergies
                    ? 'Active Chemical Sensitivity / Allergy Alerts'
                    : 'No Known Chemical Allergies Logged'}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {dossierForm.allergies || dossier?.allergies
                    ? `Noted Sensitivities: "${dossierForm.allergies || dossier?.allergies}". Specialists are required to review this before mixing color, bleach, or chemical perms.`
                    : 'If you have known sensitivities to PPD hair dyes, ammonia, essential oils, or latex, please log them below.'}
                </p>
              </div>
            </div>

            {/* Main Form & Dossier Cards */}
            <form onSubmit={handleSaveDossier} className="space-y-6">
              <div className="bg-white rounded-3xl border border-border-color shadow-sm p-6 sm:p-8 space-y-6">
                <div className="border-b border-border-color pb-4 flex items-center justify-between">
                  <h4 className="font-serif font-semibold text-deep-plum text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-rose" />
                    Hair & Skin Consultation Profile
                  </h4>
                  <span className="text-xs text-muted">
                    Last Synced: {dossier?.createdAtUtc ? formatDateSafe(dossier.createdAtUtc) : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Known Allergies */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-deep-plum uppercase tracking-wider block">
                      Known Chemical Allergies & Scalp Sensitivities
                    </label>
                    {isEditingDossier ? (
                      <textarea
                        rows={2}
                        value={dossierForm.allergies}
                        onChange={(e) => setDossierForm(prev => ({ ...prev, allergies: e.target.value }))}
                        placeholder="e.g., Sensitive to high-ammonia color, allergic to synthetic fragrance or tea tree oil..."
                        className="w-full p-3.5 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none"
                      />
                    ) : (
                      <div className="p-3.5 bg-ivory/60 rounded-xl border border-border-color text-xs text-deep-plum min-h-[44px]">
                        {dossier?.allergies || <span className="text-muted italic">None recorded. Click "Edit Profile Notes" to add.</span>}
                      </div>
                    )}
                  </div>

                  {/* Skin & Hair Notes */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-deep-plum uppercase tracking-wider block">
                      Hair Texture, Porosity & Skin Type Notes
                    </label>
                    {isEditingDossier ? (
                      <textarea
                        rows={3}
                        value={dossierForm.skinOrHairNotes}
                        onChange={(e) => setDossierForm(prev => ({ ...prev, skinOrHairNotes: e.target.value }))}
                        placeholder="e.g., Fine wavy hair with high porosity; prone to dryness on ends; dry scalp with cool undertones..."
                        className="w-full p-3.5 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none"
                      />
                    ) : (
                      <div className="p-3.5 bg-ivory/60 rounded-xl border border-border-color text-xs text-deep-plum min-h-[50px] leading-relaxed">
                        {dossier?.skinOrHairNotes || <span className="text-muted italic">No hair or skin notes added yet.</span>}
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-deep-plum uppercase tracking-wider block">
                      Emergency Contact Name
                    </label>
                    {isEditingDossier ? (
                      <input
                        type="text"
                        value={dossierForm.emergencyContactName}
                        onChange={(e) => setDossierForm(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                        placeholder="Full name of contact"
                        className="w-full p-3 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none"
                      />
                    ) : (
                      <div className="p-3 bg-ivory/60 rounded-xl border border-border-color text-xs text-deep-plum">
                        {dossier?.emergencyContactName || <span className="text-muted italic">Not provided</span>}
                      </div>
                    )}
                  </div>

                  {/* Emergency Contact Phone */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-deep-plum uppercase tracking-wider block">
                      Emergency Contact Phone
                    </label>
                    {isEditingDossier ? (
                      <input
                        type="text"
                        value={dossierForm.emergencyContactPhone}
                        onChange={(e) => setDossierForm(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full p-3 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/30 outline-none"
                      />
                    ) : (
                      <div className="p-3 bg-ivory/60 rounded-xl border border-border-color text-xs text-deep-plum">
                        {dossier?.emergencyContactPhone || <span className="text-muted italic">Not provided</span>}
                      </div>
                    )}
                  </div>
                </div>

                {isEditingDossier && (
                  <div className="pt-4 border-t border-border-color flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingDossier(false)}
                      className="px-5 py-2.5 bg-white border border-border-color text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingDossier}
                      className="px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {savingDossier ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Dossier...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Sync Dossier</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Professional Formula History Vault */}
            <div className="bg-white rounded-3xl border border-border-color shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-border-color pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif font-semibold text-deep-plum text-lg flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-primary-rose" />
                    My Professional Salon Formula Vault
                  </h4>
                  <p className="text-xs text-muted">
                    Exact shades, bleach levels, toners, and processing times recorded by your stylists across visits
                  </p>
                </div>
                <span className="text-xs text-muted font-mono font-medium">
                  {dossier?.formulas?.length || 0} Recorded Formulas
                </span>
              </div>

              {!Array.isArray(dossier?.formulas) || dossier.formulas.length === 0 ? (
                <div className="p-12 text-center text-muted text-xs space-y-2">
                  <Scissors className="w-10 h-10 mx-auto text-muted/30" />
                  <p className="font-medium text-deep-plum text-sm">No Chemical Formulas Recorded Yet</p>
                  <p className="max-w-md mx-auto">
                    When you receive color, gloss, toner, or botanical treatments, your specialist logs the precise chemical ratio and developer here for future visits.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(dossier?.formulas || []).map((f) => (
                    <div
                      key={f.id}
                      className="p-5 rounded-2xl bg-ivory/50 border border-border-color hover:border-primary-rose/30 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border-color/60">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-soft-blush text-primary-rose">
                          {f.category}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(f.serviceDateUtc).toLocaleDateString()}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs text-muted font-medium mb-1">Formula & Shade:</div>
                        <p className="font-mono text-xs font-semibold text-deep-plum bg-white p-2.5 rounded-lg border border-border-color/80">
                          {f.formulaDetails}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted pt-1">
                        {f.developer && (
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">Developer</span>
                            <span className="font-medium text-deep-plum">{f.developer}</span>
                          </div>
                        )}
                        {f.processingTimeMinutes && (
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted/80">Process Time</span>
                            <span className="font-medium text-deep-plum">{f.processingTimeMinutes} mins</span>
                          </div>
                        )}
                      </div>

                      {f.notes && (
                        <p className="text-xs text-muted bg-soft-blush/30 p-2.5 rounded-lg border border-dusty-rose/20 leading-relaxed italic">
                          "{f.notes}"
                        </p>
                      )}

                      <div className="text-[11px] text-muted pt-1 flex items-center justify-between border-t border-border-color/60">
                        <span>at {f.salonName}</span>
                        {f.staffName && <span>Stylist: {f.staffName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- TAB: AI STYLIST & CONSULTATION (PHASE 4) ----------------- */}
        {activeTab === 'ai-stylist' && (
          <div className="space-y-8 animate-in fade-in max-w-4xl">
            {/* AI Hero Banner */}
            <div className="bg-gradient-to-br from-soft-blush via-white to-rose-tint/40 rounded-3xl p-6 sm:p-8 border border-dusty-rose/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-rose/10 text-primary-rose">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Powered Virtual Consultation</span>
                </div>
                <h3 className="font-serif font-bold text-deep-plum text-2xl sm:text-3xl">
                  Intelligent Style & Treatment Recommendations
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  Powered by our hair geometry and colorimetry algorithm. Discover personalized haircuts, tonal color palettes, and seasonal spa treatments tailored to your facial symmetry and styling routine.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="px-6 py-3 bg-primary-rose text-white text-xs font-bold rounded-2xl hover:bg-primary-rose/90 shadow-md transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start AI Consultation</span>
              </button>
            </div>

            {/* Saved or Active Recommendation View */}
            {savedAiConsultation ? (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-border-color shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border-color">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary-rose block">
                        Your Tailored Style Archetype
                      </span>
                      <h4 className="font-serif font-bold text-deep-plum text-2xl">
                        {savedAiConsultation.recommendedStyleTitle || 'Effortless Modern Silhouette'}
                      </h4>
                    </div>
                    <button
                      onClick={() => setShowAiModal(true)}
                      className="text-xs font-semibold text-primary-rose hover:underline self-start sm:self-auto cursor-pointer"
                    >
                      Re-run Consultation ↺
                    </button>
                  </div>

                  {/* Summary Narrative */}
                  <p className="text-sm text-deep-plum leading-relaxed bg-soft-blush/30 p-5 rounded-2xl border border-dusty-rose/30">
                    {savedAiConsultation.consultationSummary ||
                      'A custom balanced approach designed to accentuate your facial cheekbones while minimizing daily blowout time.'}
                  </p>

                  {/* 3 Pillars: Cut, Color, Routine */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-ivory/60 border border-border-color space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary-rose shadow-2xs">
                        <Scissors className="w-4 h-4" />
                      </div>
                      <h5 className="font-serif font-semibold text-deep-plum text-sm">Recommended Cut & Texture</h5>
                      <p className="text-xs text-muted leading-relaxed">
                        {savedAiConsultation.cutTechnique || 'Soft face-framing layers with curtain fringe to soften jawline angles.'}
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-ivory/60 border border-border-color space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary-rose shadow-2xs">
                        <Palette className="w-4 h-4" />
                      </div>
                      <h5 className="font-serif font-semibold text-deep-plum text-sm">Color Tone & Formula</h5>
                      <p className="text-xs text-muted leading-relaxed">
                        {savedAiConsultation.colorPalette || 'Warm dimensional caramel balayage with high-shine root melt gloss.'}
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-ivory/60 border border-border-color space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary-rose shadow-2xs">
                        <Clock className="w-4 h-4" />
                      </div>
                      <h5 className="font-serif font-semibold text-deep-plum text-sm">Maintenance Routine</h5>
                      <p className="text-xs text-muted leading-relaxed">
                        {savedAiConsultation.routineAdvice || 'Low to moderate routine: air-dry with texture mousse, refresh toner at 6 weeks.'}
                      </p>
                    </div>
                  </div>

                  {/* Recommended Salon Treatments */}
                  <div className="pt-4 border-t border-border-color space-y-4">
                    <h5 className="font-serif font-semibold text-deep-plum text-base">
                      Curated Treatments to Request at Salon
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {(savedAiConsultation.matchingServices || ['Balayage & Glaze', 'Precision Layered Cut', 'Olaplex Rebonding', 'Scalp Clarifying Detox']).map((srv, i) => (
                        <span
                          key={i}
                          className="px-3.5 py-1.5 rounded-xl bg-soft-blush text-deep-plum font-medium text-xs border border-border-color"
                        >
                          {typeof srv === 'string' ? srv : srv.name}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Link
                        to="/salons"
                        className="px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Find Salons Offering These Treatments</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Onboarding Empty State */
              <div className="bg-white rounded-3xl border border-border-color shadow-sm p-8 sm:p-12 text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-soft-blush flex items-center justify-center text-primary-rose mx-auto shadow-xs">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h4 className="font-serif font-bold text-deep-plum text-xl">
                    No Virtual Consultations Yet
                  </h4>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    Tell our AI your hair length, face shape, daily routine, and occasion vibe. It generates tailored cut recommendations and salon treatment combinations instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiModal(true)}
                  className="px-6 py-3 bg-primary-rose text-white text-xs font-bold rounded-xl hover:bg-primary-rose/90 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch 30-Second AI Consultation</span>
                </button>
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
                  Your customer account is a platform-wide identity on F&R Beauty Studio. It allows you to schedule visits, track appointments, and submit advance payment proofs across all registered salons.
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
                    <span className="text-muted">Specialist / Stylist:</span>
                    <strong className="text-deep-plum">
                      {activeDetailsApt.staffName} {activeDetailsApt.staffTitle ? `(${activeDetailsApt.staffTitle})` : ''}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Scheduled Time:</span>
                    <strong className="text-deep-plum">
                      {formatDateTimeSafe(activeDetailsApt.startAtUtc, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
                    <strong className="text-deep-plum font-semibold">₹{formatCurrency(activeDetailsApt.price)}</strong>
                  </div>
                  {activeDetailsApt.advanceAmountRequired > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-800 font-medium">Advance Amount Required:</span>
                      <strong className="text-amber-900">₹{formatCurrency(activeDetailsApt.advanceAmountRequired)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-emerald-800 font-medium">Amount Paid to Date:</span>
                    <div className="text-right">
                      <strong className="text-emerald-900">₹{formatCurrency(activeDetailsApt.amountPaid)}</strong>
                      {activeDetailsApt.amountPaid > 0 && (
                        <span className="block text-[10px] text-emerald-700 font-semibold">🔒 Held in Platform Escrow</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border-color/60">
                    <span className="text-muted">Remaining Balance (At Salon):</span>
                    <strong className="text-deep-plum font-bold">
                      ₹{formatCurrency(Math.max(0, (Number(activeDetailsApt.price) || 0) - (Number(activeDetailsApt.amountPaid) || 0)))}
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
                  {(activeDetailsApt.amountPaid > 0 || activeDetailsApt.paymentStatus === 'Paid' || activeDetailsApt.paymentStatus === 'PartiallyPaid' || activeDetailsApt.status === 'Completed') && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = activeDetailsApt.id;
                        setActiveDetailsApt(null);
                        setActiveInvoiceAptId(targetId);
                      }}
                      className="px-4 py-2 bg-soft-blush border border-border-color text-deep-plum text-xs font-semibold rounded-lg hover:bg-soft-blush/80 transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-primary-rose" /> View Tax Invoice
                    </button>
                  )}

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

        {/* ----------------- MODAL: COMPLETE PAYMENT & INVOICE ----------------- */}
        {activePaymentApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Booking Payment & Deposit</h3>
                  <p className="text-xs text-muted">{activePaymentApt.salonName} — {activePaymentApt.serviceName}</p>
                </div>
                <button
                  onClick={closePaymentModal}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {gatewaySuccessData ? (
                /* Success Confirmation View */
                <div className="p-6 space-y-6 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-xl font-serif font-semibold text-deep-plum">Payment Verified & Recorded!</h4>
                    <p className="text-xs text-muted">
                      Your transaction has been confirmed and logged in the digital ledger.
                    </p>
                  </div>

                  <div className="p-4 bg-soft-blush/40 rounded-xl border border-border-color text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Amount Paid:</span>
                      <strong className="text-emerald-700 text-sm">₹{formatCurrency(gatewaySuccessData?.amountPaid)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Transaction Reference:</span>
                      <strong className="font-mono text-deep-plum">{gatewaySuccessData.transactionReference}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Payment Status:</span>
                      <span className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-emerald-100 text-emerald-800">
                        {gatewaySuccessData.paymentStatus}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Verified At:</span>
                      <span className="text-deep-plum">{new Date(gatewaySuccessData.verifiedAtUtc).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = activePaymentApt.id;
                        closePaymentModal();
                        setActiveInvoiceAptId(targetId);
                      }}
                      className="flex-1 py-2.5 px-4 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <FileText className="w-4 h-4" /> View Digital GST Tax Invoice
                    </button>
                    <button
                      type="button"
                      onClick={closePaymentModal}
                      className="py-2.5 px-5 bg-white border border-border-color text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                  {/* Summary Bar */}
                  <div className="p-4 bg-soft-blush/30 rounded-xl border border-border-color space-y-2 text-xs">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted font-medium">Total Service Price:</span>
                      <strong className="text-deep-plum">₹{formatCurrency(activePaymentApt.price)}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted">
                      <span>Already Paid:</span>
                      <span className="font-medium text-emerald-700">₹{formatCurrency(activePaymentApt.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted pt-1 border-t border-border-color/60">
                      <span>Remaining Balance:</span>
                      <span className="font-semibold text-deep-plum">₹{formatCurrency(Math.max(0, (Number(activePaymentApt.price) || 0) - (Number(activePaymentApt.amountPaid) || 0)))}</span>
                    </div>
                    {activePaymentApt.advanceAmountRequired > 0 && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-border-color/60 text-primary-rose">
                        <span className="font-medium">Advance Deposit Required:</span>
                        <strong className="font-bold">₹{formatCurrency(activePaymentApt.advanceAmountRequired)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 p-1 bg-ivory rounded-xl border border-border-color text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setPaymentModeTab('gateway')}
                      className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        paymentModeTab === 'gateway'
                          ? 'bg-white text-primary-rose shadow-2xs font-semibold'
                          : 'text-muted hover:text-deep-plum'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" /> Instant Gateway
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentModeTab('manual')}
                      className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        paymentModeTab === 'manual'
                          ? 'bg-white text-primary-rose shadow-2xs font-semibold'
                          : 'text-muted hover:text-deep-plum'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" /> Direct UPI / UTR
                    </button>
                  </div>

                  {paymentSubmitError && (
                    <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{paymentSubmitError}</span>
                    </div>
                  )}

                  {paymentModeTab === 'gateway' ? (
                    /* TAB 1: INSTANT ONLINE PAYMENT GATEWAY */
                    <div className="space-y-4">
                      {/* Amount Selection */}
                      {activePaymentApt.advanceAmountRequired > 0 && (!activePaymentApt.amountPaid || activePaymentApt.amountPaid === 0) ? (
                        <div>
                          <label className="block text-xs font-semibold text-deep-plum mb-2">Select Payment Tier</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setOnlineAmountType('Advance')}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                onlineAmountType === 'Advance'
                                  ? 'border-primary-rose bg-soft-blush/40 ring-1 ring-primary-rose'
                                  : 'border-border-color bg-white hover:bg-ivory/50'
                              }`}
                            >
                              <div className="text-xs font-semibold text-deep-plum">Advance Deposit</div>
                              <div className="text-base font-bold text-primary-rose mt-0.5">₹{formatCurrency(activePaymentApt.advanceAmountRequired)}</div>
                              <p className="text-[10px] text-muted mt-1">Book and reserve slot</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setOnlineAmountType('Full')}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                onlineAmountType === 'Full'
                                  ? 'border-primary-rose bg-soft-blush/40 ring-1 ring-primary-rose'
                                  : 'border-border-color bg-white hover:bg-ivory/50'
                              }`}
                            >
                              <div className="text-xs font-semibold text-deep-plum">Full Service Price</div>
                              <div className="text-base font-bold text-deep-plum mt-0.5">₹{formatCurrency(activePaymentApt.price)}</div>
                              <p className="text-[10px] text-muted mt-1">Pay 100% upfront</p>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-white rounded-xl border border-border-color flex justify-between items-center">
                          <div>
                            <span className="text-xs font-medium text-muted block">Payable Balance</span>
                            <span className="text-base font-bold text-deep-plum">
                              ₹{formatCurrency(Math.max(0, (Number(activePaymentApt.price) || 0) - (Number(activePaymentApt.amountPaid) || 0)))}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-primary-rose bg-soft-blush px-2.5 py-1 rounded-full">
                            Full Settlement
                          </span>
                        </div>
                      )}

                      {/* Payment Method Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-deep-plum mb-2">Choose Payment Method</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'UPI', label: 'UPI / QR', desc: 'GPay, PhonePe, Paytm', icon: Smartphone },
                            { id: 'Card', label: 'Cards', desc: 'Debit / Credit', icon: CreditCard },
                            { id: 'NetBanking', label: 'Net Banking', desc: 'HDFC, ICICI, SBI', icon: Building2 },
                          ].map(m => {
                            const IconComponent = m.icon;
                            const isSelected = onlineGatewayMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setOnlineGatewayMethod(m.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  isSelected 
                                    ? 'border-primary-rose bg-soft-blush/30 ring-1 ring-primary-rose'
                                    : 'border-border-color bg-white hover:bg-ivory/40'
                                }`}
                              >
                                <IconComponent className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-primary-rose' : 'text-muted'}`} />
                                <div className="text-xs font-semibold text-deep-plum">{m.label}</div>
                                <div className="text-[10px] text-muted truncate">{m.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Security Assurance Banner */}
                      <div className="p-3 bg-ivory rounded-xl border border-border-color flex items-center gap-2.5 text-[11px] text-muted">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Instant 256-Bit SSL Encrypted Verification • Instant Digital GST Tax Invoice</span>
                      </div>

                      {/* Gateway Trigger Button */}
                      <button
                        type="button"
                        onClick={handleProceedOnlinePayment}
                        disabled={processingGateway}
                        className="w-full py-3 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                      >
                        {processingGateway ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing Secure Transaction...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            <span>
                              Pay ₹{onlineAmountType === 'Advance' && activePaymentApt.advanceAmountRequired > 0 
                                ? formatCurrency(activePaymentApt.advanceAmountRequired) 
                                : formatCurrency(Math.max(0, (Number(activePaymentApt.price) || 0) - (Number(activePaymentApt.amountPaid) || 0)))} via Secure Gateway
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* TAB 2: MANUAL UPI TRANSFER & UTR FORM */
                    <div className="space-y-4">
                      {/* Salon UPI Details */}
                      {activePaymentApt.salonUpiId ? (
                        <div className="p-3 bg-soft-blush/20 rounded-xl border border-border-color">
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
                        <div className="p-3 bg-white rounded-xl border border-border-color text-center">
                          <span className="text-xs font-semibold uppercase text-muted block mb-2">Scan & Pay via UPI App</span>
                          <img
                            src={activePaymentApt.salonQrCodeImageUrl}
                            alt="Salon QR Scanner"
                            className="w-36 h-36 object-contain mx-auto rounded-lg bg-white p-2 border border-border-color shadow-sm"
                          />
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
                              Amount Paid (₹) <span className="text-primary-rose">*</span>
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
                        <div className="pt-3 border-t border-border-color flex justify-end gap-3">
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
                            className="px-5 py-2 bg-primary-rose text-white text-sm font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                          >
                            {submittingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Submit Proof
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

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

        {/* ----------------- MODAL: WRITE VERIFIED REVIEW ----------------- */}
        {reviewingApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-border-color bg-gradient-to-r from-soft-blush/60 to-ivory flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-deep-plum text-lg">Leave a Verified Review</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Visit
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {reviewingApt.serviceName} at <strong className="text-deep-plum">{reviewingApt.salonName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setReviewingApt(null)}
                  className="p-1.5 rounded-full text-muted hover:text-deep-plum hover:bg-white/80 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Success Alert */}
                {reviewSuccess && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl border border-emerald-200 flex items-start gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Review Submitted!</p>
                      <p className="mt-0.5">{reviewSuccess}</p>
                    </div>
                  </div>
                )}

                {/* Error Alert */}
                {reviewError && (
                  <div className="p-3.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {!reviewSuccess && (
                  <form onSubmit={handleSubmitReview} className="space-y-5">
                    {/* Overall Star Rating */}
                    <div className="text-center p-4 bg-ivory/60 rounded-2xl border border-border-color space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                        Overall Rating
                      </label>
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                            className="p-1 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          >
                            <Star
                              className={`w-8 h-8 transition-colors ${
                                star <= reviewForm.rating
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                                  : 'text-gray-300 hover:text-amber-200'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-serif font-medium text-deep-plum block">
                        {reviewForm.rating === 5 && 'Exceptional — 5 / 5 Stars'}
                        {reviewForm.rating === 4 && 'Very Good — 4 / 5 Stars'}
                        {reviewForm.rating === 3 && 'Average — 3 / 5 Stars'}
                        {reviewForm.rating === 2 && 'Needs Improvement — 2 / 5 Stars'}
                        {reviewForm.rating === 1 && 'Unsatisfactory — 1 / 5 Stars'}
                      </span>
                    </div>

                    {/* Detailed Sub-Ratings (Cleanliness, Staff, Value) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-soft-blush/20 rounded-2xl border border-border-color text-xs">
                      {/* Cleanliness */}
                      <div className="space-y-1.5 text-center">
                        <span className="text-muted block text-[11px] font-medium">Cleanliness</span>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setReviewForm(prev => ({ ...prev, cleanlinessRating: s }))}
                              className="cursor-pointer"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  s <= reviewForm.cleanlinessRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Specialist Skill */}
                      <div className="space-y-1.5 text-center">
                        <span className="text-muted block text-[11px] font-medium">Staff Skill</span>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setReviewForm(prev => ({ ...prev, staffRating: s }))}
                              className="cursor-pointer"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  s <= reviewForm.staffRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Value for Money */}
                      <div className="space-y-1.5 text-center">
                        <span className="text-muted block text-[11px] font-medium">Value for Money</span>
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setReviewForm(prev => ({ ...prev, valueRating: s }))}
                              className="cursor-pointer"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  s <= reviewForm.valueRating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Review Title */}
                    <div>
                      <label className="block text-xs font-medium text-deep-plum mb-1.5">
                        Headline / Title (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Flawless haircut and courteous staff!"
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-xl text-xs text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                      />
                    </div>

                    {/* Review Comment */}
                    <div>
                      <label className="block text-xs font-medium text-deep-plum mb-1.5">
                        Your Detailed Review <span className="text-primary-rose">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        minLength={5}
                        maxLength={2000}
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Tell other clients about your experience, the stylist's attention to detail, the salon ambiance, etc..."
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-xl text-xs text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none resize-none transition-all"
                      />
                      <span className="text-[10px] text-muted text-right block mt-1">
                        {reviewForm.comment.length} / 2000 characters (minimum 5)
                      </span>
                    </div>

                    {/* Photo Proof / Results Gallery */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-deep-plum">
                        Add Photos of Results (Optional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={photoInputUrl}
                          onChange={(e) => setPhotoInputUrl(e.target.value)}
                          placeholder="Paste image URL (e.g. https://...)"
                          className="flex-1 px-3 py-2 bg-white border border-border-color rounded-xl text-xs text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddPhotoUrl}
                          className="px-3 py-2 bg-ivory hover:bg-soft-blush border border-border-color text-deep-plum text-xs font-medium rounded-xl transition-colors shrink-0 cursor-pointer"
                        >
                          + Add Photo
                        </button>
                      </div>

                      {/* Photo Previews */}
                      {reviewForm.photoUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {reviewForm.photoUrls.map((url, i) => (
                            <div key={i} className="relative group w-14 h-14 rounded-xl overflow-hidden border border-border-color shadow-2xs">
                              <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemovePhotoUrl(i)}
                                className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex justify-end gap-3 border-t border-border-color/80">
                      <button
                        type="button"
                        onClick={() => setReviewingApt(null)}
                        disabled={submittingReview}
                        className="px-4 py-2.5 text-xs text-muted hover:text-deep-plum rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReview || !reviewForm.comment || reviewForm.comment.trim().length < 5}
                        className="px-6 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submittingReview ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting Review...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish Verified Review</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: VIEW EXISTING REVIEW ----------------- */}
        {viewingReviewApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Your Verified Review</h3>
                  <p className="text-xs text-muted">{viewingReviewApt.salonName} — {viewingReviewApt.serviceName}</p>
                </div>
                <button
                  onClick={() => setViewingReviewApt(null)}
                  className="p-1.5 rounded-full text-muted hover:text-deep-plum hover:bg-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {loadingExistingReview ? (
                  <div className="py-12 flex justify-center text-muted">
                    <RefreshCw className="w-6 h-6 text-primary-rose animate-spin" />
                  </div>
                ) : !existingReviewData ? (
                  <p className="text-xs text-muted py-6 text-center">Unable to load review details.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Score header */}
                    <div className="flex items-center justify-between p-4 bg-soft-blush/30 rounded-2xl border border-border-color">
                      <div>
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-5 h-5 ${
                                star <= existingReviewData.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted mt-1 block">
                          Submitted on {new Date(existingReviewData.createdAtUtc).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Verified Visit
                      </span>
                    </div>

                    {/* Title & Comment */}
                    <div className="space-y-1.5">
                      {existingReviewData.title && (
                        <h4 className="font-serif font-semibold text-deep-plum text-base">
                          {existingReviewData.title}
                        </h4>
                      )}
                      <p className="text-xs text-muted leading-relaxed whitespace-pre-line bg-ivory/50 p-4 rounded-xl border border-border-color">
                        {existingReviewData.comment}
                      </p>
                    </div>

                    {/* Photos */}
                    {existingReviewData.photoUrls && existingReviewData.photoUrls.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-deep-plum block">Your Photos:</span>
                        <div className="flex flex-wrap gap-2">
                          {existingReviewData.photoUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-16 h-16 rounded-xl overflow-hidden border border-border-color hover:border-primary-rose transition-all shadow-2xs"
                            >
                              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Owner Response */}
                    {existingReviewData.ownerReply ? (
                      <div className="p-4 bg-soft-blush/40 rounded-2xl border border-dusty-rose/30 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-deep-plum">
                          <CornerDownRight className="w-4 h-4 text-primary-rose" />
                          <span>Response from Salon Manager</span>
                        </div>
                        <p className="text-muted leading-relaxed pl-5 whitespace-pre-line">
                          {existingReviewData.ownerReply}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-ivory rounded-xl border border-border-color text-xs text-muted italic text-center">
                        The salon manager has not responded to this review yet.
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setViewingReviewApt(null)}
                        className="px-5 py-2 bg-deep-plum text-white text-xs font-semibold rounded-xl hover:bg-deep-plum/90 transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Digital GST Tax Invoice & Receipt Modal */}
        {activeInvoiceAptId && (
          <InvoiceModal 
            appointmentId={activeInvoiceAptId} 
            onClose={() => setActiveInvoiceAptId(null)} 
          />
        )}

        {/* AI Virtual Beauty Stylist Modal (Phase 4) */}
        <AiStylistModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          onSelectService={(service) => {
            setShowAiModal(false);
            if (service) {
              handleAiConsultationSuccess(service);
            }
            handleTabChange('salons');
          }}
        />

        </div>
      </ErrorBoundary>
    </DashboardLayout>
  );
}
