import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
import { subscriptionService } from '../../services/subscriptionService';
import { 
  Building2, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  ShieldCheck, 
  AlertCircle, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Store,
  ChevronRight,
  Sparkles,
  CreditCard,
  TrendingUp,
  Zap,
  Edit3,
  X
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tier Assignment Modal State
  const [editingSalonTier, setEditingSalonTier] = useState(null);
  const [selectedTier, setSelectedTier] = useState('Growth');
  const [selectedCycle, setSelectedCycle] = useState('Monthly');
  const [assigningTier, setAssigningTier] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [overview, subs] = await Promise.all([
        superAdminService.getOverview(),
        subscriptionService.getSuperAdminSubscriptions().catch(() => null)
      ]);
      setData(overview);
      setSubData(subs);
    } catch (err) {
      setError(err.message || 'Failed to load platform overview metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const handleOpenAssignTier = (salon) => {
    setEditingSalonTier(salon);
    setSelectedTier(salon.tier || 'Growth');
    setSelectedCycle(salon.billingCycle || 'Monthly');
    setAssignError('');
  };

  const handleConfirmAssignTier = async (e) => {
    e.preventDefault();
    if (!editingSalonTier) return;
    try {
      setAssigningTier(true);
      setAssignError('');
      await subscriptionService.adminAssignTier(editingSalonTier.salonId, {
        tier: selectedTier,
        billingCycle: selectedCycle
      });
      setEditingSalonTier(null);
      await fetchOverview();
    } catch (err) {
      setAssignError(err.message || 'Failed to assign subscription tier');
    } finally {
      setAssigningTier(false);
    }
  };

  const getKycBadge = (status, isVerified) => {
    const normalized = (status || '').toLowerCase();
    if (isVerified || normalized === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          <span>Verified</span>
        </span>
      );
    }
    if (normalized === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          <span>Pending KYC</span>
        </span>
      );
    }
    if (normalized === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" />
          <span>Rejected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
        <span>Not Submitted</span>
      </span>
    );
  };

  return (
    <SuperAdminLayout 
      title="Platform Operations & Overview"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      <div className="space-y-8">
        
        {/* ========================================================================= */}
        {/* 1. WELCOME & QUICK SHORTCUTS                                             */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant Platform Monitor</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-deep-plum">
              System Command Center
            </h2>
            <p className="text-sm text-muted max-w-xl leading-relaxed">
              Real-time platform metrics, tenant lifecycle tracking, KYC verification queues, and system account audits across all registered beauty studios.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Link
              to="/superadmin/salons"
              className="px-4 py-2.5 bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose rounded-xl text-xs font-semibold transition-all hover:bg-soft-blush shadow-2xs inline-flex items-center gap-2"
            >
              <Store className="w-4 h-4 text-primary-rose" />
              <span>All Salons</span>
            </Link>
            <Link
              to="/superadmin/kyc"
              className="px-4 py-2.5 bg-primary-rose text-white hover:bg-primary-rose/90 rounded-xl text-xs font-semibold transition-all shadow-xs inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Review KYC Queue</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. LOADING, ERROR & REAL METRICS CARDS                                    */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-border-color p-5 space-y-3">
                <div className="w-10 h-10 bg-soft-blush rounded-xl" />
                <div className="h-4 bg-soft-blush/60 rounded w-1/2" />
                <div className="h-6 bg-soft-blush rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-border-color p-10 text-center max-w-md mx-auto shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-deep-plum">Unable to Load Overview</h3>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchOverview}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : (
          <>
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Metric 1: Total Salons */}
              <div className="bg-white rounded-2xl p-5 border border-border-color shadow-2xs hover:border-dusty-rose transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Total Salons
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-soft-blush flex items-center justify-center text-primary-rose">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div>
                  <div className="font-serif text-3xl font-bold text-deep-plum">
                    {data?.totalSalons ?? 0}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-emerald-700">{data?.activeSalons ?? 0} active</span>
                    <span>on directory</span>
                  </div>
                </div>
              </div>

              {/* Metric 2: Pending KYC & Verification */}
              <div className="bg-white rounded-2xl p-5 border border-border-color shadow-2xs hover:border-dusty-rose transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    KYC Action Required
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div>
                  <div className="font-serif text-3xl font-bold text-deep-plum">
                    {data?.pendingVerificationSalons ?? 0}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted">Awaiting review</span>
                    <Link 
                      to="/superadmin/kyc" 
                      className="text-primary-rose font-medium hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Review queue</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Metric 3: Total Platform Users */}
              <div className="bg-white rounded-2xl p-5 border border-border-color shadow-2xs hover:border-dusty-rose transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Platform Accounts
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-soft-blush flex items-center justify-center text-primary-rose">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div>
                  <div className="font-serif text-3xl font-bold text-deep-plum">
                    {data?.totalUsers ?? 0}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span><strong className="text-deep-plum">{data?.totalCustomers ?? 0}</strong> clients</span>
                    <span>•</span>
                    <span><strong className="text-deep-plum">{data?.totalSalonAdmins ?? 0}</strong> admins</span>
                  </div>
                </div>
              </div>

              {/* Metric 4: Platform Gross Revenue */}
              <div className="bg-white rounded-2xl p-5 border border-border-color shadow-2xs hover:border-dusty-rose transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Gross Platform GMV
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <IndianRupee className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl font-bold text-deep-plum truncate" title={formatCurrency(data?.totalGrossRevenue)}>
                    {formatCurrency(data?.totalGrossRevenue)}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <CalendarCheck className="w-3.5 h-3.5 text-primary-rose" />
                    <span><strong className="text-deep-plum">{data?.totalAppointments ?? 0}</strong> total bookings</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Platform Status Alert Card */}
            <div className="bg-gradient-to-r from-soft-blush/60 via-ivory to-white rounded-2xl p-4 sm:p-5 border border-border-color flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="text-xs font-bold text-deep-plum uppercase tracking-wider">
                    System State: {data?.platformHealth || 'Healthy'}
                  </span>
                  <p className="text-xs text-muted">
                    Core API, SQL Server database connection, and appointment reminder workers are operational.
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted flex items-center gap-4">
                <span>Active Salons Rate: <strong>{data?.totalSalons ? Math.round((data.activeSalons / data.totalSalons) * 100) : 0}%</strong></span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. SAAS SUBSCRIPTION REVENUE & BILLING ENGINE                             */}
            {/* ========================================================================= */}
            {subData && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-border-color shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold uppercase tracking-wider mb-2">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>SaaS Subscription Engine</span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-deep-plum">
                      Platform Subscription Revenue & Tiers
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Recurring software revenues, tier allocations, and vendor plan assignments.
                    </p>
                  </div>

                  {/* Tiers Breakdown Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-ivory border border-border-color text-deep-plum">
                      Starter: <strong>{subData.starterCount}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-tint border border-primary-rose/30 text-primary-rose">
                      Growth: <strong>{subData.growthCount}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-deep-plum text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" /> Luxury Pro: <strong>{subData.luxuryProCount ?? subData.proCount ?? 0}</strong>
                    </span>
                  </div>
                </div>

                {/* SaaS Metrics 2-Card Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="p-5 bg-gradient-to-br from-soft-blush/30 to-ivory rounded-2xl border border-border-color flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Monthly Recurring Revenue (MRR)</span>
                      <div className="text-3xl font-serif font-bold text-deep-plum mt-1">
                        ₹{subData.monthlyRecurringRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] text-muted mt-1">Normalized active monthly software subscriptions</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white border border-border-color flex items-center justify-center text-primary-rose shadow-2xs">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-soft-blush/30 to-ivory rounded-2xl border border-border-color flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Annual Run Rate (ARR)</span>
                      <div className="text-3xl font-serif font-bold text-emerald-800 mt-1">
                        ₹{subData.annualRunRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <p className="text-[11px] text-muted mt-1">Projected 12-month platform software run-rate</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white border border-border-color flex items-center justify-center text-emerald-700 shadow-2xs">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Salons Subscription Table */}
                <div className="border border-border-color rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 bg-ivory/60 border-b border-border-color flex justify-between items-center text-xs font-semibold text-deep-plum">
                    <span>Active Salon Plans ({subData.salons.length})</span>
                    <span className="text-muted font-normal">Click 'Change Tier' to reassign plan privileges</span>
                  </div>

                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-ivory/30 text-muted uppercase font-semibold border-b border-border-color sticky top-0">
                        <tr>
                          <th className="px-5 py-3">Salon</th>
                          <th className="px-5 py-3">Location</th>
                          <th className="px-5 py-3">Active Tier</th>
                          <th className="px-5 py-3">Cycle</th>
                          <th className="px-5 py-3">Team / Catalog</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {subData.salons.map((s) => (
                          <tr key={s.salonId} className="hover:bg-soft-blush/20 transition-colors">
                            <td className="px-5 py-3 font-semibold text-deep-plum">{s.salonName}</td>
                            <td className="px-5 py-3 text-muted">{s.city}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                                s.tier.toLowerCase() === 'luxurypro' ? 'bg-deep-plum text-white' :
                                s.tier.toLowerCase() === 'growth' ? 'bg-rose-tint text-primary-rose border border-primary-rose/30' :
                                'bg-ivory text-deep-plum border border-border-color'
                              }`}>
                                {s.tier === 'LuxuryPro' ? 'Luxury Pro' : s.tier}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-muted">{s.billingCycle}</td>
                            <td className="px-5 py-3 text-muted">
                              {s.staffCount} staff • {s.servicesCount} services
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenAssignTier(s)}
                                className="px-2.5 py-1 bg-white border border-border-color hover:border-primary-rose text-deep-plum rounded-lg text-xs font-medium transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-primary-rose" />
                                <span>Change Tier</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. RECENT SALONS DIRECTORY LIST                                           */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-border-color shadow-xs overflow-hidden">
              <div className="p-6 border-b border-border-color flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    Recently Registered Salons
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Latest five studios onboarded to the F&R Beauty Studio multi-tenant network.
                  </p>
                </div>
                <Link
                  to="/superadmin/salons"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-rose hover:text-deep-plum transition-colors self-start sm:self-center"
                >
                  <span>View All {data?.totalSalons ?? ''} Salons</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {(!data?.recentSalons || data.recentSalons.length === 0) ? (
                <div className="p-12 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-soft-blush flex items-center justify-center text-primary-rose mx-auto">
                    <Store className="w-6 h-6 opacity-80" />
                  </div>
                  <h4 className="font-serif text-base font-medium text-deep-plum">No Salons Registered Yet</h4>
                  <p className="text-xs text-muted">
                    When new salons sign up on the platform, their onboarding records will display here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-muted">
                    <thead className="bg-ivory/80 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border-color">
                      <tr>
                        <th className="py-3.5 px-6">Salon Details</th>
                        <th className="py-3.5 px-6">Type & Location</th>
                        <th className="py-3.5 px-6">KYC Status</th>
                        <th className="py-3.5 px-6">Directory Status</th>
                        <th className="py-3.5 px-6">Registered On</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/70 font-sans">
                      {data.recentSalons.map((salon) => (
                        <tr key={salon.id} className="hover:bg-soft-blush/30 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-soft-blush border border-dusty-rose/30 text-deep-plum font-serif text-sm font-bold flex items-center justify-center shrink-0">
                                {salon.name?.charAt(0) || 'S'}
                              </div>
                              <div className="min-w-0">
                                <Link 
                                  to={`/superadmin/salons/${salon.id}`}
                                  className="font-medium text-deep-plum hover:text-primary-rose transition-colors truncate block text-sm"
                                >
                                  {salon.name}
                                </Link>
                                <span className="text-[11px] text-muted">/{salon.slug}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="space-y-0.5">
                              <span className="font-medium text-deep-plum block">{salon.businessType}</span>
                              <span className="text-[11px] text-muted">{salon.city || 'Location not specified'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getKycBadge(salon.kycStatus, salon.isVerified)}
                          </td>
                          <td className="py-4 px-6">
                            {salon.isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                <span>Inactive</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap text-muted">
                            {formatDate(salon.createdAtUtc)}
                          </td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <Link
                              to={`/superadmin/salons/${salon.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose hover:bg-soft-blush rounded-lg font-medium text-xs transition-all shadow-2xs"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ----------------- SUPERADMIN TIER ASSIGNMENT MODAL ----------------- */}
        {editingSalonTier && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-border-color shadow-2xl overflow-hidden my-8">
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Assign Subscription Tier</h3>
                  <p className="text-xs text-muted">{editingSalonTier.salonName}</p>
                </div>
                <button
                  onClick={() => setEditingSalonTier(null)}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmAssignTier} className="p-6 space-y-4">
                {assignError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {assignError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">Select Tier</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                  >
                    <option value="Starter">Starter Solo (1 Staff, 5 Services, 5% fee)</option>
                    <option value="Growth">Growth Studio (10 Staff, Unlimited Services, 2.5% fee)</option>
                    <option value="LuxuryPro">Luxury Pro (Unlimited Staff & Services, 0% fee)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">Billing Cadence</label>
                  <select
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual (Prepaid)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-border-color flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingSalonTier(null)}
                    disabled={assigningTier}
                    className="px-4 py-2 text-xs text-muted hover:text-deep-plum transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigningTier}
                    className="px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {assigningTier ? 'Saving...' : 'Confirm Tier Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </SuperAdminLayout>
  );
}
