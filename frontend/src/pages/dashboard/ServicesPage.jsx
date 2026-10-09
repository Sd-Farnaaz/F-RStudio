import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: '', description: '', price: '', durationMinutes: 30, isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await adminService.getServices();
      setServices(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service = null) => {
    if (service) {
      setCurrentService(service);
      setFormData({
        name: service.name, category: service.category, description: service.description || '',
        price: service.price, durationMinutes: service.durationMinutes, isActive: service.isActive
      });
    } else {
      setCurrentService(null);
      setFormData({ name: '', category: 'Hair', description: '', price: '', durationMinutes: 30, isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentService(null);
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
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        durationMinutes: parseInt(formData.durationMinutes, 10)
      };

      if (currentService) {
        await adminService.updateService(currentService.id, payload);
      } else {
        await adminService.createService(payload);
      }
      
      await fetchServices();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await adminService.deleteService(id);
      await fetchServices();
    } catch (err) {
      setError(err.message || 'Failed to delete service');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Service Catalog</h1>
            <p className="text-sm text-muted">Manage your salon's services, pricing, and availability.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-primary-rose text-white text-sm font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Service
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl border border-border-color animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white border border-border-color rounded-xl p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-deep-plum mb-2">No services yet</h3>
            <p className="text-muted mb-6">Start building your catalog to let clients book appointments.</p>
            <button 
              onClick={() => handleOpenModal()}
              className="px-6 py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm"
            >
              Add Your First Service
            </button>
          </div>
        ) : (
          <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ivory/50 border-b border-border-color">
                    <th className="px-6 py-4 font-medium text-sm text-deep-plum">Service Name</th>
                    <th className="px-6 py-4 font-medium text-sm text-deep-plum">Category</th>
                    <th className="px-6 py-4 font-medium text-sm text-deep-plum text-right">Duration</th>
                    <th className="px-6 py-4 font-medium text-sm text-deep-plum text-right">Price</th>
                    <th className="px-6 py-4 font-medium text-sm text-deep-plum text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-sm text-deep-plum text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color">
                  {services.map(svc => (
                    <tr key={svc.id} className="hover:bg-soft-blush/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-deep-plum">{svc.name}</div>
                        {svc.description && <div className="text-xs text-muted truncate max-w-[200px] mt-1">{svc.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">{svc.category}</td>
                      <td className="px-6 py-4 text-sm text-muted text-right">{svc.durationMinutes} min</td>
                      <td className="px-6 py-4 text-sm font-medium text-deep-plum text-right">${svc.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${svc.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {svc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(svc)} className="p-1.5 text-muted hover:text-primary-rose transition-colors rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(svc.id)} className="p-1.5 text-muted hover:text-red-600 transition-colors rounded ml-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-border-color">
            <div className="px-6 py-4 border-b border-border-color bg-ivory">
              <h2 className="font-medium text-lg text-deep-plum">{currentService ? 'Edit Service' : 'Add New Service'}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Service Name *</label>
                <input 
                  type="text" name="name" required value={formData.name} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 text-sm border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                  placeholder="e.g. Women's Haircut"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Category *</label>
                <select 
                  name="category" required value={formData.category} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 text-sm border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white"
                >
                  <option value="Hair">Hair</option>
                  <option value="Nails">Nails</option>
                  <option value="Skin">Skin</option>
                  <option value="Massage">Massage</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-deep-plum mb-1">Price *</label>
                  <input 
                    type="number" step="0.01" min="0" name="price" required value={formData.price} onChange={handleChange} disabled={saving}
                    className="w-full px-4 py-2 text-sm border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-deep-plum mb-1">Duration (min) *</label>
                  <input 
                    type="number" min="5" max="480" name="durationMinutes" required value={formData.durationMinutes} onChange={handleChange} disabled={saving}
                    className="w-full px-4 py-2 text-sm border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Description</label>
                <textarea 
                  name="description" rows={3} value={formData.description} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 text-sm border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none resize-none" 
                  placeholder="Brief description of the service..."
                />
              </div>

              <div className="flex items-center pt-2">
                <input 
                  type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} disabled={saving}
                  className="h-4 w-4 text-primary-rose focus:ring-primary-rose border-gray-300 rounded" 
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-deep-plum">
                  Service is active and bookable
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border-color mt-6">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  disabled={saving}
                  className="px-4 py-2 text-sm border border-border-color text-muted font-medium rounded-md hover:bg-soft-blush transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm disabled:opacity-70"
                >
                  {saving ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
