import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { superAdminService } from '../../services/superAdminService';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Search, 
  Filter, 
  X, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Power, 
  Mail, 
  CheckCircle2, 
  Building2,
  Clock,
  Shield
} from 'lucide-react';

export default function SuperAdminUsersPage() {
  const { user: currentSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter states
  const initialSearch = searchParams.get('search') || '';
  const initialRole = searchParams.get('role') || 'all';
  const initialActive = searchParams.get('isActive') || 'all';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [activeFilter, setActiveFilter] = useState(initialActive);
  const [currentPage, setCurrentPage] = useState(isNaN(initialPage) ? 1 : initialPage);

  const [users, setUsers] = useState([]);
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

  // Status Action Modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    user: null,
    isActive: false,
    isSubmitting: false,
    error: '',
    success: ''
  });

  const fetchUsers = useCallback(async (params) => {
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

      if (params.role !== 'all' && params.role !== undefined) {
        queryParams.role = params.role;
      }

      if (params.isActive !== 'all' && params.isActive !== undefined) {
        queryParams.isActive = params.isActive === 'true';
      }

      const res = await superAdminService.getUsers(queryParams);
      const items = res.items || (Array.isArray(res) ? res : []);
      setUsers(items);
      setPagination({
        page: res.page || params.page || 1,
        pageSize: res.pageSize || 15,
        totalCount: typeof res.totalCount === 'number' ? res.totalCount : items.length,
        totalPages: res.totalPages || Math.ceil((res.totalCount || items.length) / 15) || 1,
        hasPreviousPage: !!res.hasPreviousPage,
        hasNextPage: !!res.hasNextPage
      });
    } catch (err) {
      setError(err.message || 'Failed to load user accounts.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers({
      search: searchTerm,
      role: roleFilter,
      isActive: activeFilter,
      page: currentPage
    });

    const nextParams = new URLSearchParams();
    if (searchTerm) nextParams.set('search', searchTerm);
    if (roleFilter !== 'all') nextParams.set('role', roleFilter);
    if (activeFilter !== 'all') nextParams.set('isActive', activeFilter);
    if (currentPage > 1) nextParams.set('page', currentPage.toString());
    setSearchParams(nextParams, { replace: true });
  }, [searchTerm, roleFilter, activeFilter, currentPage, fetchUsers, setSearchParams]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers({
      search: searchTerm,
      role: roleFilter,
      isActive: activeFilter,
      page: 1
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setActiveFilter('all');
    setCurrentPage(1);
  };

  const openStatusModal = (targetUser) => {
    setStatusModal({
      isOpen: true,
      user: targetUser,
      isActive: !targetUser.isActive,
      isSubmitting: false,
      error: '',
      success: ''
    });
  };

  const submitStatusChange = async (e) => {
    e.preventDefault();
    if (!statusModal.user) return;

    // Self deactivation client-side safeguard
    if (isSelfUser(statusModal.user) && !statusModal.isActive) {
      setStatusModal(prev => ({
        ...prev,
        error: 'You cannot deactivate your own active SuperAdmin account.'
      }));
      return;
    }

    try {
      setStatusModal(prev => ({ ...prev, isSubmitting: true, error: '' }));
      await superAdminService.updateUserStatus(statusModal.user.id, {
        isActive: statusModal.isActive
      });

      setUsers(prev => prev.map(u => 
        u.id === statusModal.user.id ? { ...u, isActive: statusModal.isActive } : u
      ));

      setStatusModal({
        isOpen: false,
        user: null,
        isActive: false,
        isSubmitting: false,
        error: '',
        success: ''
      });
    } catch (err) {
      setStatusModal(prev => ({ ...prev, isSubmitting: false, error: err.message || 'Failed to update user status' }));
    }
  };

  const isSelfUser = (targetUser) => {
    if (!targetUser || !currentSuperAdmin) return false;
    return targetUser.id === currentSuperAdmin.id || 
           (targetUser.email && targetUser.email.toLowerCase() === currentSuperAdmin.email?.toLowerCase());
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getRoleBadge = (role) => {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'superadmin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-deep-plum text-white shadow-2xs">
          <Shield className="w-3 h-3 text-dusty-rose" />
          <span>SuperAdmin</span>
        </span>
      );
    }
    if (normalized === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-soft-blush text-primary-rose border border-dusty-rose/40">
          <Building2 className="w-3 h-3" />
          <span>Salon Admin</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
        <Users className="w-3 h-3 text-muted" />
        <span>Customer</span>
      </span>
    );
  };

  const hasActiveFilters = searchTerm.trim() !== '' || roleFilter !== 'all' || activeFilter !== 'all';

  return (
    <SuperAdminLayout
      title="Platform User Management"
      breadcrumbs={[{ label: 'Users' }]}
    >
      <div className="space-y-6">

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-border-color shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-medium text-deep-plum">
                Platform Accounts Directory
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Manage accounts across all platform roles (SuperAdmins, Salon Administrators, and End Customers).
              </p>
            </div>

            {!loading && !error && (
              <span className="text-xs text-muted bg-ivory px-3 py-1 rounded-full border border-border-color shadow-2xs self-start sm:self-center font-medium">
                {pagination.totalCount} {pagination.totalCount === 1 ? 'user registered' : 'users registered'}
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
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum placeholder:text-muted/70"
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

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium"
              >
                <option value="all">Role: All Accounts</option>
                <option value="SuperAdmin">SuperAdmin Only</option>
                <option value="Admin">Salon Administrators Only</option>
                <option value="User">Customers Only</option>
              </select>
            </div>

            {/* Active Status Filter */}
            <div>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-ivory text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 text-deep-plum font-medium"
              >
                <option value="all">Status: All</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive / Suspended Only</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all flex items-center justify-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Accounts</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-2.5 bg-ivory border border-border-color text-muted hover:text-deep-plum text-xs font-semibold rounded-xl hover:bg-soft-blush transition-colors"
                  title="Reset filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* User Table Content */}
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
              <h3 className="font-serif text-lg font-medium text-deep-plum">Unable to Load Users</h3>
              <p className="text-xs text-muted mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchUsers({ search: searchTerm, role: roleFilter, isActive: activeFilter, page: currentPage })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-3xl border border-border-color p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-soft-blush border border-dusty-rose/30 flex items-center justify-center text-primary-rose mx-auto">
              <Users className="w-7 h-7 opacity-80" />
            </div>
            <h3 className="font-serif text-xl font-medium text-deep-plum">No Users Found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'Try modifying your search query or switching role filters.'
                : 'No users have registered on the platform.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border-color shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted">
                <thead className="bg-ivory/80 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-border-color">
                  <tr>
                    <th className="py-3.5 px-6">User Account</th>
                    <th className="py-3.5 px-6">Role</th>
                    <th className="py-3.5 px-6">Tenant Association</th>
                    <th className="py-3.5 px-6">Email Verification</th>
                    <th className="py-3.5 px-6">Activity Timeline</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/70 font-sans">
                  {users.map((targetUser) => {
                    const isSelf = isSelfUser(targetUser);
                    return (
                      <tr key={targetUser.id} className="hover:bg-soft-blush/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-soft-blush border border-dusty-rose/30 text-deep-plum font-serif text-sm font-bold flex items-center justify-center shrink-0">
                              {targetUser.fullName?.charAt(0) || targetUser.email?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-deep-plum text-sm truncate">
                                  {targetUser.fullName || 'No Name Provided'}
                                </span>
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted/60" />
                                {targetUser.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {getRoleBadge(targetUser.role)}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {targetUser.salonName ? (
                            <span className="font-medium text-deep-plum">{targetUser.salonName}</span>
                          ) : (
                            <span className="text-muted italic">Platform-wide</span>
                          )}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          {targetUser.isEmailVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted">
                              <Clock className="w-3.5 h-3.5 text-muted/60" />
                              <span>Unverified</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap text-[11px] text-muted space-y-0.5">
                          <div>Joined: <strong className="text-deep-plum">{formatDate(targetUser.createdAtUtc)}</strong></div>
                          <div>Last Seen: {formatDate(targetUser.lastLoginAtUtc)}</div>
                        </td>

                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            targetUser.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${targetUser.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            <span>{targetUser.isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          {isSelf ? (
                            <span className="text-[11px] text-muted italic pr-2">
                              Self-account
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openStatusModal(targetUser)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 ${
                                targetUser.isActive
                                  ? 'bg-ivory text-rose-700 border border-border-color hover:bg-rose-50 hover:border-rose-200'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                              }`}
                            >
                              <Power className="w-3 h-3" />
                              <span>{targetUser.isActive ? 'Deactivate' : 'Activate'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-border-color flex flex-col sm:flex-row items-center justify-between gap-4 bg-ivory/50">
                <span className="text-xs text-muted">
                  Showing page <strong className="text-deep-plum">{pagination.page}</strong> of <strong className="text-deep-plum">{pagination.totalPages}</strong> ({pagination.totalCount} total users)
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

        {/* Confirmation Modal */}
        {statusModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full border border-border-color shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl font-medium text-deep-plum">
                    {statusModal.isActive ? 'Activate Account' : 'Deactivate Account'}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    User: <strong>{statusModal.user?.fullName}</strong> ({statusModal.user?.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusModal({ isOpen: false, user: null, isActive: false, isSubmitting: false, error: '', success: '' })}
                  className="text-muted hover:text-deep-plum p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {statusModal.error && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                  {statusModal.error}
                </div>
              )}

              <form onSubmit={submitStatusChange} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-ivory border border-border-color text-xs space-y-1.5 leading-relaxed">
                  <p className="text-deep-plum font-medium">
                    {statusModal.isActive
                      ? 'Activating this account will allow the user to authenticate and access platform capabilities according to their role.'
                      : 'Deactivating this account will immediately block future login attempts for this user across F&R Beauty Studio.'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusModal({ isOpen: false, user: null, isActive: false, isSubmitting: false, error: '', success: '' })}
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
                    {statusModal.isSubmitting ? 'Updating...' : statusModal.isActive ? 'Confirm Activation' : 'Confirm Deactivation'}
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
