import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
import { 
  DollarSign, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Store, 
  ArrowUpRight, 
  ShieldCheck, 
  CreditCard,
  Building2,
  FileCheck2,
  Receipt
} from 'lucide-react';

export default function SuperAdminSettlementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialSalonId = searchParams.get('salonId') || '';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [salonIdFilter, setSalonIdFilter] = useState(initialSalonId);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);

  const [data, setData] = useState({
    totalPendingEscrow: 0,
    totalProcessedSettlement: 0,
    totalDisbursed: 0,
    settlements: {
      items: [],
      page: 1,
      pageSize: 20,
      totalCount: 0,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Disbursement Modal State
  const [disburseModal, setDisburseModal] = useState({
    isOpen: false,
    item: null,
    utrNumber: '',
    notes: '',
    isSubmitting: false,
    error: '',
    success: ''
  });

  const fetchSettlements = useCallback(async (params) => {
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

      if (params.status && params.status !== 'all') {
        queryParams.status = params.status;
      }

      if (params.salonId && !isNaN(parseInt(params.salonId, 10))) {
        queryParams.salonId = parseInt(params.salonId, 10);
      }

      const res = await superAdminService.getSettlements(queryParams);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to retrieve settlements and escrow transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettlements({
      search: searchTerm,
      status: statusFilter,
      salonId: salonIdFilter,
      page: currentPage
    });

    const nextParams = new URLSearchParams();
    if (searchTerm) nextParams.set('search', searchTerm);
    if (statusFilter !== 'all') nextParams.set('status', statusFilter);
    if (salonIdFilter) nextParams.set('salonId', salonIdFilter);
    if (currentPage > 1) nextParams.set('page', currentPage.toString());
    setSearchParams(nextParams, { replace: true });
  }, [searchTerm, statusFilter, salonIdFilter, currentPage, fetchSettlements, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSettlements({
      search: searchTerm,
      status: statusFilter,
      salonId: salonIdFilter,
      page: 1
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSalonIdFilter('');
    setCurrentPage(1);
  };

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const openDisburseModal = (item) => {
    setDisburseModal({
      isOpen: true,
      item,
      utrNumber: '',
      notes: '',
      isSubmitting: false,
      error: '',
      success: ''
    });
  };

  const handleDisburseSubmit = async (e) => {
    e.preventDefault();
    if (!disburseModal.item) return;
    if (!disburseModal.utrNumber.trim()) {
      setDisburseModal(prev => ({ ...prev, error: 'Bank transfer reference (UTR) is required.' }));
      return;
    }

    try {
      setDisburseModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await superAdminService.disburseSettlement(disburseModal.item.id, {
        utrNumber: disburseModal.utrNumber.trim(),
        notes: disburseModal.notes.trim() || undefined
      });

      setDisburseModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
      await fetchSettlements({
        search: searchTerm,
        status: statusFilter,
        salonId: salonIdFilter,
        page: currentPage
      });
    } catch (err) {
      setDisburseModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to disburse settlement' }));
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'disbursed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Disbursed
        </span>
      );
    }
    if (s === 'processed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3 h-3" />
          Ready to Disburse
        </span>
      );
    }
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Escrow Hold
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
        {status}
      </span>
    );
  };

  const settlementsList = data.settlements?.items || [];
  const pagination = data.settlements || {};
  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all' || salonIdFilter !== '';

  return (
    <SuperAdminLayout 
      title="Vendor Settlements & Escrow Ledger"
      breadcrumbs={[{ label: 'Settlements' }]}
    >
      <div className="space-y-6">

        {/* ========================================================================= */}
        {/* 1. TOP METRICS RIBBON (ESCROW BALANCES)                                   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-border-color shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Escrow in Hold</span>
              <span className="font-serif text-2xl font-bold text-deep-plum">
                {formatCurrency(data.totalPendingEscrow)}
              </span>
              <p className="text-[11px] text-muted">Customer advance booking deposits in platform custody</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-border-color shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Requested Payouts</span>
              <span className="font-serif text-2xl font-bold text-deep-plum">
                {formatCurrency(data.totalProcessedSettlement)}
              </span>
              <p className="text-[11px] text-muted">Vendor requested payouts pending bank disbursement</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-border-color shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Lifetime Disbursed</span>
              <span className="font-serif text-2xl font-bold text-deep-plum">
                {formatCurrency(data.totalDisbursed)}
              </span>
              <p className="text-[11px] text-muted">Total platform escrow released with verified bank UTRs</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FILTER & SEARCH CONTROL BAR                                           */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-color shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-medium text-deep-plum">
                Platform Escrow & Settlement Ledger
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Review vendor payout requests, execute bank transfers, and log NEFT/IMPS UTR reference receipts.
              </p>
            </div>

            {salonIdFilter && (
              <div className="flex items-center gap-2 bg-soft-blush px-3 py-1.5 rounded-full border border-dusty-rose/30 text-xs font-medium text-primary-rose">
                <span>Filtered by Salon ID #{salonIdFilter}</span>
                <button 
                  type="button" 
                  onClick={() => setSalonIdFilter('')}
                  className="hover:text-deep-plum p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by salon name, Tx ID, UTR..."
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

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium transition-all"
              >
                <option value="all">Status: All Settlements</option>
                <option value="Processed">Ready for Disbursement</option>
                <option value="Pending">In Escrow Hold</option>
                <option value="Disbursed">Disbursed (Settled)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all flex items-center justify-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply</span>
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
        {/* 3. SETTLEMENT TRANSACTIONS TABLE                                         */}
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
              <h3 className="font-serif text-lg font-medium text-deep-plum">Ledger Request Failed</h3>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchSettlements({ search: searchTerm, status: statusFilter, salonId: salonIdFilter, page: currentPage })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : settlementsList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border-color p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose mx-auto">
              <DollarSign className="w-7 h-7 opacity-80" />
            </div>
            <h3 className="font-serif text-xl font-medium text-deep-plum">No Settlements Found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'Try adjusting your search query or status filter.'
                : 'No vendor payout transactions have been recorded in the platform ledger yet.'}
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
                    <th className="py-3.5 px-6">Escrow Transaction ID</th>
                    <th className="py-3.5 px-6 text-right">Gross Escrow</th>
                    <th className="py-3.5 px-6 text-right">Commission (10%)</th>
                    <th className="py-3.5 px-6 text-right">Net Payout</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Date / UTR Reference</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/70 font-sans">
                  {settlementsList.map((item) => (
                    <tr key={item.id} className="hover:bg-soft-blush/30 transition-colors">
                      {/* Salon */}
                      <td className="py-4 px-6">
                        <div>
                          <Link
                            to={`/superadmin/salons/${item.salonId}`}
                            className="font-medium text-deep-plum hover:text-primary-rose transition-colors text-sm"
                          >
                            {item.salonName}
                          </Link>
                          <div className="text-[11px] text-muted">
                            {item.salonCity}
                          </div>
                        </div>
                      </td>

                      {/* Escrow Ref */}
                      <td className="py-4 px-6 font-mono text-[11px] text-deep-plum whitespace-nowrap">
                        <span className="bg-ivory px-2 py-0.5 rounded border border-border-color">
                          {item.escrowTransactionId}
                        </span>
                      </td>

                      {/* Gross */}
                      <td className="py-4 px-6 text-right font-medium text-deep-plum whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>

                      {/* Commission */}
                      <td className="py-4 px-6 text-right text-rose-700 whitespace-nowrap">
                        -{formatCurrency(item.commissionAmount)}
                      </td>

                      {/* Net */}
                      <td className="py-4 px-6 text-right font-serif text-sm font-bold text-deep-plum whitespace-nowrap">
                        {formatCurrency(item.netAmount)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Date & UTR */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-deep-plum font-medium">
                            {item.status === 'Disbursed' ? formatDate(item.disbursedAtUtc) : formatDate(item.createdAtUtc)}
                          </div>
                          {item.utrNumber && (
                            <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                              UTR: {item.utrNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {item.status === 'Processed' ? (
                          <button
                            type="button"
                            onClick={() => openDisburseModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-rose text-white text-xs font-semibold hover:bg-primary-rose/90 shadow-2xs transition-all"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Disburse</span>
                          </button>
                        ) : item.status === 'Disbursed' ? (
                          <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Paid</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Holding</span>
                        )}
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
                  Showing page <strong className="text-deep-plum">{pagination.page}</strong> of <strong className="text-deep-plum">{pagination.totalPages}</strong> ({pagination.totalCount} settlements)
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
        {/* 4. MODAL: DISBURSE SETTLEMENT PAYOUT                                      */}
        {/* ========================================================================= */}
        {disburseModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-color shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    Record Settlement Disbursement
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Release escrow payment for <strong>{disburseModal.item?.salonName}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisburseModal({ isOpen: false, item: null, utrNumber: '', notes: '', isSubmitting: false, error: '', success: '' })}
                  className="text-muted hover:text-deep-plum p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {disburseModal.error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                  {disburseModal.error}
                </div>
              )}

              {/* Settlement Summary Card */}
              <div className="p-4 rounded-2xl bg-ivory border border-border-color space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Gross Booking Deposit:</span>
                  <span className="font-semibold text-deep-plum">{formatCurrency(disburseModal.item?.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Platform Commission (10%):</span>
                  <span className="font-semibold text-rose-700">-{formatCurrency(disburseModal.item?.commissionAmount)}</span>
                </div>
                <div className="pt-2 border-t border-border-color flex items-center justify-between font-serif text-sm">
                  <span className="text-deep-plum font-bold">Net Payout to Salon:</span>
                  <span className="text-deep-plum font-bold text-base">{formatCurrency(disburseModal.item?.netAmount)}</span>
                </div>
              </div>

              <form onSubmit={handleDisburseSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Bank UTR / IMPS / NEFT Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={disburseModal.utrNumber}
                    onChange={(e) => setDisburseModal(prev => ({ ...prev, utrNumber: e.target.value }))}
                    placeholder="e.g. UTR2026102798765432 or CMS7741009"
                    className="w-full px-3.5 py-2.5 bg-ivory text-xs font-mono border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/60"
                  />
                  <p className="text-[11px] text-muted mt-1">Unique transaction reference generated by your bank transfer.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Disbursement Notes / Account Reference (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={disburseModal.notes}
                    onChange={(e) => setDisburseModal(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Direct transfer to vendor HDFC Current Account..."
                    className="w-full px-3 py-2 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/60"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDisburseModal({ isOpen: false, item: null, utrNumber: '', notes: '', isSubmitting: false, error: '', success: '' })}
                    className="px-4 py-2 border border-border-color text-muted hover:text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disburseModal.isSubmitting}
                    className="px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all disabled:opacity-50"
                  >
                    {disburseModal.isSubmitting ? 'Recording Transfer...' : 'Confirm & Mark Disbursed'}
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
