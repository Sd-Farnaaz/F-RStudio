import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { appointmentService } from '../../services/appointmentService';
import { paymentService } from '../../services/paymentService';
import InvoiceModal from '../../components/common/InvoiceModal';
import { 
  Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, RefreshCw, 
  Scissors, CreditCard, CheckCircle2, Search, ExternalLink, X, ShieldCheck, DollarSign,
  FileText
} from 'lucide-react';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [updatingId, setUpdatingId] = useState(null);
  const [activeInvoiceAptId, setActiveInvoiceAptId] = useState(null);

  // Verification Modal State
  const [verifyingApt, setVerifyingApt] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    paymentStatus: 'Paid',
    amountPaid: '',
    paymentMethod: 'UPI',
    paymentTransactionReference: '',
    notes: ''
  });
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, searchQuery]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { pageSize: 100 };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      const data = await appointmentService.getAdminAppointments(params);
      setAppointments(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!window.confirm(`Change appointment status to ${newStatus}?`)) return;
    try {
      setUpdatingId(id);
      await appointmentService.updateAppointmentStatus(id, newStatus, 'Status updated by salon administrator');
      fetchAppointments();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openVerifyModal = (apt) => {
    setVerifyingApt(apt);
    
    // Choose default target payment status based on current
    let defaultTarget = 'Paid';
    if (apt.paymentStatus === 'Paid') defaultTarget = 'Refunded';
    else if (apt.paymentStatus === 'Failed') defaultTarget = 'Paid';

    setVerifyForm({
      paymentStatus: defaultTarget,
      amountPaid: (apt.amountPaid > 0 ? apt.amountPaid : (apt.advanceAmountRequired > 0 ? apt.advanceAmountRequired : apt.price)).toString(),
      paymentMethod: apt.paymentMethod || 'UPI',
      paymentTransactionReference: apt.paymentTransactionReference || '',
      notes: apt.paymentNotes || ''
    });
    setVerifyError('');
  };

  const closeVerifyModal = () => {
    setVerifyingApt(null);
    setVerifyError('');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyingApt) return;

    const amt = parseFloat(verifyForm.amountPaid);
    if (isNaN(amt) || amt < 0) {
      setVerifyError('Please enter a valid amount paid (0 or greater).');
      return;
    }

    if (amt > verifyingApt.price) {
      setVerifyError(`Verified amount cannot exceed total service price of $${verifyingApt.price}.`);
      return;
    }

    setVerifySubmitting(true);
    setVerifyError('');

    try {
      const payload = {
        paymentStatus: verifyForm.paymentStatus,
        amountPaid: amt,
        paymentMethod: verifyForm.paymentMethod?.trim() || null,
        paymentTransactionReference: verifyForm.paymentTransactionReference?.trim() || null,
        notes: verifyForm.notes?.trim() || null
      };

      const updated = await paymentService.verifyPayment(verifyingApt.id, payload);
      
      // Update local state immediately
      setAppointments(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
      closeVerifyModal();
    } catch (err) {
      setVerifyError(err.message || 'Failed to verify payment.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Confirmed': return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Confirmed</span>;
      case 'Pending': return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">Pending</span>;
      case 'Cancelled': return <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Cancelled</span>;
      case 'Completed': return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Completed</span>;
      case 'NoShow': return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">No Show</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">{status}</span>;
    }
  };

  const getPaymentBadge = (status) => {
    switch(status) {
      case 'Paid': return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
      case 'PartiallyPaid': return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><CreditCard className="w-3 h-3" /> Partially Paid</span>;
      case 'Pending': return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending Verif.</span>;
      case 'Failed': return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Failed</span>;
      case 'Refunded': return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-semibold rounded-full w-fit">Refunded</span>;
      case 'NotRequired': return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full w-fit">No Advance</span>;
      default: return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full w-fit">{status}</span>;
    }
  };

  // Filter items in memory for date and payment status
  const filteredAppointments = appointments.filter(apt => {
    if (dateFilter && !apt.startAtUtc.startsWith(dateFilter)) return false;
    if (paymentStatusFilter && apt.paymentStatus !== paymentStatusFilter) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-deep-plum mb-2">Appointments & Payment Queue</h1>
            <p className="text-muted text-sm">Manage bookings, schedule transitions, and customer advance deposit verifications.</p>
          </div>
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-deep-plum bg-white border border-border-color rounded-lg hover:bg-ivory transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border-color mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wide">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Customer, staff, service..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wide">Booking Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="NoShow">No Show</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wide">Payment Status</label>
            <select 
              value={paymentStatusFilter} 
              onChange={e => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none bg-white"
            >
              <option value="">All Payments</option>
              <option value="Pending">Pending Verification</option>
              <option value="PartiallyPaid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
              <option value="NotRequired">No Advance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1 uppercase tracking-wide">Date</label>
            <input 
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none bg-white"
            />
          </div>

          {(statusFilter || paymentStatusFilter || dateFilter || searchQuery) && (
            <button 
              onClick={() => { setStatusFilter(''); setPaymentStatusFilter(''); setDateFilter(''); setSearchQuery(''); }}
              className="px-3 py-2 text-xs font-medium text-muted hover:text-deep-plum underline transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {error}
          </div>
        )}

        {/* Appointments Table */}
        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-16 text-center">
              <Calendar className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-medium text-deep-plum mb-1">No appointments found</h3>
              <p className="text-sm text-muted">Try adjusting your search criteria or date filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-ivory/70 border-b border-border-color text-muted font-medium text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Service & Staff</th>
                    <th className="px-6 py-4">Schedule</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Payment Tracking</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {filteredAppointments.map(apt => {
                    const needsVerification = apt.paymentStatus === 'Pending' && apt.paymentTransactionReference;

                    return (
                      <tr key={apt.id} className="hover:bg-soft-blush/20 transition-colors">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-deep-plum">{apt.customerName}</div>
                          <div className="text-xs text-muted">{apt.customerEmail}</div>
                          {apt.customerPhone && <div className="text-xs text-muted">{apt.customerPhone}</div>}
                        </td>

                        {/* Service & Staff */}
                        <td className="px-6 py-4">
                          <div className="font-medium text-deep-plum">{apt.serviceName}</div>
                          <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                            <User className="w-3.5 h-3.5 text-primary-rose/70" />
                            <span>{apt.staffName}</span>
                            <span>•</span>
                            <span>${apt.price.toFixed(2)}</span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-6 py-4">
                          <div className="text-deep-plum font-medium">{new Date(apt.startAtUtc).toLocaleDateString()}</div>
                          <div className="text-xs text-muted flex items-center mt-0.5">
                            <Clock className="w-3 h-3 mr-1 text-primary-rose/70" />
                            {new Date(apt.startAtUtc).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>

                        {/* Appointment Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(apt.status)}
                        </td>

                        {/* Payment Tracking Details */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getPaymentBadge(apt.paymentStatus)}
                            </div>
                            
                            <div className="text-xs text-muted">
                              <span>Paid: <strong className="text-deep-plum">${(apt.amountPaid || 0).toFixed(2)}</strong></span>
                              {apt.advanceAmountRequired > 0 && (
                                <span className="ml-1 text-[11px] text-amber-800">/ Req: ${apt.advanceAmountRequired.toFixed(2)}</span>
                              )}
                            </div>

                            {/* UTR Reference & Proof link */}
                            {apt.paymentTransactionReference && (
                              <div className="text-[11px] font-mono text-deep-plum bg-ivory px-1.5 py-0.5 rounded border border-border-color truncate max-w-[160px]" title={apt.paymentTransactionReference}>
                                Ref: {apt.paymentTransactionReference}
                              </div>
                            )}

                            {apt.paymentProofUrl && (
                              <a 
                                href={apt.paymentProofUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[11px] text-primary-rose hover:underline flex items-center gap-0.5 w-fit"
                              >
                                View Proof <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View / Print Digital GST Tax Invoice */}
                            {(apt.amountPaid > 0 || apt.paymentStatus === 'Paid' || apt.paymentStatus === 'PartiallyPaid' || apt.status === 'Completed') && (
                              <button
                                type="button"
                                onClick={() => setActiveInvoiceAptId(apt.id)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-border-color bg-soft-blush/50 text-deep-plum hover:bg-soft-blush transition-colors flex items-center gap-1"
                                title="Digital GST Tax Invoice & Receipt"
                              >
                                <FileText className="w-3.5 h-3.5 text-primary-rose" />
                                <span className="hidden sm:inline">Invoice</span>
                              </button>
                            )}

                            {/* Verify Payment Button */}
                            <button
                              onClick={() => openVerifyModal(apt)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1 ${
                                needsVerification 
                                  ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-sm animate-pulse'
                                  : 'bg-white text-deep-plum border-border-color hover:bg-ivory'
                              }`}
                              title="Verify / Update Payment"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>

                            {/* Status Quick Transitions */}
                            {['Pending', 'Confirmed'].includes(apt.status) && (
                              <>
                                <button 
                                  onClick={() => handleStatusChange(apt.id, 'Completed')}
                                  title="Mark Completed"
                                  className="p-1.5 text-success hover:bg-green-50 rounded-md transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(apt.id, 'Cancelled')}
                                  title="Cancel Appointment"
                                  className="p-1.5 text-danger hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Verify Appointment Payment */}
        {verifyingApt && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-border-color shadow-2xl overflow-hidden my-8">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Verify Customer Payment</h3>
                  <p className="text-xs text-muted">Appointment #{verifyingApt.id} — {verifyingApt.customerName}</p>
                </div>
                <button
                  onClick={closeVerifyModal}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Summary Card */}
                <div className="p-4 bg-soft-blush/20 rounded-xl border border-border-color text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">Service & Price:</span>
                    <strong className="text-deep-plum">{verifyingApt.serviceName} (${verifyingApt.price.toFixed(2)})</strong>
                  </div>
                  {verifyingApt.advanceAmountRequired > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted">Required Advance Deposit:</span>
                      <strong className="text-amber-800">${verifyingApt.advanceAmountRequired.toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted">Customer Submitted Reference:</span>
                    <span className="font-mono text-deep-plum font-semibold">{verifyingApt.paymentTransactionReference || 'None provided'}</span>
                  </div>
                  {verifyingApt.paymentProofUrl && (
                    <div className="flex justify-between items-center pt-1 border-t border-border-color/60">
                      <span className="text-muted">Payment Proof Link:</span>
                      <a href={verifyingApt.paymentProofUrl} target="_blank" rel="noreferrer" className="text-primary-rose underline font-medium flex items-center gap-1">
                        Open Receipt <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {verifyError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{verifyError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                      New Payment Status <span className="text-primary-rose">*</span>
                    </label>
                    <select
                      value={verifyForm.paymentStatus}
                      onChange={(e) => setVerifyForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                    >
                      <option value="Paid">Paid (Fully verified)</option>
                      <option value="PartiallyPaid">Partially Paid</option>
                      <option value="Failed">Failed (Invalid UTR / Transfer not received)</option>
                      <option value="Pending">Pending (Under review)</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                        Verified Amount Paid ($) <span className="text-primary-rose">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={verifyingApt.price}
                        required
                        value={verifyForm.amountPaid}
                        onChange={(e) => setVerifyForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                        Payment Method
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={verifyForm.paymentMethod}
                        onChange={(e) => setVerifyForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                      Verified Transaction Reference / UTR
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={verifyForm.paymentTransactionReference}
                      onChange={(e) => setVerifyForm(prev => ({ ...prev, paymentTransactionReference: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm font-mono text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                      Internal Payment Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={verifyForm.notes}
                      onChange={(e) => setVerifyForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g. Bank statement checked on 11 Oct, UTR matched."
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-border-color flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeVerifyModal}
                      disabled={verifySubmitting}
                      className="px-4 py-2 text-sm text-muted hover:text-deep-plum rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifySubmitting}
                      className="px-5 py-2 bg-primary-rose text-white text-sm font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                    >
                      {verifySubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Record Verification
                    </button>
                  </div>
                </form>
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

      </div>
    </DashboardLayout>
  );
}
