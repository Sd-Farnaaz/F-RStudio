import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import { staffService } from '../../services/staffService';
import { customerService } from '../../services/customerService';
import { posService } from '../../services/posService';
import { 
  ShoppingBag, User, Phone, CheckCircle2, AlertCircle, X, Printer, 
  Trash2, Plus, Sparkles, CreditCard, Banknote, QrCode, Search, 
  Clock, ArrowRight, RefreshCw, Receipt 
} from 'lucide-react';

export default function AdminPosPage() {
  // Catalog Data
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState([]); // array of service objects
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  
  // Existing Customer Search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash | UPI | Card
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Processing & Receipt Modal
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesRes, staffRes] = await Promise.all([
        adminService.getServices(),
        staffService.getStaffList()
      ]);

      const activeServices = (servicesRes.items || servicesRes || []).filter(s => s.isActive);
      const activeStaff = (staffRes.items || staffRes || []).filter(s => s.isActive);

      setServices(activeServices);
      setStaffList(activeStaff);

      if (activeStaff.length > 0) {
        setSelectedStaffId(activeStaff[0].id.toString());
      }
    } catch (err) {
      setError(err.message || 'Failed to load POS services.');
    } finally {
      setLoading(false);
    }
  };

  // Customer search debounced
  useEffect(() => {
    if (!isWalkIn && customerSearch.trim().length >= 2) {
      searchCustomers();
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch, isWalkIn]);

  const searchCustomers = async () => {
    try {
      const res = await customerService.getCustomers({ search: customerSearch.trim(), pageSize: 5 });
      setCustomerResults(res.items || res || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Add / Remove from cart
  const addToCart = (service) => {
    setCart([...cart, service]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearOrder = () => {
    setCart([]);
    setWalkInName('');
    setWalkInPhone('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setDiscountAmount(0);
    setCashReceived('');
    setPaymentRef('');
    setOrderNotes('');
    setReceiptData(null);
    setError('');
  };

  // Financial Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalDuration = cart.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const netTotal = Math.max(0, subtotal - discount);

  // Cash Calculations
  const tenderAmount = parseFloat(cashReceived) || 0;
  const changeDue = Math.max(0, tenderAmount - netTotal);

  // Quick Cash Denomination buttons
  const setCashTender = (amount) => {
    setCashReceived(amount.toString());
  };

  // Quick Categories
  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))];
  const filteredServices = services.filter(s => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Fast Checkout Action
  const handleQuickCheckout = async () => {
    if (cart.length === 0) {
      setError('Please add at least one service to the register.');
      return;
    }
    if (!selectedStaffId) {
      setError('Please assign a stylist / staff member.');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const orderPayload = {
        customerId: isWalkIn ? null : selectedCustomer?.id,
        walkInCustomerName: isWalkIn ? (walkInName.trim() || 'Walk-In Client') : null,
        walkInCustomerPhone: isWalkIn ? (walkInPhone.trim() || null) : null,
        staffId: parseInt(selectedStaffId),
        serviceIds: cart.map(c => c.id),
        paymentMethod: paymentMethod,
        amountReceived: paymentMethod === 'Cash' ? (tenderAmount || netTotal) : netTotal,
        discountAmount: discount,
        paymentTransactionReference: paymentMethod === 'UPI' ? paymentRef.trim() : null,
        notes: orderNotes.trim() || null
      };

      const result = await posService.quickCheckout(orderPayload);
      setReceiptData(result.receipt);
    } catch (err) {
      setError(err.message || 'Quick checkout failed. Please check inputs.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto pb-12">
        
        {/* Top Header */}
        <div className="mb-4 flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl border border-border-color shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-rose/10 text-primary-rose">
                In-Salon POS
              </span>
              <span className="text-xs text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> 15-Second Receptionist Cashier
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-deep-plum mt-0.5">
              Quick Walk-In & Register Checkout
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={clearOrder}
              className="px-3.5 py-2 text-xs font-medium text-muted hover:text-deep-plum bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Reset Register
            </button>
            <div className="text-right">
              <span className="text-xs text-muted block">Today's Date</span>
              <span className="text-xs font-bold text-deep-plum">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* 2-Column Register Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 cols): Customer, Staff & Service Catalog */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            
            {/* Step 1: Customer & Staff Selection Bar */}
            <div className="bg-white p-4 rounded-2xl border border-border-color shadow-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Customer Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-deep-plum flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary-rose" />
                      Client Information
                    </label>
                    <div className="flex text-[11px] font-semibold bg-gray-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => { setIsWalkIn(true); setSelectedCustomer(null); }}
                        className={`px-2 py-0.5 rounded-md transition-all ${isWalkIn ? 'bg-white shadow-xs text-primary-rose font-bold' : 'text-muted'}`}
                      >
                        Walk-In Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWalkIn(false)}
                        className={`px-2 py-0.5 rounded-md transition-all ${!isWalkIn ? 'bg-white shadow-xs text-primary-rose font-bold' : 'text-muted'}`}
                      >
                        Existing Client
                      </button>
                    </div>
                  </div>

                  {isWalkIn ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Guest Name (optional)"
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        className="px-3 py-2 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/20 focus:border-primary-rose bg-gray-50/50"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number (for SMS)"
                        value={walkInPhone}
                        onChange={(e) => setWalkInPhone(e.target.value)}
                        className="px-3 py-2 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/20 focus:border-primary-rose bg-gray-50/50"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      {selectedCustomer ? (
                        <div className="p-2 border border-emerald-300 bg-emerald-50/60 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-emerald-900">{selectedCustomer.fullName}</span>
                            <span className="text-[10px] text-emerald-700 ml-2">({selectedCustomer.email})</span>
                          </div>
                          <button onClick={() => setSelectedCustomer(null)} className="text-emerald-700 hover:text-emerald-900">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search client by name or email..."
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 text-xs border border-border-color rounded-xl"
                            />
                            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2.5" />
                          </div>
                          {customerResults.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-border-color rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-border-color">
                              {customerResults.map((c) => (
                                <div
                                  key={c.id}
                                  onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}
                                  className="p-2.5 hover:bg-soft-blush cursor-pointer text-xs flex justify-between items-center"
                                >
                                  <span className="font-semibold text-deep-plum">{c.fullName}</span>
                                  <span className="text-muted">{c.email}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Staff Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-deep-plum flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-rose" />
                    Assigned Stylist / Specialist *
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border-color rounded-xl bg-gray-50/50 focus:ring-2 focus:ring-primary-rose/20 focus:border-primary-rose font-medium text-deep-plum"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.title || 'Stylist'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Service Catalog Quick Tiles */}
            <div className="bg-white p-4 rounded-2xl border border-border-color shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-deep-plum">
                    Service Catalog Tiles
                  </h2>
                  <span className="text-[11px] text-muted">
                    ({filteredServices.length} items)
                  </span>
                </div>
                <div className="relative w-48">
                  <input
                    type="text"
                    placeholder="Filter services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs border border-border-color rounded-lg"
                  />
                  <Search className="w-3 h-3 text-muted absolute left-2 top-2" />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-primary-rose text-white shadow-xs'
                        : 'bg-gray-100 text-muted hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Tiles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar p-1">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => addToCart(service)}
                    className="p-3 bg-white border border-border-color hover:border-primary-rose rounded-xl shadow-2xs hover:shadow-sm text-left flex flex-col justify-between transition-all group active:scale-95"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary-rose/80 block mb-0.5 truncate">
                        {service.category || 'Service'}
                      </span>
                      <h3 className="text-xs font-bold text-deep-plum leading-snug line-clamp-2">
                        {service.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <span className="text-xs font-extrabold text-deep-plum">
                        ₹{service.price}
                      </span>
                      <span className="text-[10px] text-muted flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {service.durationMinutes}m
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (4-5 cols): Cart Summary & Cashier Register */}
          <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 rounded-2xl border border-border-color shadow-sm space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-border-color">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-rose" />
                <h2 className="text-base font-serif font-bold text-deep-plum">
                  Register Cart
                </h2>
              </div>
              <span className="px-2.5 py-0.5 bg-rose-tint text-primary-rose rounded-full text-xs font-bold">
                {cart.length} item{cart.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {cart.length > 0 ? (
                cart.map((item, index) => (
                  <div 
                    key={index} 
                    className="p-2.5 bg-gray-50 rounded-xl border border-border-color flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-deep-plum truncate">{item.name}</p>
                      <p className="text-[10px] text-muted">{item.durationMinutes} mins • {item.category}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-deep-plum">₹{item.price}</span>
                      <button 
                        onClick={() => removeFromCart(index)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted bg-gray-50/50 rounded-xl border border-dashed border-border-color">
                  <ShoppingBag className="w-6 h-6 text-border-color mx-auto mb-1" />
                  <p className="text-xs font-medium">Cart is empty</p>
                  <p className="text-[10px] text-muted">Click service tiles to add</p>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs border border-border-color">
              <div className="flex justify-between text-muted">
                <span>Subtotal ({cart.length} services)</span>
                <span className="font-medium text-deep-plum">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Total Duration</span>
                <span className="font-medium text-deep-plum">{totalDuration} mins</span>
              </div>
              <div className="flex items-center justify-between text-muted pt-1 border-t border-gray-200">
                <span>Discount / Voucher (₹)</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-20 px-2 py-0.5 text-right font-semibold text-deep-plum text-xs border border-border-color rounded bg-white"
                />
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-sm font-extrabold text-deep-plum">
                <span>Net Total Payable</span>
                <span className="text-lg text-primary-rose font-mono">₹{netTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Fast Payment Mode Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-deep-plum block">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'Cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                      : 'border-border-color hover:bg-gray-50 text-muted'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'UPI'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                      : 'border-border-color hover:bg-gray-50 text-muted'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'Card'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                      : 'border-border-color hover:bg-gray-50 text-muted'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Card / POS
                </button>
              </div>

              {/* Cash Denominations & Change Calculator */}
              {paymentMethod === 'Cash' && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-900">
                      Cash Tendered
                    </span>
                    <input
                      type="number"
                      placeholder={`₹${netTotal}`}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-24 px-2 py-1 text-right font-mono font-bold text-xs border border-emerald-300 rounded-lg bg-white"
                    />
                  </div>
                  
                  {/* Quick cash pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setCashTender(netTotal)}
                      className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      Exact (₹{netTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTender(500)}
                      className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      ₹500
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTender(1000)}
                      className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      ₹1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashTender(2000)}
                      className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      ₹2,000
                    </button>
                  </div>

                  {/* Change Due Display */}
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-xs">
                    <span className="font-bold text-emerald-900">Change Due</span>
                    <span className="text-base font-extrabold font-mono text-emerald-700">
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="UPI Ref / UTR # (optional)"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border-color rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Complete Checkout Button */}
            <button
              onClick={handleQuickCheckout}
              disabled={processing || cart.length === 0}
              className="w-full py-3.5 bg-primary-rose text-white text-sm font-bold rounded-xl hover:bg-deep-plum transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Receipt...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Complete & Generate Receipt
                </>
              )}
            </button>
          </div>
        </div>

        {/* Printable Digital Receipt Modal */}
        {receiptData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border-color animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
              
              <div className="flex items-center justify-between pb-3 border-b border-border-color">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-deep-plum">Payment Successful</span>
                </div>
                <button 
                  onClick={() => setReceiptData(null)}
                  className="p-1 text-muted hover:text-deep-plum rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thermal Receipt Paper Layout */}
              <div id="printable-receipt" className="flex-1 overflow-y-auto custom-scrollbar my-4 p-5 bg-white border border-gray-200 rounded-xl font-mono text-xs text-gray-800 space-y-3">
                
                {/* Salon Branding */}
                <div className="text-center pb-2 border-b border-dashed border-gray-300">
                  <h2 className="text-base font-bold uppercase tracking-wider text-black">
                    {receiptData.salonName}
                  </h2>
                  {receiptData.salonAddress && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{receiptData.salonAddress}, {receiptData.salonCity}</p>
                  )}
                  {receiptData.salonPhone && (
                    <p className="text-[10px] text-gray-500">Ph: {receiptData.salonPhone}</p>
                  )}
                  {receiptData.salonUpiId && (
                    <p className="text-[9px] text-gray-400">UPI: {receiptData.salonUpiId}</p>
                  )}
                </div>

                {/* Receipt Meta */}
                <div className="text-[10px] space-y-0.5 text-gray-600">
                  <div className="flex justify-between">
                    <span>Receipt #:</span>
                    <span className="font-bold text-black">{receiptData.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(receiptData.issuedAtUtc).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{receiptData.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-bold text-black">{receiptData.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stylist:</span>
                    <span>{receiptData.staffName}</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="pt-2 border-t border-dashed border-gray-300">
                  <div className="flex justify-between font-bold text-[10px] uppercase text-black pb-1 border-b border-gray-200">
                    <span>Item</span>
                    <span>Amt</span>
                  </div>
                  <div className="divide-y divide-gray-100 py-1">
                    {receiptData.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between py-1 text-xs">
                        <div>
                          <span className="font-medium text-black">{item.serviceName}</span>
                          <span className="text-[10px] text-gray-400 block">{item.durationMinutes}m</span>
                        </div>
                        <span className="font-bold text-black">₹{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals & Payment */}
                <div className="pt-2 border-t border-dashed border-gray-300 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{receiptData.subTotal}</span>
                  </div>
                  {receiptData.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-₹{receiptData.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-black pt-1 border-t border-gray-300">
                    <span>TOTAL:</span>
                    <span>₹{receiptData.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-600 pt-1">
                    <span>Paid via {receiptData.paymentMethod}:</span>
                    <span>₹{receiptData.amountReceived}</span>
                  </div>
                  {receiptData.changeDue > 0 && (
                    <div className="flex justify-between text-[11px] font-bold text-black">
                      <span>Change Given:</span>
                      <span>₹{receiptData.changeDue}</span>
                    </div>
                  )}
                </div>

                {/* Footer Note */}
                <div className="text-center pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-500">
                  <p>{receiptData.notes}</p>
                  <p className="mt-1 font-semibold">Powered by F&R Beauty Studio</p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2 border-t border-border-color">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 bg-deep-plum text-white text-xs font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={clearOrder}
                  className="flex-1 py-2.5 bg-rose-tint text-primary-rose text-xs font-bold rounded-xl hover:bg-primary-rose hover:text-white transition-colors"
                >
                  Next Walk-In Order
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
