import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminService } from '../../services/adminService';
import { AlertCircle, CheckCircle2, Save, MapPin, Store, RotateCcw, ExternalLink, RefreshCw } from 'lucide-react';

const REQUIRED_FIELDS = ['name', 'businessType'];
const OPTIONAL_FIELDS = [
  'description', 'addressLine', 'city', 'state', 
  'postalCode', 'country', 'phoneNumber', 'contactEmail', 
  'timeZone', 'currencyCode'
];

export default function SalonProfilePage() {
  const navigate = useNavigate();
  
  const [initialProfile, setInitialProfile] = useState(null);
  const [profile, setProfile] = useState({
    name: '', businessType: 'Hair Salon', description: '', 
    addressLine: '', city: '', state: '', postalCode: '', country: '', 
    phoneNumber: '', contactEmail: '', timeZone: 'UTC', currencyCode: 'USD',
    slug: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Required for some browsers
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminService.getSalonProfile();
      
      const loadedProfile = {
        name: data.name || '',
        businessType: data.businessType || 'Hair Salon',
        description: data.description || '',
        addressLine: data.addressLine || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        phoneNumber: data.phoneNumber || '',
        contactEmail: data.contactEmail || '',
        timeZone: data.timeZone || 'UTC',
        currencyCode: data.currencyCode || 'USD',
        slug: data.slug || ''
      };
      
      setInitialProfile(loadedProfile);
      setProfile(loadedProfile);
      setIsDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => {
      const updated = { ...prev, [name]: value };
      setIsDirty(JSON.stringify(updated) !== JSON.stringify(initialProfile));
      return updated;
    });
  };

  const handleReset = () => {
    if (initialProfile) {
      setProfile(initialProfile);
      setIsDirty(false);
      setError('');
      setSuccess('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile.name || !profile.businessType) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Send the payload matching UpdateSalonProfileRequest
      await adminService.updateSalonProfile({
        name: profile.name,
        description: profile.description,
        businessType: profile.businessType,
        addressLine: profile.addressLine,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
        country: profile.country,
        phoneNumber: profile.phoneNumber,
        contactEmail: profile.contactEmail,
        timeZone: profile.timeZone,
        currencyCode: profile.currencyCode,
        openingHoursJson: initialProfile?.openingHoursJson // Preserve existing if not editable here
      });
      
      setSuccess('Profile updated successfully!');
      setInitialProfile(profile);
      setIsDirty(false);
      
      // Clear success message after 3s
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  // Completion calculation
  const allTrackedFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  const filledFields = allTrackedFields.filter(f => profile[f] && profile[f].trim() !== '');
  const completionPercentage = Math.round((filledFields.length / allTrackedFields.length) * 100);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 w-64 bg-white border border-border-color rounded-lg animate-pulse" />
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 h-[600px] bg-white rounded-xl border border-border-color animate-pulse" />
            <div className="w-full lg:w-[400px] h-[400px] bg-white rounded-xl border border-border-color animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Salon Profile</h1>
            <p className="text-sm text-muted">Manage your business identity, location, and public presence.</p>
          </div>
          {profile.slug && (
            <Link 
              to={`/salons/${profile.slug}`} 
              target="_blank"
              className="inline-flex items-center px-4 py-2 bg-white border border-border-color text-deep-plum text-sm font-medium rounded-lg hover:border-primary-rose hover:text-primary-rose transition-all shadow-sm"
            >
              View Public Page <ExternalLink className="w-4 h-4 ml-2" />
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> {success}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Editor Column */}
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden">
              
              {/* Profile Completion Bar */}
              <div className="bg-ivory/50 px-6 py-4 border-b border-border-color flex items-center justify-between">
                <span className="text-sm font-medium text-deep-plum">Profile Completion</span>
                <div className="flex items-center gap-3 w-1/2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-rose transition-all duration-500 ease-out"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted w-8 text-right">{completionPercentage}%</span>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-10">
                {/* Section A: Business Identity */}
                <section>
                  <h3 className="text-lg font-serif font-medium text-deep-plum mb-4 flex items-center">
                    <Store className="w-5 h-5 mr-2 text-primary-rose" /> Business Identity
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Salon Name *</label>
                      <input 
                        type="text" name="name" required value={profile.name} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                        placeholder="e.g. Ivory & Rose Salon"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Business Type *</label>
                      <select 
                        name="businessType" required value={profile.businessType} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white transition-shadow"
                      >
                        <option value="Hair Salon">Hair Salon</option>
                        <option value="Nail Salon">Nail Salon</option>
                        <option value="Spa">Spa & Wellness</option>
                        <option value="Barbershop">Barbershop</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Description</label>
                      <textarea 
                        name="description" rows={4} value={profile.description} onChange={handleChange} disabled={saving}
                        placeholder="Tell clients about your services, specialties, and salon experience..."
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none resize-none transition-shadow" 
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-border-color" />

                {/* Section B: Contact & Location */}
                <section>
                  <h3 className="text-lg font-serif font-medium text-deep-plum mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary-rose" /> Contact & Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Phone Number</label>
                      <input 
                        type="tel" name="phoneNumber" value={profile.phoneNumber} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Public Contact Email</label>
                      <input 
                        type="email" name="contactEmail" value={profile.contactEmail} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                        placeholder="hello@salon.com"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Address Line</label>
                      <input 
                        type="text" name="addressLine" value={profile.addressLine} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                        placeholder="123 Beauty Blvd, Suite 100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">City</label>
                      <input 
                        type="text" name="city" value={profile.city} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">State / Province</label>
                      <input 
                        type="text" name="state" value={profile.state} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Postal Code</label>
                      <input 
                        type="text" name="postalCode" value={profile.postalCode} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Country</label>
                      <input 
                        type="text" name="country" value={profile.country} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none transition-shadow" 
                      />
                    </div>
                  </div>
                </section>

                <hr className="border-border-color" />

                {/* Section C: Regional Settings */}
                <section>
                  <h3 className="text-lg font-serif font-medium text-deep-plum mb-4">Regional Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Time Zone</label>
                      <select 
                        name="timeZone" value={profile.timeZone} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white transition-shadow"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (US)</option>
                        <option value="America/Chicago">Central Time (US)</option>
                        <option value="America/Denver">Mountain Time (US)</option>
                        <option value="America/Los_Angeles">Pacific Time (US)</option>
                        <option value="Europe/London">London (UK)</option>
                        <option value="Asia/Kolkata">India Standard Time (IST)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-deep-plum mb-1.5">Currency</label>
                      <select 
                        name="currencyCode" value={profile.currencyCode} onChange={handleChange} disabled={saving}
                        className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white transition-shadow"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                  </div>
                </section>

              </div>

              {/* Save Controls */}
              <div className="bg-ivory/50 px-6 py-4 border-t border-border-color flex items-center justify-between">
                {isDirty ? (
                  <span className="text-sm font-medium text-warning flex items-center">
                    <span className="w-2 h-2 rounded-full bg-warning mr-2 animate-pulse"></span>
                    Unsaved changes
                  </span>
                ) : (
                  <span className="text-sm text-muted">All changes saved</span>
                )}
                
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={handleReset} 
                    disabled={saving || !isDirty}
                    className="px-5 py-2.5 border border-border-color text-muted text-sm font-medium rounded-lg hover:bg-white hover:text-deep-plum transition-colors disabled:opacity-50 flex items-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" /> Discard
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving || !isDirty}
                    className="px-5 py-2.5 bg-primary-rose text-white text-sm font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm flex items-center disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>

            </form>
          </div>

          {/* Public Preview Column */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 px-1">Public Preview</h3>
              
              <div className="bg-white rounded-2xl shadow-xl shadow-deep-plum/5 border border-border-color overflow-hidden flex flex-col relative transition-all">
                {isDirty && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-warning"></div>
                )}
                
                {/* Header Block */}
                <div className="h-24 bg-rose-tint flex items-end p-5">
                  <span className="px-2.5 py-1 bg-primary-rose text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                    {profile.businessType || 'Salon'}
                  </span>
                </div>
                
                <div className="p-6">
                  <h4 className="text-xl font-serif font-semibold text-deep-plum mb-1">
                    {profile.name || 'Your Salon Name'}
                  </h4>
                  
                  <div className="flex items-start text-muted text-sm mt-3">
                    <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-primary-rose/70" />
                    <span>
                      {profile.addressLine ? (
                        <>
                          {profile.addressLine}<br />
                          {[profile.city, profile.state, profile.postalCode].filter(Boolean).join(', ')}<br />
                          {profile.country}
                        </>
                      ) : (
                        <em className="text-gray-400">No address provided</em>
                      )}
                    </span>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border-color space-y-4 text-sm">
                    <div>
                      <h5 className="font-medium text-deep-plum mb-1.5">About Us</h5>
                      <p className="text-muted leading-relaxed line-clamp-4">
                        {profile.description || <em className="text-gray-400">No description provided yet.</em>}
                      </p>
                    </div>

                    {(profile.phoneNumber || profile.contactEmail) && (
                      <div className="pt-2">
                        <h5 className="font-medium text-deep-plum mb-2">Contact</h5>
                        {profile.phoneNumber && (
                          <div className="flex items-center text-muted mb-1">
                            <span className="w-5 font-medium text-primary-rose/70">P:</span> {profile.phoneNumber}
                          </div>
                        )}
                        {profile.contactEmail && (
                          <div className="flex items-center text-muted">
                            <span className="w-5 font-medium text-primary-rose/70">E:</span> {profile.contactEmail}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-ivory/50 p-4 border-t border-border-color text-center">
                  <p className="text-[11px] text-muted font-medium">
                    {isDirty ? 'Preview shows unsaved changes' : 'This is how customers see your profile'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
