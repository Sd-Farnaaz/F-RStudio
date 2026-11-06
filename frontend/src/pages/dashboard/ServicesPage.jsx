import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import TierUpgradePromptModal from '../../components/common/TierUpgradePromptModal';
import { getImageUrl } from '../../utils/imageUrl';
import { 
  Plus, Edit2, Trash2, AlertCircle, CheckCircle2, 
  UploadCloud, X, Image as ImageIcon, Sparkles, Clock, DollarSign 
} from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    category: 'Hair', 
    description: '', 
    price: '', 
    durationMinutes: 30, 
    isActive: true 
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageError, setImageError] = useState('');

  const [saving, setSaving] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(null);

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
    setImageError('');
    if (service) {
      setCurrentService(service);
      setFormData({
        name: service.name, 
        category: service.category || 'Hair', 
        description: service.description || '',
        price: service.price, 
        durationMinutes: service.durationMinutes, 
        isActive: service.isActive
      });
      setImagePreview(service.imageUrl ? getImageUrl(service.imageUrl) : null);
      setImageBase64('');
      setImageName('');
    } else {
      setCurrentService(null);
      setFormData({ 
        name: '', 
        category: 'Hair', 
        description: '', 
        price: '', 
        durationMinutes: 30, 
        isActive: true 
      });
      setImagePreview(null);
      setImageBase64('');
      setImageName('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentService(null);
    setImagePreview(null);
    setImageBase64('');
    setImageName('');
    setImageError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (.jpg, .png, .webp).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Photo size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageBase64('');
    setImageName('');
    setImageError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setImageError('');

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        durationMinutes: parseInt(formData.durationMinutes, 10),
        imageBase64: imageBase64 || null,
        imageUrl: imagePreview ? (imageBase64 ? null : currentService?.imageUrl) : null
      };

      if (currentService) {
        await adminService.updateService(currentService.id, payload);
      } else {
        await adminService.createService(payload);
      }
      
      await fetchServices();
      handleCloseModal();
    } catch (err) {
      if (err.message && (err.message.includes('plan allows') || err.message.includes('upgrade your salon subscription'))) {
        setUpgradePrompt(err.message);
      } else {
        setError(err.message || 'Failed to save service');
      }
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
            <p className="text-sm text-muted">Manage your salon's services, photos, pricing, and availability.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-primary-rose text-white text-sm font-medium rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl border border-border-color animate-pulse" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white border border-border-color rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-soft-blush flex items-center justify-center text-primary-rose">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-serif font-medium text-deep-plum mb-2">No services yet</h3>
            <p className="text-muted text-sm max-w-sm mx-auto mb-6">
              Start building your catalog with photos, descriptions, and pricing to let clients book appointments.
            </p>
            <button 
              onClick={() => handleOpenModal()}
              className="px-6 py-2.5 bg-primary-rose text-white font-medium rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Your First Service
            </button>
          </div>
        ) : (
          <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-ivory/60 border-b border-border-color">
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-deep-plum">Service</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-deep-plum">Category</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-deep-plum text-right">Duration</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-deep-plum text-right">Price</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-deep-plum text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-deep-plum text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color/80">
                  {services.map(svc => (
                    <tr key={svc.id} className="hover:bg-soft-blush/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          {svc.imageUrl ? (
                            <img 
                              src={getImageUrl(svc.imageUrl)} 
                              alt={svc.name} 
                              className="w-12 h-12 rounded-xl object-cover border border-border-color shrink-0 shadow-2xs"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-ivory border border-border-color flex items-center justify-center text-primary-rose/70 shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-deep-plum">{svc.name}</div>
                            {svc.description && (
                              <div className="text-xs text-muted truncate max-w-[240px] mt-0.5">
                                {svc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-deep-plum/80">
                        <span className="px-2.5 py-1 bg-ivory border border-border-color rounded-md">
                          {svc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted text-right">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted" />
                          {svc.durationMinutes} min
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-deep-plum text-right">
                        ₹{Number(svc.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          svc.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {svc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleOpenModal(svc)} 
                          className="p-1.5 text-muted hover:text-primary-rose hover:bg-soft-blush/60 transition-colors rounded-lg"
                          title="Edit Service"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(svc.id)} 
                          className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-lg ml-1"
                          title="Delete Service"
                        >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-border-color">
            <div className="px-6 py-4 border-b border-border-color bg-ivory/80 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-serif font-medium text-lg text-deep-plum">
                {currentService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="p-1 text-muted hover:text-deep-plum rounded-lg hover:bg-soft-blush/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Service Photo Upload Box */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary-rose" />
                    Service Photo <span className="text-muted font-normal lowercase">(optional)</span>
                  </span>
                  {imagePreview && (
                    <button 
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  )}
                </label>

                {imagePreview ? (
                  <div className="p-3 bg-white rounded-xl border border-primary-rose/30 flex items-center gap-3 shadow-2xs">
                    <img 
                      src={imagePreview} 
                      alt="Service preview" 
                      className="w-16 h-16 object-cover rounded-xl border border-border-color shadow-2xs shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-deep-plum truncate">
                        {imageName || 'Service image selected'}
                      </p>
                      <label className="text-[11px] text-primary-rose hover:underline cursor-pointer inline-block mt-1">
                        Change Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageSelect} 
                          className="hidden" 
                          disabled={saving}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="group flex flex-col items-center justify-center p-4 border border-dashed border-border-color hover:border-primary-rose/60 rounded-xl bg-ivory/50 hover:bg-soft-blush/20 cursor-pointer transition-all text-center">
                    <UploadCloud className="w-6 h-6 text-muted group-hover:text-primary-rose transition-colors mb-1.5" />
                    <span className="text-xs font-medium text-deep-plum">Upload Service Image</span>
                    <span className="text-[11px] text-muted mt-0.5">JPG, PNG, WebP up to 5MB (Optional)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageSelect} 
                      className="hidden" 
                      disabled={saving}
                    />
                  </label>
                )}

                {imageError && (
                  <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {imageError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                  Service Name *
                </label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleChange} 
                  disabled={saving}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-ivory text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40" 
                  placeholder="e.g. Luxury Hair Styling & Wash"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                  Category *
                </label>
                <select 
                  name="category" 
                  required 
                  value={formData.category} 
                  onChange={handleChange} 
                  disabled={saving}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-ivory text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40"
                >
                  <option value="Hair">Hair Styling & Care</option>
                  <option value="Nails">Nails & Manicure</option>
                  <option value="Skin">Skincare & Facial</option>
                  <option value="Massage">Massage & Spa</option>
                  <option value="Bridal">Bridal & Makeup</option>
                  <option value="Beard">Beard & Grooming</option>
                  <option value="Other">Other Specialized Care</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Price (INR) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    name="price" 
                    required 
                    value={formData.price} 
                    onChange={handleChange} 
                    disabled={saving}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-ivory text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40" 
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                    Duration (Minutes) *
                  </label>
                  <input 
                    type="number" 
                    min="5" 
                    max="480" 
                    name="durationMinutes" 
                    required 
                    value={formData.durationMinutes} 
                    onChange={handleChange} 
                    disabled={saving}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-ivory text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
                  Description
                </label>
                <textarea 
                  name="description" 
                  rows={3} 
                  value={formData.description} 
                  onChange={handleChange} 
                  disabled={saving}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm bg-ivory text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 resize-none" 
                  placeholder="Detail the experience, products used, and benefits..."
                />
              </div>

              <div className="flex items-center pt-1">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  name="isActive" 
                  checked={formData.isActive} 
                  onChange={handleChange} 
                  disabled={saving}
                  className="h-4 w-4 text-primary-rose focus:ring-primary-rose border-border-color rounded cursor-pointer" 
                />
                <label htmlFor="isActive" className="ml-2 block text-xs font-medium text-deep-plum cursor-pointer">
                  Service is active and visible for customer booking
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border-color mt-6">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  disabled={saving}
                  className="px-4 py-2.5 text-xs font-medium border border-border-color text-muted rounded-xl hover:bg-soft-blush/40 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-5 py-2.5 text-xs bg-primary-rose text-white font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm disabled:opacity-70 flex items-center gap-1.5"
                >
                  {saving ? 'Saving Service...' : 'Save Service'}
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
        title="Services Catalog Quota Reached"
        message={upgradePrompt}
      />
    </DashboardLayout>
  );
}
