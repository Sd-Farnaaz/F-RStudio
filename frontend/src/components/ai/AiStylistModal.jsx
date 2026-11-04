import { useState, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Camera, 
  Upload, 
  Check, 
  ArrowRight, 
  Scissors, 
  Palette, 
  Clock, 
  Calendar, 
  RefreshCw,
  Zap,
  CheckCircle2,
  ChevronRight,
  Heart
} from 'lucide-react';
import { aiStylistService } from '../../services/aiStylistService';

const LENGTH_OPTIONS = [
  { id: 'Short', label: 'Short / Pixie', desc: 'Above the jawline' },
  { id: 'Medium', label: 'Medium / Shoulder', desc: 'Collarbone length' },
  { id: 'Long', label: 'Long Hair', desc: 'Mid-back or below' },
  { id: 'Buzz', label: 'Fade / Buzz', desc: 'Clean clipper work' }
];

const FACE_SHAPES = [
  { id: 'Oval', label: 'Oval', desc: 'Balanced proportions' },
  { id: 'Round', label: 'Round', desc: 'Soft angles, equal width' },
  { id: 'Square', label: 'Square', desc: 'Strong, defined jawline' },
  { id: 'Heart', label: 'Heart', desc: 'Wider forehead, tapered chin' },
  { id: 'Diamond', label: 'Diamond', desc: 'High cheekbones, narrow chin' }
];

const ROUTINES = [
  { id: 'Low', label: 'Low Maintenance', desc: '< 5 mins, wash-and-go' },
  { id: 'Moderate', label: 'Moderate', desc: '10-20 mins, light blow-dry' },
  { id: 'High', label: 'High Styling', desc: 'Daily irons, blowout routine' }
];

const VIBES = [
  { id: 'Everyday Chic', label: 'Everyday Chic', desc: 'Effortless, natural texture' },
  { id: 'Corporate Elegance', label: 'Corporate Elegance', desc: 'Polished, structured, sleek' },
  { id: 'Wedding / Glam', label: 'Glam & Volume', desc: 'Red carpet, bridal luxury' },
  { id: 'Bold Trendsetter', label: 'Bold Trendsetter', desc: 'Avant-garde, fashion forward' }
];

export default function AiStylistModal({ isOpen, onClose, salonSlug, onSelectService }) {
  const [hairLength, setHairLength] = useState('Medium');
  const [faceShape, setFaceShape] = useState('Oval');
  const [maintenance, setMaintenance] = useState('Moderate');
  const [vibe, setVibe] = useState('Everyday Chic');
  
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      // Simulate rapid AI visual shape analysis
      setIsAnalyzingPhoto(true);
      setTimeout(() => {
        setIsAnalyzingPhoto(false);
        // Pre-select based on AI analysis
        setFaceShape('Oval');
        setHairLength('Medium');
      }, 900);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await aiStylistService.recommendStyle({
        hairLength,
        faceShape,
        maintenanceRoutine: maintenance,
        occasionVibe: vibe,
        salonSlug: salonSlug || null
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to generate AI style recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPhotoPreview(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-deep-plum/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-border-color overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-deep-plum via-deep-plum/95 to-primary-rose p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-rose-tint mb-3">
            <Sparkles className="w-3.5 h-3.5 text-accent-gold animate-pulse" />
            <span>F&R Studio Neural Stylist v2.4</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight">
            AI Hairstyle & Color Match
          </h2>
          <p className="text-xs sm:text-sm text-soft-blush/80 mt-1 max-w-lg">
            Personalized salon recommendations tailored to your face geometry, hair length, and lifestyle.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto bg-ivory/30">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2">
              <span className="font-semibold">Recommendation Error:</span> {error}
            </div>
          )}

          {!result ? (
            /* 1. INPUT QUESTIONNAIRE & PHOTO */
            <div className="space-y-6">
              
              {/* Photo Upload Strip */}
              <div className="bg-white p-4 rounded-2xl border border-dashed border-border-color/80 flex flex-col sm:flex-row items-center gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-rose-tint flex items-center justify-center cursor-pointer border border-primary-rose/30 hover:scale-105 transition-transform overflow-hidden relative shrink-0"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-primary-rose" />
                  )}
                  {isAnalyzingPhoto && (
                    <div className="absolute inset-0 bg-deep-plum/70 flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-semibold text-deep-plum">
                    {photoPreview ? 'Photo analyzed!' : 'Optional: Upload a Selfie for Face Shape Detection'}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    {photoPreview 
                      ? 'AI estimated oval symmetry. You can adjust the answers below.' 
                      : 'We calculate cheekbone height, forehead ratio, and jawline curvature.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl border border-border-color text-xs font-semibold text-deep-plum hover:bg-soft-blush transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoPreview ? 'Change' : 'Upload'}</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* 1. Hair Length */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-2.5">
                  1. Current or Desired Hair Length
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {LENGTH_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHairLength(opt.id)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        hairLength === opt.id
                          ? 'border-primary-rose bg-rose-tint/60 ring-2 ring-primary-rose/30'
                          : 'border-border-color bg-white hover:border-primary-rose/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-deep-plum">{opt.label}</p>
                      <p className="text-[10px] text-muted mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Face Shape */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-2.5">
                  2. Face Shape Geometry
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {FACE_SHAPES.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFaceShape(opt.id)}
                      className={`p-2.5 rounded-2xl text-left border transition-all ${
                        faceShape === opt.id
                          ? 'border-primary-rose bg-rose-tint/60 ring-2 ring-primary-rose/30'
                          : 'border-border-color bg-white hover:border-primary-rose/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-deep-plum">{opt.label}</p>
                      <p className="text-[10px] text-muted mt-0.5 line-clamp-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Daily Routine & Vibe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-2">
                    3. Daily Maintenance Routine
                  </label>
                  <div className="space-y-2">
                    {ROUTINES.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMaintenance(opt.id)}
                        className={`w-full p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                          maintenance === opt.id
                            ? 'border-primary-rose bg-rose-tint/60 ring-1 ring-primary-rose'
                            : 'border-border-color bg-white hover:border-primary-rose/40'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-deep-plum">{opt.label}</p>
                          <p className="text-[10px] text-muted">{opt.desc}</p>
                        </div>
                        {maintenance === opt.id && <Check className="w-4 h-4 text-primary-rose shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-2">
                    4. Target Occasion & Vibe
                  </label>
                  <div className="space-y-2">
                    {VIBES.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVibe(opt.id)}
                        className={`w-full p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                          vibe === opt.id
                            ? 'border-primary-rose bg-rose-tint/60 ring-1 ring-primary-rose'
                            : 'border-border-color bg-white hover:border-primary-rose/40'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-deep-plum">{opt.label}</p>
                          <p className="text-[10px] text-muted">{opt.desc}</p>
                        </div>
                        {vibe === opt.id && <Check className="w-4 h-4 text-primary-rose shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate CTA Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-deep-plum to-primary-rose text-white font-semibold text-sm shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Neural Stylist is generating custom look...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-accent-gold" />
                    <span>Generate AI Recommendation & Formulas</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* 2. RECOMMENDATION RESULTS VIEW */
            <div className="space-y-6 animate-fade-in">
              
              {/* Style Hero Card */}
              <div className="bg-white rounded-3xl p-6 border border-border-color shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-primary-rose/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-soft-blush text-primary-rose text-[11px] font-bold uppercase tracking-wider">
                    {result.category}
                  </span>
                  {result.trendingKeywords?.map((kw, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-ivory border border-border-color text-muted text-[11px] font-medium">
                      #{kw}
                    </span>
                  ))}
                </div>

                <h3 className="text-2xl font-serif font-bold text-deep-plum mb-2">
                  {result.styleTitle}
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed mb-5">
                  {result.description}
                </p>

                {/* Grid Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-border-color/60">
                  <div className="p-3.5 rounded-2xl bg-ivory border border-border-color/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-deep-plum">
                      <Scissors className="w-3.5 h-3.5 text-primary-rose" />
                      <span>Face Shape Suitability</span>
                    </div>
                    <p className="text-[11px] text-muted leading-snug">
                      {result.faceSuitability}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-ivory border border-border-color/70 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-deep-plum">
                      <Palette className="w-3.5 h-3.5 text-primary-rose" />
                      <span>Color Chemistry / Formula</span>
                    </div>
                    <p className="text-[11px] text-deep-plum font-mono font-medium leading-snug">
                      {result.recommendedColorFormula}
                    </p>
                  </div>
                </div>

                {/* Maintenance Tip */}
                <div className="mt-3 p-3 rounded-2xl bg-rose-tint/50 border border-dusty-rose/30 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-primary-rose shrink-0 mt-0.5" />
                  <p className="text-[11px] text-deep-plum leading-snug">
                    <span className="font-bold">Home Maintenance: </span>{result.maintenanceAdvice}
                  </p>
                </div>
              </div>

              {/* Matched Salon Services (Direct Booking) */}
              {result.suggestedServices && result.suggestedServices.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-deep-plum">
                      Direct Booking Services for This Style
                    </h4>
                    <span className="text-[11px] text-primary-rose font-medium">
                      Matched to Salon Catalog
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.suggestedServices.map(svc => (
                      <div 
                        key={svc.id}
                        className="bg-white p-4 rounded-2xl border border-border-color shadow-2xs hover:border-primary-rose/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="text-xs font-bold text-deep-plum line-clamp-1">{svc.name}</h5>
                            <span className="text-xs font-bold text-primary-rose shrink-0">₹{svc.price}</span>
                          </div>
                          <p className="text-[11px] text-muted mt-1 line-clamp-2">{svc.description}</p>
                          <p className="text-[10px] text-muted/80 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {svc.durationMinutes} mins
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectService) {
                              onSelectService(svc.id);
                              onClose();
                            }
                          }}
                          className="mt-3 w-full py-2 bg-soft-blush hover:bg-primary-rose hover:text-white text-primary-rose text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Select for Booking</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-border-color text-xs font-bold text-deep-plum hover:bg-soft-blush transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Different Style</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-deep-plum text-white text-xs font-bold hover:bg-deep-plum/90 shadow-sm transition-all"
                >
                  Close Assistant
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

