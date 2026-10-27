import { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';
import { 
  X, 
  Printer, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Scissors, 
  Clock, 
  Calendar, 
  Building, 
  User, 
  FileText 
} from 'lucide-react';

export default function InvoiceModal({ appointmentId, onClose, preloadedInvoice = null }) {
  const [invoice, setInvoice] = useState(preloadedInvoice);
  const [loading, setLoading] = useState(!preloadedInvoice);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!preloadedInvoice && appointmentId) {
      fetchInvoice();
    }
  }, [appointmentId, preloadedInvoice]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await paymentService.getAppointmentInvoice(appointmentId);
      setInvoice(data);
    } catch (err) {
      setError(err.message || 'Failed to generate digital invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-deep-plum/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-border-color shadow-2xl overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:max-w-none print:rounded-none">
        
        {/* Top Header Bar (Hidden in Print) */}
        <div className="px-6 py-4 bg-ivory/80 border-b border-border-color flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-deep-plum">
            <FileText className="w-4 h-4 text-primary-rose" />
            <span className="font-serif font-semibold text-sm">Tax Invoice & Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            {invoice && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white hover:bg-soft-blush border border-border-color text-deep-plum text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-primary-rose" />
                <span>Print / Save PDF</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-muted hover:text-deep-plum hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto print:max-h-none print:p-0">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted gap-2">
              <RefreshCw className="w-7 h-7 text-primary-rose animate-spin" />
              <span className="text-xs">Preparing tax invoice...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-2xl border border-rose-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : !invoice ? (
            <p className="text-xs text-muted text-center py-12">No invoice record available.</p>
          ) : (
            <div className="space-y-6 text-deep-plum">
              
              {/* Invoice Header: Salon details left, invoice meta right */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-border-color/80">
                <div className="space-y-1 max-w-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-2xl font-bold text-deep-plum tracking-tight">
                      {invoice.salonName}
                    </span>
                  </div>
                  {invoice.salonAddress && (
                    <p className="text-xs text-muted leading-relaxed">
                      {invoice.salonAddress}{invoice.salonCity ? `, ${invoice.salonCity}` : ''}
                      {invoice.salonState ? `, ${invoice.salonState}` : ''}
                      {invoice.salonPostalCode ? ` - ${invoice.salonPostalCode}` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted pt-0.5">
                    {invoice.salonPhone && <span>Tel: {invoice.salonPhone}</span>}
                    {invoice.salonEmail && <span>Email: {invoice.salonEmail}</span>}
                  </div>
                  {invoice.salonGstNumber && (
                    <div className="inline-block px-2.5 py-0.5 bg-ivory rounded border border-border-color text-[11px] font-mono text-deep-plum font-semibold mt-1">
                      GSTIN: {invoice.salonGstNumber}
                    </div>
                  )}
                </div>

                <div className="sm:text-right space-y-1 shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-rose block">
                    Tax Invoice / Receipt
                  </span>
                  <div className="font-mono text-sm font-bold text-deep-plum">
                    {invoice.invoiceNumber}
                  </div>
                  <p className="text-xs text-muted">
                    Date: {new Date(invoice.invoiceDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <div className="pt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      invoice.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : invoice.paymentStatus === 'PartiallyPaid'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {invoice.paymentStatus === 'Paid' ? 'Fully Paid' : invoice.paymentStatus === 'PartiallyPaid' ? 'Advance Paid' : 'Payment Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billed To & Service Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-ivory/50 rounded-2xl border border-border-color text-xs">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                    Billed To (Guest)
                  </span>
                  <p className="font-semibold text-deep-plum text-sm">{invoice.customerName}</p>
                  <p className="text-muted">{invoice.customerEmail}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                    Appointment Details
                  </span>
                  <p className="font-semibold text-deep-plum">
                    {new Date(invoice.appointmentStartAtUtc).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })} @ {new Date(invoice.appointmentStartAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {invoice.staffName && (
                    <p className="text-muted">Specialist: {invoice.staffName}</p>
                  )}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-border-color rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-ivory border-b border-border-color font-semibold uppercase text-[10px] text-muted tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Treatment / Service</th>
                      <th className="py-2.5 px-4 text-center">Duration</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color/60">
                    <tr>
                      <td className="py-3 px-4">
                        <span className="font-medium text-deep-plum text-sm block">
                          {invoice.serviceName}
                        </span>
                        <span className="text-[11px] text-muted">
                          Standard Salon Treatment
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-muted">
                        {invoice.durationMinutes} mins
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-deep-plum text-sm">
                        {formatCurrency(invoice.servicePrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Price Calculations & Tax Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span className="font-medium text-deep-plum">{formatCurrency(invoice.subtotal)}</span>
                  </div>

                  {invoice.taxRatePercentage > 0 && (
                    <>
                      <div className="flex justify-between text-muted text-[11px]">
                        <span>CGST ({(invoice.taxRatePercentage / 2).toFixed(1)}%):</span>
                        <span>{formatCurrency(invoice.taxAmount / 2)}</span>
                      </div>
                      <div className="flex justify-between text-muted text-[11px]">
                        <span>SGST ({(invoice.taxRatePercentage / 2).toFixed(1)}%):</span>
                        <span>{formatCurrency(invoice.taxAmount / 2)}</span>
                      </div>
                    </>
                  )}

                  <div className="pt-2 border-t border-border-color/80 flex justify-between font-serif font-bold text-sm text-deep-plum">
                    <span>Total Amount:</span>
                    <span className="text-primary-rose">{formatCurrency(invoice.totalAmount)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(invoice.amountPaid)}</span>
                  </div>

                  <div className="flex justify-between text-deep-plum font-semibold pt-1 pb-1 border-t border-dashed border-border-color">
                    <span>Balance Due at Salon:</span>
                    <span className="font-mono">{formatCurrency(invoice.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Receipt Verification Ledger */}
              {invoice.amountPaid > 0 && (
                <div className="p-4 bg-soft-blush/30 rounded-2xl border border-dusty-rose/25 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-deep-plum">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Payment Receipt Verification</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted pt-1">
                    <div>
                      <span>Method: </span>
                      <strong className="text-deep-plum">{invoice.paymentMethod || 'Online Gateway'}</strong>
                    </div>
                    {invoice.paymentTransactionReference && (
                      <div>
                        <span>Ref / Txn ID: </span>
                        <strong className="font-mono text-deep-plum">{invoice.paymentTransactionReference}</strong>
                      </div>
                    )}
                    {invoice.paymentVerifiedAtUtc && (
                      <div>
                        <span>Verified At: </span>
                        <strong className="text-deep-plum">
                          {new Date(invoice.paymentVerifiedAtUtc).toLocaleDateString()} {new Date(invoice.paymentVerifiedAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer Note */}
              <div className="text-center pt-4 border-t border-border-color text-[11px] text-muted">
                <p>Thank you for choosing {invoice.salonName}! For queries, please reach out directly to the salon.</p>
                <p className="text-[10px] text-muted/70 mt-0.5">Powered by SalonBook SaaS Platform</p>
              </div>

            </div>
          )}
        </div>

        {/* Modal Bottom Actions (Hidden in Print) */}
        <div className="px-6 py-4 bg-ivory/60 border-t border-border-color flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-deep-plum text-white text-xs font-semibold rounded-xl hover:bg-deep-plum/90 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
