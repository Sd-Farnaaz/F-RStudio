import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDossierDrawer from '../../components/dossier/ClientDossierDrawer';
import { customerService } from '../../services/customerService';
import { 
  Users, Search, UserPlus, Mail, Calendar, CheckCircle2, XCircle, 
  AlertCircle, RefreshCw, Eye, EyeOff, X, ChevronLeft, ChevronRight, ShieldCheck, Info, FileText
} from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Client Consultation Dossier Drawer State
  const [dossierCustomerId, setDossierCustomerId] = useState(null);
  const [dossierOpen, setDossierOpen] = useState(false);

  // Add Customer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // View Customer Details Modal State
  const [viewCustomer, setViewCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers(page, search);
  }, [page, search]);

  const fetchCustomers = async (currentPage, searchTerm) => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: currentPage,
        pageSize,
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {})
      };
      const res = await customerService.getCustomers(params);
      setCustomers(res.items || res || []);
      setTotalCount(res.totalCount ?? (res.items || res || []).length);
    } catch (err) {
      setError(err.message || 'Failed to load customer list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleOpenAddModal = () => {
    setAddForm({ fullName: '', email: '', password: '' });
    setShowPassword(false);
    setAddError('');
    setAddSuccess('');
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddForm({ fullName: '', email: '', password: '' });
    setAddError('');
    setAddSuccess('');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.fullName.trim() || addForm.fullName.trim().length < 2) {
      setAddError('Full name must be at least 2 characters long.');
      return;
    }

    if (!addForm.email.trim() || !addForm.email.includes('@')) {
      setAddError('Please enter a valid email address.');
      return;
    }

    if (!addForm.password || addForm.password.length < 8) {
      setAddError('Password must be at least 8 characters long.');
      return;
    }

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      const payload = {
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        password: addForm.password
      };

      await customerService.createCustomer(payload);
      setAddSuccess('Customer account created successfully!');
      
      // Clear password field immediately
      setAddForm({ fullName: '', email: '', password: '' });
      
      fetchCustomers(page, search);
      setTimeout(() => {
        handleCloseAddModal();
      }, 1500);
    } catch (err) {
      if (err.status === 409) {
        setAddError('An account with this email address already exists.');
      } else {
        setAddError(err.message || 'Failed to create customer account.');
      }
    } finally {
      setAddLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-12">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-deep-plum mb-2">Customer Directory</h1>
            <p className="text-muted text-sm">Search, view, and onboard clients for your salon bookings.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-primary-rose text-white text-sm font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Add New Customer
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-border-color mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search customers by name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/30 outline-none"
            />
          </div>
          <div className="text-xs text-muted font-medium">
            Showing <strong className="text-deep-plum">{customers.length}</strong> of <strong className="text-deep-plum">{totalCount}</strong> clients
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {error}
          </div>
        )}

        {/* Customer Table */}
        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex justify-center"><RefreshCw className="w-8 h-8 text-primary-rose animate-spin" /></div>
          ) : customers.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-muted/30 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-medium text-deep-plum mb-1">No customers found</h3>
              <p className="text-sm text-muted">
                {search ? 'Try clearing your search query.' : 'Click "Add New Customer" above to create your first client.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-ivory/70 border-b border-border-color text-muted font-medium text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Client Name</th>
                    <th className="px-6 py-4">Email Address</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Verification</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-soft-blush/20 transition-colors">
                      {/* Name with Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-rose-tint text-primary-rose flex items-center justify-center font-serif font-bold text-sm shrink-0">
                            {c.fullName ? c.fullName[0].toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="font-semibold text-deep-plum">{c.fullName}</div>
                            <div className="text-[11px] text-muted">ID: #{c.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-muted">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-primary-rose/70" />
                          <span className="font-mono text-xs text-deep-plum">{c.email}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {c.isActive ? (
                          <span className="px-2.5 py-0.5 bg-green-100 text-green-800 text-[11px] font-semibold rounded-full flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-full flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Email Verified */}
                      <td className="px-6 py-4">
                        {c.isEmailVerified ? (
                          <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-muted flex items-center gap-1">
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="px-6 py-4 text-muted text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-rose/70" />
                          <span>{new Date(c.createdAtUtc).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setDossierCustomerId(c.id); setDossierOpen(true); }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-rose-tint text-primary-rose hover:bg-primary-rose hover:text-white rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Open Consultation Dossier"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Dossier
                          </button>
                          <button
                            onClick={() => setViewCustomer(c)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-deep-plum hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-ivory/50 border-t border-border-color flex items-center justify-between">
              <span className="text-xs text-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-border-color bg-white text-muted hover:text-deep-plum disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-border-color bg-white text-muted hover:text-deep-plum disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Add New Customer */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-border-color shadow-2xl overflow-hidden my-8">
              
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-semibold text-deep-plum text-lg">Add New Customer</h3>
                  <p className="text-xs text-muted">Create a global customer account for booking</p>
                </div>
                <button
                  onClick={handleCloseAddModal}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-3 bg-soft-blush/40 rounded-xl border border-border-color text-xs text-muted flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                  <span>
                    This account is created with customer privileges (Role: User) and can sign in to book appointments at any salon on F&R Beauty Studio.
                  </span>
                </div>

                {addError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{addError}</span>
                  </div>
                )}

                {addSuccess && (
                  <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl border border-green-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{addSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                      Full Name <span className="text-primary-rose">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={150}
                      value={addForm.fullName}
                      onChange={e => setAddForm(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                      Email Address <span className="text-primary-rose">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={256}
                      value={addForm.email}
                      onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="eleanor@example.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-deep-plum mb-1.5">
                      Password <span className="text-primary-rose">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        maxLength={100}
                        value={addForm.password}
                        onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="At least 8 characters"
                        className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep-plum"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted mt-1">Clients can change their password after signing in.</p>
                  </div>

                  <div className="pt-4 border-t border-border-color flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseAddModal}
                      disabled={addLoading}
                      className="px-4 py-2 text-sm text-muted hover:text-deep-plum rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="px-5 py-2 bg-primary-rose text-white text-sm font-semibold rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                    >
                      {addLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Create Account
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* Modal: View Customer Details */}
        {viewCustomer && (
          <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-border-color shadow-2xl overflow-hidden my-8">
              <div className="px-6 py-4 border-b border-border-color bg-ivory/70 flex items-center justify-between">
                <h3 className="font-serif font-semibold text-deep-plum text-lg">Customer Profile</h3>
                <button
                  onClick={() => setViewCustomer(null)}
                  className="p-1 rounded-md text-muted hover:text-deep-plum hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-rose-tint text-primary-rose flex items-center justify-center font-serif font-bold text-xl">
                    {viewCustomer.fullName ? viewCustomer.fullName[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold text-deep-plum text-lg">{viewCustomer.fullName}</h4>
                    <p className="text-xs font-mono text-muted">{viewCustomer.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Active</span>
                      {viewCustomer.isEmailVerified && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Email Verified</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-ivory/50 rounded-xl border border-border-color space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Customer ID:</span>
                    <strong className="text-deep-plum">#{viewCustomer.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Account Role:</span>
                    <strong className="text-deep-plum">Customer (User)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Member Since:</span>
                    <strong className="text-deep-plum">{new Date(viewCustomer.createdAtUtc).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setViewCustomer(null)}
                    className="px-5 py-2 bg-primary-rose text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-primary-rose/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Consultation Dossier Drawer */}
        <ClientDossierDrawer
          customerId={dossierCustomerId}
          isOpen={dossierOpen}
          onClose={() => setDossierOpen(false)}
        />

      </div>
    </DashboardLayout>
  );
}
