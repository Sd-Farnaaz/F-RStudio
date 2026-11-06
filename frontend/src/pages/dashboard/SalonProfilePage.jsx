import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { paymentService } from '../../services/paymentService';
import { detectCurrentLocation } from '../../utils/geolocation';
import { getImageUrl } from '../../utils/imageUrl';
import { compressImageFile } from '../../utils/imageCompressor';
import { 
  AlertCircle, CheckCircle2, Save, MapPin, Store, RotateCcw, ExternalLink, 
  RefreshCw, CreditCard, QrCode, DollarSign, Info, Camera, UploadCloud, Compass, Loader2
} from 'lucide-react';

const REQUIRED_FIELDS = ['name', 'businessType'];
const OPTIONAL_FIELDS = [
  'description', 'addressLine', 'city', 'state', 
  'postalCode', 'country', 'phoneNumber', 'contactEmail', 
  'timeZone', 'currencyCode'
];

export default function SalonProfilePage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'payments'
  
  const [initialProfile, setInitialProfile] = useState(null);
  const [profile, setProfile] = useState({
    name: '', businessType: 'Hair Salon', description: '', 
    addressLine: '', city: '', state: '', postalCode: '', country: '', 
    phoneNumber: '', contactEmail: '', timeZone: 'UTC', currencyCode: 'USD',
    slug: '', logoUrl: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: '',
    qrCodeImageUrl: '',
    isAdvancePaymentRequired: false,
    advancePaymentType: 'Fixed',
    advancePaymentValue: '',
    currencyCode: 'INR'
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [qrImgError, setQrImgError] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchPaymentSettings();
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
        slug: data.slug || '',
        logoUrl: data.logoUrl || ''
      };
      
      setInitialProfile(loadedProfile);
      setProfile(loadedProfile);
      setLogoError(false);
      setIsDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (.jpg, .png, .webp).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    setUploadingLogo(true);
    setLogoError(false);
    setError('');
    setSuccess('');

    try {
      // Compress and optimize client-side to ensure rapid upload and lightweight persistence
      const { dataUrl, file: compressedFile } = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.82
      });

      setProfile(prev => {
        const updated = { ...prev, logoUrl: dataUrl };
        setIsDirty(JSON.stringify(updated) !== JSON.stringify(initialProfile));
        return updated;
      });
      setLogoError(false);

      try {
        const response = await adminService.uploadSalonLogo(compressedFile);
        const newLogoUrl = response?.logoUrl || dataUrl;
        setProfile(prev => ({ ...prev, logoUrl: newLogoUrl }));
        setInitialProfile(prev => ({ ...prev, logoUrl: newLogoUrl }));
        updateUser({ salonLogoUrl: newLogoUrl });
        setLogoError(false);
        setSuccess('Salon photo updated successfully.');
      } catch (uploadErr) {
        // High-fidelity fallback: compressed base64 is in profile state and will be stored on profile save
        setSuccess('Salon photo selected. Click "Save Changes" below to save your profile.');
      }
    } catch (compressionErr) {
      setError('Failed to process the photo. Please try a different image.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemovePhoto = () => {
    setProfile(prev => {
      const updated = { ...prev, logoUrl: '' };
      setIsDirty(JSON.stringify(updated) !== JSON.stringify(initialProfile));
      return updated;
    });
    setLogoError(false);
  };

  const handleDetectLocation = async () => {
    setIsLocating(true);
    setLocationMessage('');
    setError('');
    try {
      const location = await detectCurrentLocation();
      setProfile(prev => {
        const updated = {
          ...prev,
          addressLine: location.addressLine || prev.addressLine,
          city: location.city || prev.city,
          state: location.state || prev.state,
          postalCode: location.postalCode || prev.postalCode,
          country: location.country || prev.country
        };
        setIsDirty(JSON.stringify(updated) !== JSON.stringify(initialProfile));
        return updated;
      });

      const summary = [location.addressLine, location.city, location.state, location.postalCode]
        .filter(Boolean)
        .join(', ');
      setLocationMessage(summary || 'Location detected.');
      setSuccess('Location coordinates detected and address auto-filled! Click "Save Changes" to apply.');
    } catch (err) {
      setError(err.message || 'Unable to detect location. Please type your address manually.');
    } finally {
      setIsLocating(false);
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
        logoUrl: profile.logoUrl || null,
        photoBase64: profile.logoUrl?.startsWith('data:') ? profile.logoUrl : null,
        openingHoursJson: initialProfile?.openingHoursJson // Preserve existing if not editable here
      });
      
      setSuccess('Profile updated successfully!');
      setInitialProfile(profile);
      updateUser({ salonName: profile.name, salonLogoUrl: profile.logoUrl });
      setIsDirty(false);
      
      // Clear success message after 3s
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError('');
      const data = await paymentService.getPaymentSettings();
      setPaymentSettings({
        upiId: data.upiId || '',
        qrCodeImageUrl: data.qrCodeImageUrl || '',
        isAdvancePaymentRequired: !!data.isAdvancePaymentRequired,
        advancePaymentType: data.advancePaymentType || 'Fixed',
        advancePaymentValue: data.advancePaymentValue !== null && data.advancePaymentValue !== undefined ? data.advancePaymentValue : '',
        currencyCode: data.currencyCode || 'INR',
        hasAdvanceDepositEngine: data.hasAdvanceDepositEngine ?? true,
        currentTier: data.currentTier || 'Starter'
      });
      setQrImgError(false);
    } catch (err) {
      setPaymentError(err.message || 'Failed to load payment settings.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (name === 'qrCodeImageUrl') setQrImgError(false);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentSaving(true);
    setPaymentError('');
    setPaymentSuccess('');

    if (paymentSettings.isAdvancePaymentRequired) {
      if (!paymentSettings.advancePaymentType) {
        setPaymentError('Advance payment type is required.');
        setPaymentSaving(false);
        return;
      }
      const val = parseFloat(paymentSettings.advancePaymentValue);
      if (isNaN(val) || val <= 0) {
        setPaymentError('Advance payment value must be greater than 0.');
        setPaymentSaving(false);
        return;
      }
      if (paymentSettings.advancePaymentType === 'Percentage' && (val < 1 || val > 100)) {
        setPaymentError('Advance payment percentage must be between 1% and 100%.');
        setPaymentSaving(false);
        return;
      }
    }

    try {
      const payload = {
        upiId: paymentSettings.upiId?.trim() || null,
        qrCodeImageUrl: paymentSettings.qrCodeImageUrl?.trim() || null,
        isAdvancePaymentRequired: paymentSettings.isAdvancePaymentRequired,
        advancePaymentType: paymentSettings.isAdvancePaymentRequired ? paymentSettings.advancePaymentType : null,
        advancePaymentValue: paymentSettings.isAdvancePaymentRequired && paymentSettings.advancePaymentValue !== '' 
          ? parseFloat(paymentSettings.advancePaymentValue) 
          : null
      };

      const res = await paymentService.updatePaymentSettings(payload);
      setPaymentSuccess('Payment & advance deposit settings saved successfully!');
      setPaymentSettings(prev => ({
        ...prev,
        upiId: res.upiId || '',
        qrCodeImageUrl: res.qrCodeImageUrl || '',
        isAdvancePaymentRequired: !!res.isAdvancePaymentRequired,
        advancePaymentType: res.advancePaymentType || 'Fixed',
        advancePaymentValue: res.advancePaymentValue !== null && res.advancePaymentValue !== undefined ? res.advancePaymentValue : '',
        currencyCode: res.currencyCode || prev.currencyCode
      }));
      setTimeout(() => setPaymentSuccess(''), 4000);
    } catch (err) {
      setPaymentError(err.message || 'Failed to update payment settings.');
    } finally {
      setPaymentSaving(false);
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-border-color mb-8 gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-primary-rose text-primary-rose'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <Store className="w-4 h-4" /> Business Profile & Location
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`pb-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'border-primary-rose text-primary-rose'
                : 'border-transparent text-muted hover:text-deep-plum'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Payment & Advance Deposit Settings
          </button>
        </div>

        {/* Alerts for Profile or Payment tab */}
        {activeTab === 'profile' && error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {error}
          </div>
        )}
        
        {activeTab === 'profile' && success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> {success}
          </div>
        )}

        {activeTab === 'payments' && paymentError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" /> {paymentError}
          </div>
        )}
        
        {activeTab === 'payments' && paymentSuccess && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-200 flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 mr-3 shrink-0" /> {paymentSuccess}
          </div>
        )}

        {activeTab === 'profile' && (
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
                    {/* Salon Photo / Logo */}
                    <div className="col-span-2 p-4 bg-ivory/50 rounded-xl border border-border-color flex flex-col sm:flex-row items-center gap-4">
                      {profile.logoUrl && !logoError ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={getImageUrl(profile.logoUrl)} 
                            alt="Salon Logo" 
                            onError={() => setLogoError(true)}
                            className="w-20 h-20 rounded-xl object-cover border border-border-color shadow-2xs bg-white"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-soft-blush to-rose-tint border border-dusty-rose/40 flex items-center justify-center text-deep-plum font-serif text-2xl font-bold shrink-0 shadow-2xs">
                          {profile.name?.charAt(0) || <Store className="w-8 h-8 text-primary-rose/70" />}
                        </div>
                      )}
                      <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-sm font-semibold text-deep-plum">Salon or Owner Photo</h4>
                        <p className="text-xs text-muted mt-0.5">Upload a high-quality logo or studio image for your public storefront and booking page.</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                          <label className="px-3.5 py-1.5 bg-primary-rose text-white text-xs font-medium rounded-lg hover:bg-primary-rose/90 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5">
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>{profile.logoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleLogoUpload} 
                              className="hidden" 
                              disabled={uploadingLogo || saving}
                            />
                          </label>

                          {profile.logoUrl && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              disabled={uploadingLogo || saving}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-lg transition-colors border border-rose-200"
                            >
                              Remove
                            </button>
                          )}

                          {profile.logoUrl && !logoError ? (
                            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Active photo
                            </span>
                          ) : profile.logoUrl && logoError ? (
                            <span className="text-[11px] text-amber-600 flex items-center gap-1">
                              Please upload a new photo
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className="text-lg font-serif font-medium text-deep-plum flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-primary-rose" /> Contact & Location
                    </h3>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isLocating || saving}
                      className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-1.5 shadow-2xs self-start sm:self-auto disabled:opacity-60"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                          <span>Detecting GPS location...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5 text-emerald-700" />
                          <span>📍 Detect My Real Location (Auto-Fill)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {locationMessage && (
                    <div className="mb-4 p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Detected: <strong>{locationMessage}</strong></span>
                    </div>
                  )}
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
                
                {/* Header Block with Avatar / Logo */}
                <div className="h-24 bg-gradient-to-r from-soft-blush to-rose-tint flex items-end justify-between p-5 relative">
                  <div className="-mb-8">
                    {profile.logoUrl && !logoError ? (
                      <img 
                        src={getImageUrl(profile.logoUrl)} 
                        alt={profile.name || "Salon Logo"} 
                        onError={() => setLogoError(true)}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-soft-blush shadow-md flex items-center justify-center font-serif text-2xl font-bold text-deep-plum">
                        {profile.name?.charAt(0) || 'S'}
                      </div>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-primary-rose text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                    {profile.businessType || 'Salon'}
                  </span>
                </div>
                
                <div className="p-6 pt-10">
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
      )}

      {/* Payment Settings Tab */}
      {activeTab === 'payments' && (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Payment Settings Form */}
          <div className="flex-1">
            <form onSubmit={handlePaymentSubmit} className="bg-white rounded-2xl shadow-sm border border-border-color overflow-hidden">
              <div className="bg-ivory/50 px-6 py-4 border-b border-border-color flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-medium text-deep-plum text-lg">UPI & Advance Payment Configuration</h3>
                  <p className="text-xs text-muted">Set up how customers pay advance deposits when booking appointments</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-white border border-border-color rounded-full text-muted font-mono font-medium">
                  Currency: {paymentSettings.currencyCode}
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                {/* Section 1: Advance Deposit Requirement */}
                <section className="space-y-4">
                  {!paymentSettings.hasAdvanceDepositEngine ? (
                    <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-amber-950">Automated Advance Deposits & No-Show Shield</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900">Growth & Pro Feature</span>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          Your current Starter plan includes direct UPI & QR code payments. Automated advance booking deposits and no-show shields are unlocked on the Growth Studio and Pro plans.
                        </p>
                        <Link to="/admin/billing" className="text-xs text-primary-rose font-bold hover:underline inline-block pt-1">
                          Upgrade to Growth Studio →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-ivory/60 rounded-xl border border-border-color">
                      <input
                        type="checkbox"
                        id="isAdvancePaymentRequired"
                        name="isAdvancePaymentRequired"
                        checked={paymentSettings.isAdvancePaymentRequired}
                        onChange={handlePaymentChange}
                        className="mt-1 h-4 w-4 rounded border-border-color text-primary-rose focus:ring-primary-rose/50"
                      />
                      <label htmlFor="isAdvancePaymentRequired" className="text-sm cursor-pointer select-none">
                        <span className="font-semibold text-deep-plum block">Require Advance Deposit for Bookings</span>
                        <span className="text-xs text-muted leading-relaxed block mt-0.5">
                          When enabled, newly created appointments will require customers to transfer an advance deposit and submit their payment transaction reference (UTR) for verification.
                        </span>
                      </label>
                    </div>
                  )}

                  {paymentSettings.isAdvancePaymentRequired && (
                    <div className="p-5 bg-white rounded-xl border border-border-color shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Advance Deposit Calculation</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-medium text-deep-plum mb-1.5">
                            Deposit Calculation Type <span className="text-primary-rose">*</span>
                          </label>
                          <select
                            name="advancePaymentType"
                            value={paymentSettings.advancePaymentType}
                            onChange={handlePaymentChange}
                            className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                          >
                            <option value="Fixed">Fixed Amount</option>
                            <option value="Percentage">Percentage of Service Price</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-deep-plum mb-1.5">
                            {paymentSettings.advancePaymentType === 'Percentage' ? 'Percentage (1% - 100%)' : `Fixed Amount (${paymentSettings.currencyCode})`} <span className="text-primary-rose">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              name="advancePaymentValue"
                              value={paymentSettings.advancePaymentValue}
                              onChange={handlePaymentChange}
                              min={paymentSettings.advancePaymentType === 'Percentage' ? '1' : '0.01'}
                              max={paymentSettings.advancePaymentType === 'Percentage' ? '100' : '1000000'}
                              step={paymentSettings.advancePaymentType === 'Percentage' ? '1' : '0.01'}
                              placeholder={paymentSettings.advancePaymentType === 'Percentage' ? 'e.g. 20' : 'e.g. 200'}
                              className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                              {paymentSettings.advancePaymentType === 'Percentage' ? '%' : paymentSettings.currencyCode}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted flex items-center gap-1.5 bg-soft-blush/40 p-2.5 rounded-lg border border-border-color/60">
                        <Info className="w-4 h-4 text-primary-rose shrink-0" />
                        {paymentSettings.advancePaymentType === 'Percentage'
                          ? `Customers will be required to pay ${paymentSettings.advancePaymentValue || '0'}% of the service price as advance.`
                          : `Customers will be required to pay a flat ${paymentSettings.currencyCode} ${paymentSettings.advancePaymentValue || '0'} advance for each booking.`}
                      </p>
                    </div>
                  )}
                </section>

                {/* Section 2: UPI & QR Code Settings */}
                <section className="space-y-5 pt-4 border-t border-border-color">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">UPI & Payment Receiving Details</h4>

                  <div>
                    <label className="block text-xs font-medium text-deep-plum mb-1.5">
                      Salon UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      name="upiId"
                      value={paymentSettings.upiId}
                      onChange={handlePaymentChange}
                      maxLength={100}
                      placeholder="e.g. yoursalon@okaxis or 9876543210@upi"
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">Customers can tap to copy this UPI address to make instant transfers.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-deep-plum mb-1.5">
                      QR Code Image URL
                    </label>
                    <input
                      type="url"
                      name="qrCodeImageUrl"
                      value={paymentSettings.qrCodeImageUrl}
                      onChange={handlePaymentChange}
                      maxLength={500}
                      placeholder="https://example.com/images/salon-upi-qr.png"
                      className="w-full px-3.5 py-2.5 bg-white border border-border-color rounded-lg text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/30 outline-none transition-all text-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">Publicly accessible image URL for your UPI QR code scanner image.</p>
                  </div>
                </section>
              </div>

              {/* Footer Actions */}
              <div className="bg-ivory/50 px-6 sm:px-8 py-4 border-t border-border-color flex justify-between items-center">
                <button
                  type="button"
                  onClick={fetchPaymentSettings}
                  disabled={paymentSaving}
                  className="px-4 py-2 border border-border-color bg-white text-muted hover:text-deep-plum hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={paymentSaving}
                  className="px-6 py-2.5 bg-primary-rose text-white rounded-lg text-sm font-medium hover:bg-primary-rose/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {paymentSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Payment Settings
                </button>
              </div>
            </form>
          </div>

          {/* Right Preview Column: QR Code & Deposit Rules */}
          <div className="w-full lg:w-[380px] shrink-0 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-border-color p-6 text-center">
              <h4 className="text-sm font-serif font-medium text-deep-plum mb-1">Customer QR Code Preview</h4>
              <p className="text-xs text-muted mb-4">Live preview of your scanner shown to booking customers</p>

              {paymentSettings.qrCodeImageUrl && !qrImgError ? (
                <div className="p-4 bg-ivory/40 rounded-xl border border-border-color inline-block">
                  <img
                    src={paymentSettings.qrCodeImageUrl}
                    alt="Salon UPI QR Code"
                    className="w-48 h-48 object-contain mx-auto rounded-lg bg-white p-2 border border-border-color shadow-sm"
                    onError={() => setQrImgError(true)}
                  />
                  {paymentSettings.upiId && (
                    <p className="mt-3 text-xs font-mono font-medium text-deep-plum bg-white px-2.5 py-1 rounded border border-border-color truncate max-w-[200px] mx-auto">
                      {paymentSettings.upiId}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-12 px-4 bg-ivory/30 rounded-xl border border-dashed border-border-color flex flex-col items-center justify-center">
                  <QrCode className="w-12 h-12 text-muted/30 mb-2" />
                  <p className="text-xs font-medium text-deep-plum">No QR Code Configured</p>
                  <p className="text-[11px] text-muted max-w-[200px] mt-1">Provide a valid image URL to preview your scanner</p>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-border-color text-left space-y-2.5 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Advance Required:</span>
                  <span className="font-semibold text-deep-plum">
                    {paymentSettings.isAdvancePaymentRequired ? 'Yes' : 'No'}
                  </span>
                </div>
                {paymentSettings.isAdvancePaymentRequired && (
                  <div className="flex justify-between text-muted">
                    <span>Deposit Rule:</span>
                    <span className="font-semibold text-primary-rose">
                      {paymentSettings.advancePaymentType === 'Percentage'
                        ? `${paymentSettings.advancePaymentValue || 0}% of booking`
                        : `${paymentSettings.currencyCode} ${paymentSettings.advancePaymentValue || 0}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-muted">
                  <span>UPI ID:</span>
                  <span className="font-mono text-deep-plum truncate max-w-[150px]">
                    {paymentSettings.upiId || 'Not set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </DashboardLayout>
  );
}
