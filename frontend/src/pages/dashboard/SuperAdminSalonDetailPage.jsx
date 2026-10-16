import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Scissors, 
  Users, 
  IndianRupee, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Power, 
  RotateCcw,
  Globe
} from 'lucide-react';

export default function SuperAdminSalonDetailPage() {
  const { id } = useParams();

  const [salon, setSalon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status Action Form
  const [statusForm, setStatusForm] = useState({ reason: '', isSubmitting: false, message: '', error: '' });

  // KYC Action Form
  const [kycForm, setKycForm] = useState({ 
    kycStatus: 'Verified', 
    isVerified: true, 
    notes: '', 
    isSubmitting: false, 
    message: '', 
    error: '' 
  });

  const fetchSalonDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await superAdminService.getSalonById(id);
      setSalon(data);
      setKycForm(prev => ({
        ...prev,
        kycStatus: data.kycStatus || 'Pending',
        isVerified: data.isVerified
      }));
    } catch (err) {
      setError(err.message || 'Failed to load salon details from server.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSalonDetail();
  }, [fetchSalonDetail]);

  const handleStatusToggle = async () => {
    if (!salon) return;
    const nextStatus = !salon.isActive;
    const confirmMsg = nextStatus
      ? `Are you sure you want to activate "${salon.name}" and make it visible on the public directory?`
      : `Are you sure you want to suspend "${salon.name}"? This will hide it from customer searches.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setStatusForm(prev => ({ ...prev, isSubmitting: true, error: '', message: '' }));
      const res = await superAdminService.updateSalonStatus(salon.id, {
        isActive: nextStatus,
        reason: statusForm.reason.trim() || undefined
      });

      setSalon(prev => ({ ...prev, isActive: nextStatus }));
      setStatusForm(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        message: res.message || `Salon is now ${nextStatus ? 'Active' : 'Inactive'}.`,
        reason: '' 
      }));
    } catch (err) {
      setStatusForm(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update status' }));
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!salon) return;

    const confirmMsg = `Apply compliance decision "${kycForm.kycStatus}" for ${salon.name}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setKycForm(prev => ({ ...prev, isSubmitting: true, error: '', message: '' }));
      const updated = await superAdminService.updateSalonKyc(salon.id, {
        kycStatus: kycForm.kycStatus,
        isVerified: kycForm.kycStatus === 'Verified',
        notes: kycForm.notes.trim() || undefined
      });

      setSalon(updated);
      setKycForm(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        message: 'KYC status successfully updated and logged in compliance audits.',
        notes: ''
      }));
    } catch (err) {
      setKycForm(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update KYC' }));
    }
  };

  const formatCurrency = (amount, currencyCode = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode || 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <SuperAdminLayout
      title={salon ? salon.name : 'Salon Tenant Overview'}
      breadcrumbs={[
        { label: 'Salons', href: '/superadmin/salons' },
        { label: salon ? salon.name : 'Details' }
      ]}
    >
      <div className="space-y-6">

        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/superadmin/salons"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-deep-plum transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Salons Directory</span>
          </Link>
          
          {salon && (
            <a
              href={`/salons/${salon.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary-rose hover:underline inline-flex items-center gap-1"
            >
              <span>View Public Page</span>
              <Globe className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-border-color p-8 animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-soft-blush rounded-2xl" />
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-soft-blush rounded w-1/3" />
                <div className="h-4 bg-soft-blush/60 rounded w-1/4" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-ivory rounded-2xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-border-color p-12 text-center max-w-md mx-auto shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-deep-plum">Unable to Load Salon</h3>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchSalonDetail}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : !salon ? null : (
          <>
            {/* Salon Profile Hero Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                {salon.logoUrl ? (
                  <img
                    src={salon.logoUrl}
                    alt={salon.name}
                    className="w-18 h-18 rounded-2xl object-cover border border-border-color bg-white shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-soft-blush to-rose-tint border border-dusty-rose/40 flex items-center justify-center text-deep-plum font-serif text-3xl font-bold shrink-0 shadow-2xs">
                    {salon.name?.charAt(0) || 'S'}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-rose bg-soft-blush px-2.5 py-0.5 rounded-full border border-dusty-rose/40">
                      {salon.businessType}
                    </span>

                    {salon.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Directory
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Suspended / Inactive
                      </span>
                    )}

                    {salon.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3" />
                        {salon.kycStatus || 'Pending KYC'}
                      </span>
                    )}
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl font-medium text-deep-plum">
                    {salon.name}
                  </h2>
                  <p className="text-xs text-muted">
                    Unique Slug Identifier: <code className="bg-ivory px-2 py-0.5 rounded text-deep-plum border border-border-color font-mono">/{salon.slug}</code>
                  </p>
                </div>
              </div>

              {/* Status Action Switch */}
              <div className="flex flex-col sm:items-end gap-2">
                <button
                  type="button"
                  onClick={handleStatusToggle}
                  disabled={statusForm.isSubmitting}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 ${
                    salon.isActive ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{statusForm.isSubmitting ? 'Updating...' : salon.isActive ? 'Suspend Salon' : 'Activate Salon'}</span>
                </button>
                {statusForm.message && (
                  <span className="text-xs text-emerald-700 font-medium">{statusForm.message}</span>
                )}
                {statusForm.error && (
                  <span className="text-xs text-rose-700 font-medium">{statusForm.error}</span>
                )}
              </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-border-color shadow-2xs">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">Total Staff</span>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-2xl font-bold text-deep-plum">{salon.totalStaff}</span>
                  <Users className="w-5 h-5 text-muted/60" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-border-color shadow-2xs">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">Services Offered</span>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-2xl font-bold text-deep-plum">{salon.totalServices}</span>
                  <Scissors className="w-5 h-5 text-muted/60" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-border-color shadow-2xs">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">Appointments</span>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-2xl font-bold text-deep-plum">{salon.totalAppointments}</span>
                  <Calendar className="w-5 h-5 text-muted/60" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-border-color shadow-2xs">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">Gross Revenue</span>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xl sm:text-2xl font-bold text-deep-plum truncate" title={formatCurrency(salon.totalRevenue, salon.currencyCode)}>
                    {formatCurrency(salon.totalRevenue, salon.currencyCode)}
                  </span>
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Two-Column Detail Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (2 spans): Contact & Profile Information */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Profile Information Card */}
                <div className="bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-4">
                  <h3 className="font-serif text-lg font-medium text-deep-plum pb-3 border-b border-border-color">
                    Salon Profile & Details
                  </h3>

                  {salon.description && (
                    <div>
                      <span className="text-xs font-semibold text-muted block mb-1">Description</span>
                      <p className="text-xs text-deep-plum leading-relaxed bg-ivory p-3.5 rounded-2xl border border-border-color">
                        {salon.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-muted block mb-0.5">Physical Address</span>
                      <p className="text-deep-plum">
                        {[salon.addressLine, salon.city, salon.state, salon.postalCode, salon.country].filter(Boolean).join(', ') || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <span className="font-semibold text-muted block mb-0.5">Operational TimeZone</span>
                      <p className="text-deep-plum font-mono">{salon.timeZone || 'Asia/Kolkata'}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-muted block mb-0.5">Contact Email</span>
                      <p className="text-deep-plum">{salon.contactEmail || 'Not specified'}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-muted block mb-0.5">Phone Number</span>
                      <p className="text-deep-plum">{salon.phoneNumber || 'Not specified'}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-muted block mb-0.5">Onboarding State</span>
                      <p className="text-deep-plum">{salon.onboardingState || 'Created'}</p>
                    </div>

                    <div>
                      <span className="font-semibold text-muted block mb-0.5">Registration Timestamp</span>
                      <p className="text-deep-plum">{formatDate(salon.createdAtUtc)}</p>
                    </div>
                  </div>
                </div>

                {/* Primary Administrator Account Card */}
                <div className="bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-4">
                  <h3 className="font-serif text-lg font-medium text-deep-plum pb-3 border-b border-border-color">
                    Primary Salon Administrator
                  </h3>

                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-deep-plum text-white flex items-center justify-center font-serif text-lg font-bold">
                      {salon.adminFullName?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-deep-plum">{salon.adminFullName || 'Unassigned Admin'}</h4>
                      <p className="text-xs text-muted">{salon.adminEmail || 'No email associated'}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-soft-blush text-primary-rose">
                        Tenant Owner Role
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (1 span): Compliance & KYC Review Actions */}
              <div className="space-y-6">
                
                {/* KYC Decision Card */}
                <div className="bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border-color">
                    <ShieldCheck className="w-5 h-5 text-primary-rose" />
                    <h3 className="font-serif text-lg font-medium text-deep-plum">
                      KYC Compliance Decision
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ivory border border-border-color text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Current Status:</span>
                      <span className="font-semibold text-deep-plum">{salon.kycStatus || 'NotSubmitted'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Verified Badge:</span>
                      <span className={`font-semibold ${salon.isVerified ? 'text-emerald-700' : 'text-gray-600'}`}>
                        {salon.isVerified ? 'Active (Displaying)' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {kycForm.message && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{kycForm.message}</span>
                    </div>
                  )}

                  {kycForm.error && (
                    <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                      {kycForm.error}
                    </div>
                  )}

                  <form onSubmit={handleKycSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                        Update Status
                      </label>
                      <select
                        value={kycForm.kycStatus}
                        onChange={(e) => setKycForm(prev => ({ 
                          ...prev, 
                          kycStatus: e.target.value,
                          isVerified: e.target.value === 'Verified'
                        }))}
                        className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium"
                      >
                        <option value="Verified">Verified (Approve KYC & Grant Verified Badge)</option>
                        <option value="Pending">Pending (Under Review)</option>
                        <option value="Rejected">Rejected (Non-compliant documentation)</option>
                        <option value="NotSubmitted">Not Submitted</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                        Internal Review Notes / Rejection Reason
                      </label>
                      <textarea
                        rows={3}
                        value={kycForm.notes}
                        onChange={(e) => setKycForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add reason for audit log (e.g. Government registration verified, incorrect GST document)..."
                        className="w-full px-3 py-2 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/60"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={kycForm.isSubmitting}
                      className="w-full py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all disabled:opacity-50"
                    >
                      {kycForm.isSubmitting ? 'Logging Decision...' : 'Save Compliance Decision'}
                    </button>
                  </form>
                </div>

                {/* Suspension Reason Card */}
                <div className="bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Administrative Action Note
                  </h4>
                  <p className="text-xs text-muted leading-relaxed">
                    Optional reason text to log before toggling active/inactive status.
                  </p>
                  <input
                    type="text"
                    value={statusForm.reason}
                    onChange={(e) => setStatusForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Non-payment, Owner request..."
                    className="w-full px-3 py-2 bg-ivory text-xs border border-border-color rounded-xl text-deep-plum placeholder:text-muted/60"
                  />
                </div>

              </div>

            </div>
          </>
        )}

      </div>
    </SuperAdminLayout>
  );
}
