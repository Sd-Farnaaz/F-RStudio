import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { vendorPayoutService } from '../../services/vendorPayoutService';
import { 
  CreditCard, DollarSign, ArrowUpRight, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, X, ShieldCheck, ExternalLink, Filter
} from 'lucide-react';

export default function AdminPayoutsPage() {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Settlement Request State
  const [requesting, setRequesting] = useState(false);
  const [settlementSuccess, setSettlementSuccess] = useState('');
  const [settlementError, setSettlementError] = useState('');

  // Disburse Modal State
  const [disbursingPayout, setDisbursingPayout] = useState(null);
  const [disburseUtr, setDisburseUtr] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [disbursingLoading, setDisbursingLoading] = useState(false);
  const [disburseError, setDisburseError] = useState('');

  useEffect(() => {
    fetchEscrowLedger();
  }, [statusFilter]);

  const fetchEscrowLedger = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { pageSize: 50 };
      if (statusFilter) params.status = statusFilter;
      const data = await vendorPayoutService.getEscrowLedger(params);
      setLedger(data);
    } catch (err) {
      setError(err.message || 'Failed to load escrow payout ledger.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSettlement = async () => {
    if (!window.confirm('Request payout settlement for all pending escrow funds? This will queue the earnings for bank disbursement.')) {
      return;
    }

    try {
      setRequesting(true);
      setSettlementError('');
      setSettlementSuccess('');

      const res = await vendorPayoutService.requestSettlement();
      setSettlementSuccess(res.message || 'Settlement request submitted successfully!');
      await fetchEscrowLedger();
      setTimeout(() => setSettlementSuccess(''), 4000);
    } catch (err) {
      setSettlementError(err.message || 'Failed to request settlement.');
    } finally {
      setRequesting(false);
    }
  };

  const handleOpenDisburse = (payout) => {
    setDisbursingPayout(payout);
    setDisburseUtr(`UTR${Date.now().toString().slice(-8)}`);
    setDisburseNotes('Bank NEFT transfer completed.');
    setDisburseError('');
  };

  const handleConfirmDisburse = async (e) => {
    e.preventDefault();
    if (!disbursingPayout) return;

    try {
      setDisbursingLoading(true);
      setDisburseError('');

      await vendorPayoutService.disbursePayout(disbursingPayout.id, {
        utrNumber: disburseUtr.trim(),
        notes: disburseNotes.trim()
      });

      setDisbursingPayout(null);
      await fetchEscrowLedger();
    } catch (err) {
      setDisburseError(err.message || 'Failed to record disbursement.');
    } finally {
      setDisbursingLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Disbursed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Disbursed
          </span>
        );
      case 'Processed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> In Settlement
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Escrow Hold
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-color pb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-deep-plum">Payouts & Escrow Ledger</h1>
            <p className="text-sm text-muted mt-1">
              Track automated appointment revenue splits, platform commission deductions, and bank payouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRequestSettlement}
              disabled={requesting || (ledger && ledger.totalEscrowHold <= 0)}
              className="px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {requesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              <span>Request Payout Settlement</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {settlementSuccess && (
          <div className="p-4 bg-green-50 text-green-800 text-sm rounded-xl border border-green-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{settlementSuccess}</span>
          </div>
        )}

        {settlementError && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{settlementError}</span>
          </div>
        )}

        {/* 3 Escrow Metric Cards */}
        {ledger && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Escrow Hold */}
            <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Available in Escrow</span>
              <div className="text-3xl font-bold font-serif text-deep-plum">
                ₹{ledger.totalEscrowHold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Accumulated customer booking revenue ready for settlement request.
              </p>
            </div>

            {/* In Settlement */}
            <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Queued in Settlement</span>
              <div className="text-3xl font-bold font-serif text-blue-700">
                ₹{ledger.totalPendingSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Settlements batched and awaiting final bank release / UTR dispatch.
              </p>
            </div>

            {/* Total Disbursed */}
            <div className="bg-white p-6 rounded-2xl border border-border-color shadow-2xs space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Lifetime Disbursed</span>
              <div className="text-3xl font-bold font-serif text-emerald-700">
                ₹{ledger.totalDisbursed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Total earnings successfully deposited directly into your bank account.
              </p>
            </div>
          </div>
        )}

        {/* Filter & Transactions Table */}
        <div className="bg-white rounded-2xl border border-border-color shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-ivory/50 border-b border-border-color flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-semibold text-deep-plum text-base">Escrow Settlement Ledger</h3>
              <p className="text-xs text-muted">Itemized split payout ledger for all confirmed bookings.</p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-border-color rounded-lg text-xs text-deep-plum focus:ring-1 focus:ring-primary-rose outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Escrow Hold (Pending)</option>
                <option value="Processed">In Settlement (Processed)</option>
                <option value="Disbursed">Disbursed (Completed)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-primary-rose" />
              <p className="text-sm">Loading escrow records...</p>
            </div>
          ) : !ledger || ledger.transactions.items.length === 0 ? (
            <div className="py-20 text-center text-muted text-xs space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-muted/60" />
              <p>No escrow payout transactions found.</p>
              <p className="text-[11px]">When customers complete payments for bookings, their split revenue will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-color bg-ivory/30 text-xs text-muted uppercase font-semibold tracking-wider">
                    <th className="px-6 py-3.5">Escrow ID</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5">Gross Revenue</th>
                    <th className="px-6 py-3.5">Platform Fee</th>
                    <th className="px-6 py-3.5">Net Payout</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Bank UTR</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color text-xs">
                  {ledger.transactions.items.map((t) => (
                    <tr key={t.id} className="hover:bg-soft-blush/20 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-deep-plum">
                        {t.escrowTransactionId}
                      </td>
                      <td className="px-6 py-4 text-muted max-w-xs truncate" title={t.notes}>
                        {t.notes || 'Booking Revenue Split'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-deep-plum">
                        ₹{t.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-rose-800 font-medium">
                        {t.commissionAmount > 0 ? `-₹${t.commissionAmount.toFixed(2)}` : '₹0.00 (0%)'}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700 text-sm">
                        ₹{t.netAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="px-6 py-4 font-mono text-muted">
                        {t.utrNumber ? (
                          <span className="bg-ivory px-2 py-0.5 rounded border border-border-color font-semibold text-deep-plum">
                            {t.utrNumber}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.status === 'Processed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenDisburse(t)}
                            className="px-2.5 py-1.5 bg-white border border-border-color hover:bg-ivory text-deep-plum text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            title="Record Bank Release / UTR"
                          >
                            Mark Disbursed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ----------------- DISBURSEMENT RECORD MODAL ----------------- */}
        {disbursingPayout && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-border-color shadow-2xl overflow-hidden my-8">
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <h3 className="font-serif font-semibold text-deep-plum text-lg">Record Bank Disbursement</h3>
                <button
                  onClick={() => setDisbursingPayout(null)}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmDisburse} className="p-6 space-y-4">
                <div className="p-3.5 bg-soft-blush/30 rounded-xl border border-border-color text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Transaction ID:</span>
                    <strong className="font-mono text-deep-plum">{disbursingPayout.escrowTransactionId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Net Payout Amount:</span>
                    <strong className="text-emerald-700 text-sm">₹{disbursingPayout.netAmount.toFixed(2)}</strong>
                  </div>
                </div>

                {disburseError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {disburseError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Bank UTR / Transaction Reference <span className="text-primary-rose">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={disburseUtr}
                    onChange={(e) => setDisburseUtr(e.target.value)}
                    placeholder="e.g. UTR429817293"
                    className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm font-mono text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                    Disbursement Notes
                  </label>
                  <textarea
                    rows={2}
                    value={disburseNotes}
                    onChange={(e) => setDisburseNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-border-color flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDisbursingPayout(null)}
                    disabled={disbursingLoading}
                    className="px-4 py-2 text-xs text-muted hover:text-deep-plum transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={disbursingLoading}
                    className="px-5 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {disbursingLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Confirm Release
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
