import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
import { 
  Store, 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Power, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Scissors, 
  Calendar 
} from 'lucide-react';

export default function SuperAdminSalonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter state from URL
  const initialSearch = searchParams.get('search') || '';
  const initialActive = searchParams.get('isActive') || 'all';
  const initialKyc = searchParams.get('kycStatus') || 'all';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [activeFilter, setActiveFilter] = useState(initialActive);
  const [kycFilter, setKycFilter] = useState(initialKyc);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);

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

  // Modals for Actions
  const [statusModal, setStatusModal] = useState({ isOpen: false, salon: null, isActive: false, reason: '', isSubmitting: false, error: '' });
  const [kycModal, setKycModal] = useState({ isOpen: false, salon: null, kycStatus: 'Verified', isVerified: true, notes: '', isSubmitting: false, error: '' });

  const fetchSalons = useCallback(async (params) => {
    try {
      setLoading(true);
      setError('');

      const queryParams = {
        page: params.page || 1,
        pageSize: 15
      };

      if (params.search && params.search.trim()) {
        queryParams.search = params.search.trim();
      }

      if (params.isActive !== 'all' && params.isActive !== undefined) {
        queryParams.isActive = params.isActive === 'true';
      }

      if (params.kycStatus !== 'all' && params.kycStatus !== undefined) {
        queryParams.kycStatus = params.kycStatus;
      }

      const res = await superAdminService.getSalons(queryParams);
      const items = res.items || (Array.isArray(res) ? res : []);
      setSalons(items);
      setPagination({
        page: res.page || params.page || 1,
        pageSize: res.pageSize || 15,
        totalCount: typeof res.totalCount === 'number' ? res.totalCount : items.length,
        totalPages: res.totalPages || Math.ceil((res.totalCount || items.length) / 15) || 1,
        hasPreviousPage: !!res.hasPreviousPage,
        hasNextPage: !!res.hasNextPage
      });
    } catch (err) {
      setError(err.message || 'Failed to retrieve salons from server.');
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with URL params
  useEffect(() => {
    fetchSalons({
      search: searchTerm,
      isActive: activeFilter,
      kycStatus: kycFilter,
      page: currentPage
    });

    const nextParams = new URLSearchParams();
    if (searchTerm) nextParams.set('search', searchTerm);
    if (activeFilter !== 'all') nextParams.set('isActive', activeFilter);
    if (kycFilter !== 'all') nextParams.set('kycStatus', kycFilter);
    if (currentPage > 1) nextParams.set('page', currentPage.toString());
    setSearchParams(nextParams, { replace: true });
  }, [searchTerm, activeFilter, kycFilter, currentPage, fetchSalons, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSalons({
      search: searchTerm,
      isActive: activeFilter,
      kycStatus: kycFilter,
      page: 1
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveFilter('all');
    setKycFilter('all');
    setCurrentPage(1);
  };

  // Status Action Handler
  const openStatusModal = (salon) => {
    setStatusModal({
      isOpen: true,
      salon,
      isActive: !salon.isActive,
      reason: '',
      isSubmitting: false,
      error: ''
    });
  };

  const submitStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModal.salon) return;
    try {
      setStatusModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await superAdminService.updateSalonStatus(statusModal.salon.id, {
        isActive: statusModal.isActive,
        reason: statusModal.reason.trim() || undefined
      });

      // Update local state cleanly
      setSalons(prev => prev.map(s => 
        s.id === statusModal.salon.id ? { ...s, isActive: statusModal.isActive } : s
      ));
      setStatusModal({ isOpen: false, salon: null, isActive: false, reason: '', isSubmitting: false, error: '' });
    } catch (err) {
      setStatusModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update salon status' }));
    }
  };

  // KYC Action Handler
  const openKycModal = (salon) => {
    setKycModal({
      isOpen: true,
      salon,
      kycStatus: salon.kycStatus === 'Verified' ? 'Verified' : 'Verified',
      isVerified: true,
      notes: '',
      isSubmitting: false,
      error: ''
    });
  };

  const submitKycChange = async (e) => {
    e.preventDefault();
    if (!kycModal.salon) return;
    try {
      setKycModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      const updated = await superAdminService.updateSalonKyc(kycModal.salon.id, {
        kycStatus: kycModal.kycStatus,
        isVerified: kycModal.kycStatus === 'Verified',
        notes: kycModal.notes.trim() || undefined
      });

      setSalons(prev => prev.map(s => 
        s.id === kycModal.salon.id ? { ...s, kycStatus: updated.kycStatus, isVerified: updated.isVerified } : s
      ));
      setKycModal({ isOpen: false, salon: null, kycStatus: 'Verified', isVerified: true, notes: '', isSubmitting: false, error: '' });
    } catch (err) {
      setKycModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update KYC status' }));
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

  const hasActiveFilters = searchTerm.trim() !== '' || activeFilter !== 'all' || kycFilter !== 'all';

  return (
    <SuperAdminLayout 
      title="Salon Tenant Management"
      breadcrumbs={[{ label: 'Salons' }]}
    >
      <div className="space-y-6">

        {/* ========================================================================= */}
        {/* 1. FILTER & SEARCH CONTROL BAR                                           */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-color shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-medium text-deep-plum">
                Registered Salons Directory
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Browse, search, review KYC documents, and control salon availability across the platform.
              </p>
            </div>

            {!loading && !error && (
              <span className="text-xs text-muted bg-ivory px-3 py-1 rounded-full border border-border-color shadow-2xs self-start sm:self-center font-medium">
                {pagination.totalCount} {pagination.totalCount === 1 ? 'salon total' : 'salons total'}
              </span>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, slug, city..."
                className="w-full pl-10 pr-4 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/70 transition-all"
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

            {/* Active Status Filter */}
            <div>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium transition-all"
              >
                <option value="all">Active Status: All</option>
                <option value="true">Active Salons Only</option>
                <option value="false">Inactive / Suspended Only</option>
              </select>
            </div>

            {/* KYC Status Filter */}
            <div>
              <select
                value={kycFilter}
                onChange={(e) => {
                  setKycFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium transition-all"
              >
                <option value="all">KYC Status: All</option>
                <option value="Verified">Verified Only</option>
                <option value="Pending">Pending KYC Review</option>
                <option value="Rejected">Rejected KYC</option>
                <option value="NotSubmitted">Not Submitted</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all flex items-center justify-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-2.5 bg-ivory border border-border-color text-muted hover:text-deep-plum text-xs font-semibold rounded-xl hover:bg-soft-blush transition-colors"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 2. SALON DIRECTORY TABLE & CONTROLS                                       */}
        {/* ========================================================================= */}
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
              <h3 className="font-serif text-lg font-medium text-deep-plum">Directory Request Failed</h3>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchSalons({ search: searchTerm, isActive: activeFilter, kycStatus: kycFilter, page: currentPage })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : salons.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border-color p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose mx-auto">
              <Store className="w-7 h-7 opacity-80" />
            </div>
            <h3 className="font-serif text-xl font-medium text-deep-plum">No Salons Match Filters</h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'Try clearing active search keywords or resetting the verification status dropdown.'
                : 'No salons have been registered on the platform yet.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border-color shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted">
                <thead className="bg-ivory/80 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border-color">
                  <tr>
                    <th className="py-3.5 px-6">Salon Details</th>
                    <th className="py-3.5 px-6">Location</th>
                    <th className="py-3.5 px-6">Administrator Contact</th>
                    <th className="py-3.5 px-6 text-center">Platform Scale</th>
                    <th className="py-3.5 px-6">KYC Status</th>
                    <th className="py-3.5 px-6">Directory Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/70 font-sans">
                  {salons.map((salon) => (
                    <tr key={salon.id} className="hover:bg-soft-blush/30 transition-colors">
                      {/* Salon Name, Slug & Type */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-soft-blush border border-dusty-rose/30 text-deep-plum font-serif text-base font-bold flex items-center justify-center shrink-0">
                            {salon.name?.charAt(0) || 'S'}
                          </div>
                          <div className="min-w-0">
                            <Link 
                              to={`/superadmin/salons/${salon.id}`}
                              className="font-medium text-deep-plum hover:text-primary-rose transition-colors text-sm truncate block"
                            >
                              {salon.name}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted">
                              <span>/{salon.slug}</span>
                              <span>•</span>
                              <span className="text-primary-rose font-medium">{salon.businessType}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-deep-plum">
                          <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{[salon.city, salon.state].filter(Boolean).join(', ') || 'Not specified'}</span>
                        </div>
                      </td>

                      {/* Admin Contact */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-medium text-deep-plum">{salon.adminFullName || 'Unassigned'}</div>
                          {salon.adminEmail && (
                            <div className="flex items-center gap-1 text-[11px] text-muted">
                              <Mail className="w-3 h-3 text-muted/60" />
                              <span className="truncate max-w-[160px]">{salon.adminEmail}</span>
                            </div>
                          )}
                          {salon.phoneNumber && (
                            <div className="flex items-center gap-1 text-[11px] text-muted">
                              <Phone className="w-3 h-3 text-muted/60" />
                              <span>{salon.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Scale Metrics */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-3 px-2.5 py-1 rounded-xl bg-ivory border border-border-color text-[11px]">
                          <span title="Total Staff" className="flex items-center gap-1 text-deep-plum font-medium">
                            <Users className="w-3 h-3 text-muted" />
                            {salon.totalStaff}
                          </span>
                          <span className="text-border-color">|</span>
                          <span title="Total Services" className="flex items-center gap-1 text-deep-plum font-medium">
                            <Scissors className="w-3 h-3 text-muted" />
                            {salon.totalServices}
                          </span>
                          <span className="text-border-color">|</span>
                          <span title="Total Bookings" className="flex items-center gap-1 text-deep-plum font-medium">
                            <Calendar className="w-3 h-3 text-muted" />
                            {salon.totalAppointments}
                          </span>
                        </div>
                      </td>

                      {/* KYC Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openKycModal(salon)}
                          className="hover:opacity-80 transition-opacity"
                          title="Click to update KYC verification"
                        >
                          {getKycBadge(salon.kycStatus, salon.isVerified)}
                        </button>
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openStatusModal(salon)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            salon.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                          title="Toggle active status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${salon.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          <span>{salon.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/superadmin/salons/${salon.id}`}
                            className="p-1.5 rounded-lg bg-ivory text-deep-plum border border-border-color hover:border-dusty-rose hover:bg-soft-blush transition-colors"
                            title="View Full Profile & Financials"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => openKycModal(salon)}
                            className="p-1.5 rounded-lg bg-ivory text-primary-rose border border-border-color hover:border-dusty-rose hover:bg-soft-blush transition-colors"
                            title="Manage KYC Verification"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openStatusModal(salon)}
                            className="p-1.5 rounded-lg bg-ivory text-muted hover:text-deep-plum border border-border-color hover:border-dusty-rose hover:bg-soft-blush transition-colors"
                            title={salon.isActive ? 'Deactivate Salon' : 'Activate Salon'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-border-color flex flex-col sm:flex-row items-center justify-between gap-4 bg-ivory/50">
                <span className="text-xs text-muted">
                  Showing page <strong className="text-deep-plum">{pagination.page}</strong> of <strong className="text-deep-plum">{pagination.totalPages}</strong> ({pagination.totalCount} total salons)
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
        {/* 3. MODAL: UPDATE ACTIVE/INACTIVE STATUS                                    */}
        {/* ========================================================================= */}
        {statusModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-color shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    {statusModal.isActive ? 'Activate Salon' : 'Suspend / Deactivate Salon'}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Modifying platform availability for <strong>{statusModal.salon?.name}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusModal({ isOpen: false, salon: null, isActive: false, reason: '', isSubmitting: false, error: '' })}
                  className="text-muted hover:text-deep-plum p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {statusModal.error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {statusModal.error}
                </div>
              )}

              <form onSubmit={submitStatusChange} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-ivory border border-border-color text-xs space-y-2">
                  <p className="text-deep-plum font-medium">
                    {statusModal.isActive 
                      ? 'Activating will publish this salon on the public directory (/salons) and enable customer bookings.'
                      : 'Deactivating will hide this salon from directory searches and prevent new appointments from being booked.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Reason / Administrative Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={statusModal.reason}
                    onChange={(e) => setStatusModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Enter reason for audit record (e.g. Compliance verification passed, maintenance)..."
                    className="w-full px-3 py-2 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/60"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusModal({ isOpen: false, salon: null, isActive: false, reason: '', isSubmitting: false, error: '' })}
                    className="px-4 py-2 border border-border-color text-muted hover:text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={statusModal.isSubmitting}
                    className={`px-4 py-2 text-white text-xs font-semibold rounded-xl shadow-2xs transition-all disabled:opacity-50 ${
                      statusModal.isActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {statusModal.isSubmitting ? 'Saving...' : statusModal.isActive ? 'Confirm Activation' : 'Confirm Suspension'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MODAL: UPDATE KYC STATUS                                               */}
        {/* ========================================================================= */}
        {kycModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-color shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    Review KYC Verification
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Update compliance verification for <strong>{kycModal.salon?.name}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setKycModal({ isOpen: false, salon: null, kycStatus: 'Verified', isVerified: true, notes: '', isSubmitting: false, error: '' })}
                  className="text-muted hover:text-deep-plum p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {kycModal.error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {kycModal.error}
                </div>
              )}

              <form onSubmit={submitKycChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Verification Decision
                  </label>
                  <select
                    value={kycModal.kycStatus}
                    onChange={(e) => setKycModal(prev => ({ 
                      ...prev, 
                      kycStatus: e.target.value,
                      isVerified: e.target.value === 'Verified'
                    }))}
                    className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium"
                  >
                    <option value="Verified">Verified (Approved & Verified Badge)</option>
                    <option value="Pending">Pending (Under Review / Resubmission Required)</option>
                    <option value="Rejected">Rejected (Failed Compliance)</option>
                    <option value="NotSubmitted">Not Submitted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Compliance Review Notes / Reason
                  </label>
                  <textarea
                    rows={3}
                    value={kycModal.notes}
                    onChange={(e) => setKycModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter internal compliance notes or rejection explanation..."
                    className="w-full px-3 py-2 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/60"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setKycModal({ isOpen: false, salon: null, kycStatus: 'Verified', isVerified: true, notes: '', isSubmitting: false, error: '' })}
                    className="px-4 py-2 border border-border-color text-muted hover:text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={kycModal.isSubmitting}
                    className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all disabled:opacity-50"
                  >
                    {kycModal.isSubmitting ? 'Submitting...' : 'Save Decision'}
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
