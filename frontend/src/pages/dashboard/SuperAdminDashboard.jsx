import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
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
  Sparkles
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const overview = await superAdminService.getOverview();
      setData(overview);
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
            {/* 3. RECENT SALONS DIRECTORY LIST                                           */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-border-color shadow-xs overflow-hidden">
              <div className="p-6 border-b border-border-color flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    Recently Registered Salons
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Latest five studios onboarded to the SalonBook multi-tenant network.
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

      </div>
    </SuperAdminLayout>
  );
}
