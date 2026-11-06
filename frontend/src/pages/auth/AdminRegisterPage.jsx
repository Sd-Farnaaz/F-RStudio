import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { detectCurrentLocation } from '../../utils/geolocation';
import { compressImageFile } from '../../utils/imageCompressor';
import { 
  Eye, EyeOff, AlertCircle, Loader2, ArrowRight, Camera, 
  MapPin, CheckCircle2, X, UploadCloud, Compass, ChevronDown, ChevronUp 
} from 'lucide-react';

export default function AdminRegisterPage() {
  const [formData, setFormData] = useState({ 
    salonName: '', 
    businessType: 'Hair Salon', 
    fullName: '', 
    email: '', 
    password: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    timeZone: 'Asia/Kolkata',
    currencyCode: 'INR'
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoName, setPhotoName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [locationSuccess, setLocationSuccess] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddressFields, setShowAddressFields] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Photo Upload Handler (Salon Logo or Owner Photo)
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (.jpg, .png, .webp).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Photo size exceeds 10MB limit. Please choose a smaller file.');
      return;
    }

    setPhotoName(file.name);
    try {
      const { dataUrl } = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.82
      });
      setPhotoPreview(dataUrl);
      setPhotoBase64(dataUrl);
      if (error) setError('');
    } catch {
      setError('Failed to process image. Please try a different photo.');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64('');
    setPhotoName('');
  };

  // Real Location Detection using Geolocation + Reverse Geocoding
  const handleDetectLocation = async () => {
    setIsLocating(true);
    setLocationError('');
    setLocationSuccess('');

    try {
      const location = await detectCurrentLocation();
      setFormData(prev => ({
        ...prev,
        addressLine: location.addressLine || prev.addressLine,
        city: location.city || prev.city,
        state: location.state || prev.state,
        postalCode: location.postalCode || prev.postalCode,
        country: location.country || prev.country
      }));

      const locationSummary = [location.addressLine, location.city, location.state, location.postalCode]
        .filter(Boolean)
        .join(', ');

      setLocationSuccess(locationSummary || 'Coordinates detected successfully!');
      setShowAddressFields(true);
    } catch (err) {
      setLocationError(err.message || 'Unable to retrieve your current location.');
      setShowAddressFields(true); // Open fields for manual entry
    } finally {
      setIsLocating(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setIsLoading(true);
    
    try {
      const payload = {
        ...formData,
        salonName: formData.salonName.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        addressLine: formData.addressLine?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        postalCode: formData.postalCode?.trim() || null,
        country: formData.country?.trim() || 'India',
        photoBase64: photoBase64 || null
      };

      const response = await authService.adminRegister(payload);
      setFormData({
        salonName: '',
        businessType: 'Hair Salon',
        fullName: '',
        email: '',
        password: '',
        addressLine: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India'
      });
      setPhotoBase64('');
      setPhotoPreview(null);
      setPhotoName('');
      login(response);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to register your salon. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Partner with F&R Beauty Studio" 
      subtitle="Register your business to begin managing appointments, specialists, and payments."
      imageSrc="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1200&q=85"
    >
      {error && (
        <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs sm:text-sm rounded-2xl border border-rose-100 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Salon or Studio Name *
          </label>
          <input 
            type="text" 
            name="salonName"
            required
            value={formData.salonName}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
            placeholder="e.g. Bella Beauty Bar"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Primary Business Specialty *
          </label>
          <select
            name="businessType"
            required
            value={formData.businessType}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 transition-all"
          >
            <option value="Hair Salon">Hair Salon</option>
            <option value="Nail Salon">Nail Salon</option>
            <option value="Spa">Spa & Wellness</option>
            <option value="Beauty Salon">Beauty Salon</option>
            <option value="Barbershop">Barbershop</option>
            <option value="Other">Other Specialty</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Administrator Full Name *
          </label>
          <input 
            type="text" 
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
            placeholder="e.g. Elena Vance"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Salon Admin Email *
          </label>
          <input 
            type="email" 
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
            placeholder="admin@yoursalon.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Password *
          </label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 pr-10 transition-all" 
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-deep-plum focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Optional Salon or Owner Photo Upload */}
        <div className="pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-primary-rose" />
              Salon or Owner Photo <span className="text-muted font-normal lowercase">(optional)</span>
            </span>
            {photoPreview && (
              <button 
                type="button"
                onClick={handleRemovePhoto}
                className="text-[11px] text-rose-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </label>

          {photoPreview ? (
            <div className="p-3 bg-white rounded-xl border border-primary-rose/30 flex items-center gap-3 shadow-2xs">
              <img 
                src={photoPreview} 
                alt="Selected preview" 
                className="w-14 h-14 object-cover rounded-lg border border-border-color shadow-2xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-deep-plum truncate">{photoName || 'Salon photo selected'}</p>
                <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Ready to upload
                </p>
              </div>
            </div>
          ) : (
            <label className="group flex flex-col items-center justify-center p-3.5 border border-dashed border-border-color hover:border-primary-rose/60 rounded-xl bg-ivory/60 hover:bg-soft-blush/20 cursor-pointer transition-all text-center">
              <UploadCloud className="w-5 h-5 text-muted group-hover:text-primary-rose transition-colors mb-1" />
              <span className="text-xs font-medium text-deep-plum">Upload Salon Logo or Owner Photo</span>
              <span className="text-[11px] text-muted mt-0.5">JPG, PNG, WebP up to 5MB (Optional)</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoSelect} 
                className="hidden" 
                disabled={isLoading}
              />
            </label>
          )}
        </div>

        {/* Real Location Option */}
        <div className="pt-2 border-t border-border-color/60">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-rose" />
              Salon Location <span className="text-muted font-normal lowercase">(optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddressFields(!showAddressFields)}
              className="text-[11px] text-primary-rose font-medium hover:underline flex items-center gap-1"
            >
              {showAddressFields ? (
                <>Hide address details <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Manual address entry <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating || isLoading}
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-sm disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Detecting GPS location & address...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>📍 Detect My Real Location (Auto-Fill)</span>
              </>
            )}
          </button>

          {locationSuccess && (
            <div className="mt-2 p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-200 flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              <span className="truncate">Detected: <strong>{locationSuccess}</strong></span>
            </div>
          )}

          {locationError && (
            <div className="mt-2 p-2.5 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Collapsible / Expandable Location Fields */}
          {showAddressFields && (
            <div className="mt-3 p-3 bg-ivory/60 rounded-xl border border-border-color space-y-3 animate-in fade-in duration-200">
              <div>
                <label className="block text-[11px] font-medium text-deep-plum mb-1">
                  Street Address / Area
                </label>
                <input 
                  type="text" 
                  name="addressLine"
                  value={formData.addressLine}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full px-3 py-1.5 bg-white text-xs text-deep-plum border border-border-color rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-rose" 
                  placeholder="e.g. Shop 4, Link Road, Bandra West"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-deep-plum mb-1">City</label>
                  <input 
                    type="text" 
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-1.5 bg-white text-xs text-deep-plum border border-border-color rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-rose" 
                    placeholder="e.g. Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-deep-plum mb-1">Postal Code</label>
                  <input 
                    type="text" 
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full px-3 py-1.5 bg-white text-xs text-deep-plum border border-border-color rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-rose" 
                    placeholder="e.g. 400050"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-3">
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up workspace...</span>
              </>
            ) : (
              <>
                <span>Register Salon Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-border-color/80 text-center text-xs text-muted space-y-2">
        <p>
          Already registered as salon administrator?{' '}
          <Link to="/admin/login" className="text-primary-rose font-semibold hover:underline">
            Admin Sign in
          </Link>
        </p>
        <p className="pt-1">
          Looking to book an appointment?{' '}
          <Link to="/login" className="text-deep-plum font-semibold hover:text-primary-rose transition-colors">
            Client Sign In →
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
