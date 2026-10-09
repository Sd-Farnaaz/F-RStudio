import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SalonProfilePage() {
  const [profile, setProfile] = useState({
    name: '', description: '', businessType: '', addressLine: '',
    city: '', state: '', postalCode: '', country: 'India',
    phoneNumber: '', contactEmail: '', timeZone: '', currencyCode: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await adminService.getSalonProfile();
      setProfile(prev => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await adminService.updateSalonProfile(profile);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-border-color rounded animate-pulse" />
          <div className="h-[400px] bg-white rounded-xl border border-border-color animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-2">Salon Profile</h1>
        <p className="text-sm text-muted mb-8">Manage your salon's public details and contact information.</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" /> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-md border border-green-200 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2" /> {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-border-color overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-deep-plum mb-1">Salon Name *</label>
                <input 
                  type="text" name="name" required value={profile.name} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Business Type *</label>
                <select 
                  name="businessType" required value={profile.businessType} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white"
                >
                  <option value="Hair Salon">Hair Salon</option>
                  <option value="Nail Salon">Nail Salon</option>
                  <option value="Spa">Spa & Wellness</option>
                  <option value="Barbershop">Barbershop</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Phone Number</label>
                <input 
                  type="tel" name="phoneNumber" value={profile.phoneNumber || ''} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-deep-plum mb-1">Description</label>
                <textarea 
                  name="description" rows={3} value={profile.description || ''} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none resize-none" 
                />
              </div>
            </div>

            <hr className="border-border-color" />
            <h3 className="text-lg font-medium text-deep-plum">Location</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-deep-plum mb-1">Address Line</label>
                <input 
                  type="text" name="addressLine" value={profile.addressLine || ''} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">City</label>
                <input 
                  type="text" name="city" value={profile.city || ''} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">State / Province</label>
                <input 
                  type="text" name="state" value={profile.state || ''} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Postal Code</label>
                <input 
                  type="text" name="postalCode" value={profile.postalCode || ''} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-deep-plum mb-1">Country</label>
                <input 
                  type="text" name="country" value={profile.country || 'India'} onChange={handleChange} disabled={saving}
                  className="w-full px-4 py-2 border border-border-color rounded-md focus:ring-2 focus:ring-primary-rose/50 outline-none" 
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => fetchProfile()} 
                disabled={saving}
                className="px-6 py-2 border border-border-color text-muted font-medium rounded-md hover:bg-soft-blush transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={saving}
                className="px-6 py-2 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm flex items-center disabled:opacity-70"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
