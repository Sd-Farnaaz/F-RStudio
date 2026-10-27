import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { staffService } from '../../services/staffService';
import TierUpgradePromptModal from '../../components/common/TierUpgradePromptModal';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, AlertCircle, Search } from 'lucide-react';

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [formData, setFormData] = useState({ fullName: '', email: '', phoneNumber: '', title: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await staffService.getStaffList();
      setStaffList(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staff = null) => {
    if (staff) {
      setCurrentStaff(staff);
      setFormData({
        fullName: staff.fullName, email: staff.email || '', phoneNumber: staff.phoneNumber || '', 
        title: staff.title || '', isActive: staff.isActive
      });
    } else {
      setCurrentStaff(null);
      setFormData({ fullName: '', email: '', phoneNumber: '', title: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStaff(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (currentStaff) {
        await staffService.updateStaff(currentStaff.id, formData);
      } else {
        await staffService.createStaff(formData);
      }
      await fetchStaff();
      handleCloseModal();
    } catch (err) {
      if (err.message && (err.message.includes('plan allows') || err.message.includes('upgrade your salon subscription'))) {
        setUpgradePrompt(err.message);
      } else {
        setError(err.message || 'Failed to save staff member');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    try {
      await staffService.updateStaffStatus(staff.id, !staff.isActive);
      await fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to completely remove this staff member?')) return;
    try {
      await staffService.deleteStaff(id);
      await fetchStaff();
    } catch (err) {
      setError(err.message || 'Failed to delete staff member');
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.title && s.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCount = staffList.filter(s => s.isActive).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Our Team</h1>
            <p className="text-sm text-muted">Manage staff profiles, contact details, and their working schedules.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-primary-rose text-white text-sm font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Staff Member
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-5 border border-border-color shadow-sm">
            <p className="text-sm font-medium text-muted mb-1">Total Staff</p>
            <p className="text-3xl font-serif text-deep-plum">{staffList.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-border-color shadow-sm">
            <p className="text-sm font-medium text-muted mb-1">Active</p>
            <p className="text-3xl font-serif text-success">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-border-color shadow-sm">
            <p className="text-sm font-medium text-muted mb-1">Inactive</p>
            <p className="text-3xl font-serif text-muted">{staffList.length - activeCount}</p>
          </div>
        </div>

        <div className="mb-6 flex relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input 
            type="text" 
            placeholder="Search team members..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white"
          />
        </div>

        {error && !isModalOpen && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-white rounded-xl border border-border-color animate-pulse" />
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="bg-white border border-border-color rounded-xl p-16 text-center shadow-sm">
            <h3 className="text-xl font-serif text-deep-plum mb-2">No staff members found</h3>
            <p className="text-muted mb-6">Start building your team to enable availability and bookings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map(staff => (
              <div key={staff.id} className="bg-white rounded-xl border border-border-color shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md">
                <div className="p-6 flex-1 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-rose-tint text-primary-rose flex items-center justify-center font-serif text-xl border border-primary-rose/10 shrink-0">
                    {staff.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-deep-plum truncate pr-2">{staff.fullName}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${staff.isActive ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'}`}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-primary-rose mb-2 font-medium">{staff.title || 'Professional'}</p>
                    {staff.email && <p className="text-xs text-muted truncate mb-1">{staff.email}</p>}
                    {staff.phoneNumber && <p className="text-xs text-muted truncate">{staff.phoneNumber}</p>}
                  </div>
                </div>
                <div className="border-t border-border-color bg-ivory/30 p-3 flex justify-between gap-2">
                  <Link 
                    to={`/admin/staff/${staff.id}/schedule`}
                    className="flex-1 inline-flex justify-center items-center px-3 py-2 text-sm font-medium text-deep-plum bg-white border border-border-color rounded-md hover:bg-soft-blush transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2 text-muted" /> Schedule
                  </Link>
                  <button onClick={() => handleOpenModal(staff)} className="px-3 py-2 text-muted bg-white border border-border-color rounded-md hover:text-primary-rose hover:bg-soft-blush transition-colors" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleStatus(staff)} className="px-3 py-2 text-muted bg-white border border-border-color rounded-md hover:text-deep-plum hover:bg-soft-blush transition-colors" title={staff.isActive ? "Deactivate" : "Activate"}>
                    <div className={`w-2.5 h-2.5 rounded-full ${staff.isActive ? 'bg-success' : 'bg-gray-400'}`} />
                  </button>
                  <button onClick={() => handleDelete(staff.id)} className="px-3 py-2 text-muted bg-white border border-border-color rounded-md hover:text-danger hover:bg-red-50 hover:border-red-100 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-border-color">
            <div className="px-6 py-5 border-b border-border-color bg-ivory">
              <h2 className="font-serif font-semibold text-xl text-deep-plum">{currentStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && isModalOpen && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1.5">Full Name *</label>
                <input 
                  type="text" name="fullName" required value={formData.fullName} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1.5">Professional Title</label>
                <input 
                  type="text" name="title" value={formData.title} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                  placeholder="e.g. Senior Stylist"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-deep-plum mb-1.5">Email</label>
                  <input 
                    type="email" name="email" value={formData.email} onChange={handleChange} disabled={saving}
                    className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-deep-plum mb-1.5">Phone Number</label>
                  <input 
                    type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} disabled={saving}
                    className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                  />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <input 
                  type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} disabled={saving}
                  className="h-4 w-4 text-primary-rose focus:ring-primary-rose border-gray-300 rounded" 
                />
                <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-deep-plum">
                  Staff member is active
                </label>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-border-color">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  disabled={saving}
                  className="px-5 py-2.5 text-sm border border-border-color text-muted font-medium rounded-lg hover:bg-soft-blush transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 text-sm bg-primary-rose text-white font-medium rounded-lg shadow-sm hover:bg-primary-rose/90 transition-all disabled:opacity-70 flex items-center"
                >
                  {saving ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tier Quota Upgrade Modal */}
      <TierUpgradePromptModal
        isOpen={!!upgradePrompt}
        onClose={() => setUpgradePrompt(null)}
        title="Specialist Quota Reached"
        message={upgradePrompt}
      />
    </DashboardLayout>
  );
}
