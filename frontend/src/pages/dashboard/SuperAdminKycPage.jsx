import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCcw, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  FileCheck
} from 'lucide-react';

const KYC_TABS = [
  { id: 'Pending', label: 'Pending Review', countKey: 'pending' },
  { id: 'NotSubmitted', label: 'Not Submitted' },
  { id: 'Rejected', label: 'Rejected' },
  { id: 'Verified', label: 'Verified' },
  { id: 'all', label: 'All Salons' },
];

export default function SuperAdminKycPage() {
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [salons, setSalons] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
    totalCount: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Decision Modal
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    salon: null,
    kycStatus: 'Verified',
    notes: '',
    isSubmitting: false,
    error: '',
    success: ''
  });

  const fetchKycSalons = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = {
        page: currentPage,
        pageSize: 15
      };

      if (searchTerm.trim()) {
        queryParams.search = searchTerm.trim();
      }

      if (activeTab !== 'all') {
        queryParams.kycStatus = activeTab;
      }

      const res = await superAdminService.getSalons(queryParams);
      const items = res.items || (Array.isArray(res) ? res : []);
      setSalons(items);
      setPagination({
        page: res.page || currentPage,
        pageSize: res.pageSize || 15,
        totalCount: typeof res.totalCount === 'number' ? res.totalCount : items.length,
        totalPages: res.totalPages || Math.ceil((res.totalCount || items.length) / 15) || 1,
        hasPreviousPage: !!res.hasPreviousPage,
        hasNextPage: !!res.hasNextPage
      });
    } catch (err) {
      setError(err.message || 'Failed to retrieve KYC queue.');
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, searchTerm]);

  useEffect(() => {
    fetchKycSalons();
  }, [fetchKycSalons]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const openReviewModal = (salon, targetStatus = 'Verified') => {
    setReviewModal({
      isOpen: true,
      salon,
      kycStatus: targetStatus,
      notes: '',
      isSubmitting: false,
      error: '',
      success: ''
    });
  };

  const submitKycDecision = async (e) => {
    e.preventDefault();
    if (!reviewModal.salon) return;

    const confirmMsg = `Confirm KYC decision "${reviewModal.kycStatus}" for "${reviewModal.salon.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setReviewModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      const updated = await superAdminService.updateSalonKyc(reviewModal.salon.id, {
        kycStatus: reviewModal.kycStatus,
        isVerified: reviewModal.kycStatus === 'Verified',
        notes: reviewModal.notes.trim() || undefined
      });

      // Update in local state
      setSalons(prev => prev.map(s => 
        s.id === reviewModal.salon.id ? { ...s, kycStatus: updated.kycStatus, isVerified: updated.isVerified } : s
      ));

      setReviewModal(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        success: `Decision saved: ${updated.name} is now ${updated.kycStatus}.`
      }));

      // Auto close after 1 second or let user close
      setTimeout(() => {
        setReviewModal({ isOpen: false, salon: null, kycStatus: 'Verified', notes: '', isSubmitting: false, error: '', success: '' });
        fetchKycSalons();
      }, 1200);

    } catch (err) {
      setReviewModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update KYC status' }));
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
          <span>Pending Review</span>
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
      title="KYC Compliance & Verification Queue"
      breadcrumbs={[{ label: 'KYC Verification' }]}
    >
      <div className="space-y-6">

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Compliance Desk</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-deep-plum">
              Vendor KYC Review Queue
            </h2>
            <p className="text-xs text-muted max-w-xl leading-relaxed">
              Review partner credentials, grant Verified platform badges, or reject non-compliant salon submissions with formal audit logging.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchKycSalons}
              className="px-4 py-2 bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose rounded-xl text-xs font-semibold transition-all hover:bg-soft-blush shadow-2xs inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Tab Filters & Search Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-color shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {KYC_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-deep-plum text-white shadow-2xs'
                        : 'bg-ivory text-muted hover:text-deep-plum hover:bg-soft-blush border border-border-color'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search salons..."
                className="w-full pl-10 pr-8 py-2 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/70"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep-plum"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KYC Queue Content */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-border-color p-8 animate-pulse space-y-4">
            <div className="h-6 bg-soft-blush/60 rounded w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-ivory rounded-2xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl border border-border-color p-12 text-center max-w-md mx-auto shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-deep-plum">Failed to Load KYC Queue</h3>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchKycSalons}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : salons.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border-color p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose mx-auto">
              <FileCheck className="w-7 h-7 opacity-80" />
            </div>
            <h3 className="font-serif text-xl font-medium text-deep-plum">
              {activeTab === 'Pending' ? 'KYC Queue Clean' : 'No Salons in this Category'}
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              {activeTab === 'Pending'
                ? 'All submitted salons have been reviewed. There are no pending KYC documents awaiting action.'
                : 'No salons currently match this compliance category filter.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border-color shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted">
                <thead className="bg-ivory/80 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border-color">
                  <tr>
                    <th className="py-3.5 px-6">Salon Submission</th>
                    <th className="py-3.5 px-6">Location</th>
                    <th className="py-3.5 px-6">Owner / Contact</th>
                    <th className="py-3.5 px-6">Current KYC Status</th>
                    <th className="py-3.5 px-6 text-right">Quick Compliance Decisions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/70 font-sans">
                  {salons.map((salon) => (
                    <tr key={salon.id} className="hover:bg-soft-blush/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-soft-blush border border-dusty-rose/30 text-deep-plum font-serif text-base font-bold flex items-center justify-center shrink-0">
                            {salon.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <Link 
                              to={`/superadmin/salons/${salon.id}`}
                              className="font-medium text-deep-plum hover:text-primary-rose transition-colors text-sm"
                            >
                              {salon.name}
                            </Link>
                            <div className="text-[11px] text-muted">
                              <span>/{salon.slug}</span>
                              <span className="mx-1">•</span>
                              <span className="text-primary-rose">{salon.businessType}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-deep-plum">
                          <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{[salon.city, salon.state].filter(Boolean).join(', ') || 'Not specified'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="font-medium text-deep-plum block">{salon.adminFullName || 'Unassigned'}</span>
                          {salon.adminEmail && (
                            <span className="text-[11px] text-muted block truncate max-w-[170px]">{salon.adminEmail}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        {getKycBadge(salon.kycStatus, salon.isVerified)}
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/superadmin/salons/${salon.id}`}
                            className="px-3 py-1.5 bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose rounded-lg text-xs font-medium hover:bg-soft-blush transition-colors"
                          >
                            <span>Inspect</span>
                          </Link>

                          {salon.kycStatus !== 'Verified' && (
                            <button
                              type="button"
                              onClick={() => openReviewModal(salon, 'Verified')}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          {salon.kycStatus !== 'Rejected' && (
                            <button
                              type="button"
                              onClick={() => openReviewModal(salon, 'Rejected')}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-border-color flex flex-col sm:flex-row items-center justify-between gap-4 bg-ivory/50">
                <span className="text-xs text-muted">
                  Showing page <strong className="text-deep-plum">{pagination.page}</strong> of <strong className="text-deep-plum">{pagination.totalPages}</strong> ({pagination.totalCount} total submissions)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPreviousPage}
                    className="px-3 py-1.5 bg-white text-deep-plum border border-border-color rounded-lg text-xs font-medium hover:bg-soft-blush transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1.5 bg-white text-deep-plum border border-border-color rounded-lg text-xs font-medium hover:bg-soft-blush transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* REVIEW DECISION MODAL                                                     */}
        {/* ========================================================================= */}
        {reviewModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-color shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    {reviewModal.kycStatus === 'Verified' ? 'Approve & Verify KYC' : 'Reject KYC Submission'}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Tenant: <strong>{reviewModal.salon?.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModal({ isOpen: false, salon: null, kycStatus: 'Verified', notes: '', isSubmitting: false, error: '', success: '' })}
                  className="text-muted hover:text-deep-plum p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reviewModal.success && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reviewModal.success}</span>
                </div>
              )}

              {reviewModal.error && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                  {reviewModal.error}
                </div>
              )}

              <form onSubmit={submitKycDecision} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Target Decision
                  </label>
                  <select
                    value={reviewModal.kycStatus}
                    onChange={(e) => setReviewModal(prev => ({ ...prev, kycStatus: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium"
                  >
                    <option value="Verified">Verified (Approved)</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Mark Pending / Request Resubmission</option>
                    <option value="NotSubmitted">Reset to Not Submitted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Review Reason / Audit Note
                  </label>
                  <textarea
                    rows={3}
                    value={reviewModal.notes}
                    onChange={(e) => setReviewModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter compliance notes for this action..."
                    className="w-full px-3 py-2 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/60"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModal({ isOpen: false, salon: null, kycStatus: 'Verified', notes: '', isSubmitting: false, error: '', success: '' })}
                    className="px-4 py-2 border border-border-color text-muted hover:text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewModal.isSubmitting}
                    className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all disabled:opacity-50 ${
                      reviewModal.kycStatus === 'Verified' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {reviewModal.isSubmitting ? 'Submitting...' : 'Confirm Decision'}
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
