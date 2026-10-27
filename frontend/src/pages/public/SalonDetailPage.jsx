import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import { availabilityService } from '../../services/availabilityService';
import { appointmentService, toUtcIso } from '../../services/appointmentService';
import { reviewService } from '../../services/reviewService';
import AiStylistModal from '../../components/ai/AiStylistModal';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  Info, 
  Scissors, 
  Globe, 
  CalendarDays,
  Users,
  UserCheck,
  ShoppingBag,
  Plus,
  Trash2,
  Layers,
  Star,
  MessageSquare,
  Camera,
  CornerDownRight,
  Image as ImageIcon,
  Zap,
  X 
} from 'lucide-react';

export default function SalonDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();

  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Flow State (Multi-Service Cart Supported)
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [showAiStylistModal, setShowAiStylistModal] = useState(false);
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const bookingCardRef = useRef(null);
  const reviewsSectionRef = useRef(null);

  // Verified Reviews State
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState(0); // 0 = all
  const [reviewPhotoFilter, setReviewPhotoFilter] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState(null);

  const scrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize today's date
  useEffect(() => {
    fetchData();
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
  }, [slug]);

  // Fetch reviews whenever slug, page, or filters change
  useEffect(() => {
    if (slug) {
      fetchReviews(reviewPage, reviewRatingFilter, reviewPhotoFilter);
    }
  }, [slug, reviewPage, reviewRatingFilter, reviewPhotoFilter]);

  const fetchReviews = async (page = 1, minRating = 0, hasPhotos = false) => {
    try {
      setReviewsLoading(true);
      const params = { page, pageSize: 6 };
      if (minRating > 0) params.minRating = minRating;
      if (hasPhotos) params.hasPhotos = true;
      const data = await reviewService.getSalonReviews(slug, params);
      setReviewSummary(data);
    } catch (err) {
      console.warn('Failed to load reviews for salon', err);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Fetch live availability whenever selected services, date, or staff changes
  useEffect(() => {
    if (selectedServiceIds.length > 0 && selectedDate) {
      setSelectedTime('');
      setBookingError('');
      fetchAvailability(selectedStaffId, selectedServiceIds);
    } else {
      setAvailability(null);
    }
  }, [selectedServiceIds, selectedDate, selectedStaffId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const salonData = await publicService.getSalonBySlug(slug);
      setSalon(salonData);
      
      try {
        const servicesData = await publicService.getSalonServices(slug);
        const list = servicesData.items || (Array.isArray(servicesData) ? servicesData : []);
        setServices(list);
      } catch (svcErr) {
        console.warn('Failed to load services for salon', svcErr);
        setServices([]);
      }

      try {
        const staffData = await publicService.getSalonStaff(slug);
        const list = Array.isArray(staffData) ? staffData : (staffData?.items || []);
        setStaffMembers(list);
      } catch (stfErr) {
        console.warn('Failed to load staff for salon', stfErr);
        setStaffMembers([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load salon details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (overrideStaffId = undefined, overrideServiceIds = undefined) => {
    try {
      setLoadingAvailability(true);
      setAvailabilityError('');
      const activeStaffId = overrideStaffId !== undefined ? overrideStaffId : selectedStaffId;
      const activeServiceIds = overrideServiceIds !== undefined ? overrideServiceIds : selectedServiceIds;

      if (!activeServiceIds || activeServiceIds.length === 0) {
        setAvailability(null);
        return;
      }

      const params = {
        serviceIds: activeServiceIds.join(','),
        date: selectedDate
      };
      if (activeStaffId) {
        params.staffId = activeStaffId;
      }
      const data = await availabilityService.getAvailability(slug, params);
      setAvailability(data);
    } catch (err) {
      setAvailabilityError(err.message || 'Failed to load availability for this package');
      setAvailability(null);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = Number(amount || 0);
    const code = salon?.currencyCode || 'INR';
    try {
      return num.toLocaleString('en-US', {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 2,
      });
    } catch {
      return `${code} ${num.toFixed(2)}`;
    }
  };

  // Quick 7-day selector dates
  const nextDays = useMemo(() => {
    const days = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const weekday = isToday ? 'Today' : isTomorrow ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      days.push({ dateStr, weekday, dayNum, month });
    }
    return days;
  }, []);

  // Filter categories
  const categories = useMemo(() => {
    const cats = new Set();
    services.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return ['All', ...Array.from(cats)];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (selectedCategory === 'All') return services;
    return services.filter(s => s.category?.toLowerCase() === selectedCategory.toLowerCase());
  }, [services, selectedCategory]);

  const selectedServices = useMemo(() => {
    return services.filter(s => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  const selectedService = selectedServices[0] || null;

  const totalCartPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }, [selectedServices]);

  const totalCartDuration = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + Number(s.durationMinutes || 0), 0);
  }, [selectedServices]);

  const handleToggleService = (serviceId) => {
    const id = parseInt(serviceId, 10);
    setSelectedServiceIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleRemoveService = (serviceId) => {
    const id = parseInt(serviceId, 10);
    setSelectedServiceIds(prev => prev.filter(x => x !== id));
  };

  // Selected Slot details
  const selectedSlot = useMemo(() => {
    if (!availability?.slots || !selectedTime) return null;
    return availability.slots.find(slot => slot.startTime === selectedTime);
  }, [availability, selectedTime]);

  // Group slots into Morning, Afternoon, Evening
  const groupedSlots = useMemo(() => {
    if (!availability?.slots) return { morning: [], afternoon: [], evening: [] };
    const groups = { morning: [], afternoon: [], evening: [] };
    availability.slots.forEach(slot => {
      const hour = parseInt(slot.startTime.split(':')[0], 10);
      if (hour < 12) groups.morning.push(slot);
      else if (hour < 17) groups.afternoon.push(slot);
      else groups.evening.push(slot);
    });
    return groups;
  }, [availability]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffMembers.find(s => s.id.toString() === selectedStaffId.toString());
  }, [staffMembers, selectedStaffId]);

  const scrollToBooking = (serviceId = null, staffId = null) => {
    if (serviceId) {
      const id = parseInt(serviceId, 10);
      setSelectedServiceIds(prev => prev.includes(id) ? prev : [...prev, id]);
    }
    if (staffId) {
      setSelectedStaffId(staffId.toString());
    }
    if (bookingCardRef.current) {
      const yOffset = -90;
      const element = bookingCardRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (selectedServiceIds.length === 0) {
      setBookingError('Please select at least one treatment for your booking package.');
      return;
    }
    
    setBookingLoading(true);
    setBookingError('');
    
    try {
      const tz = availability?.timeZone || salon?.timeZone || 'UTC';
      const startAtUtc = toUtcIso(selectedDate, selectedTime, tz);

      const primaryId = selectedServiceIds[0];
      const additionalIds = selectedServiceIds.slice(1);

      const payload = {
        salonId: salon.id,
        serviceId: primaryId,
        additionalServiceIds: additionalIds.length > 0 ? additionalIds : null,
        startAtUtc,
        customerNotes: customerNotes.trim() || null,
        staffId: selectedStaffId ? parseInt(selectedStaffId, 10) : null
      };

      const response = await appointmentService.createAppointment(payload);
      setBookingSuccess(response);
      fetchAvailability(selectedStaffId, selectedServiceIds); // Refresh remaining slots
    } catch (err) {
      if (err.status === 409) {
        setBookingError('This time slot is no longer available. Please select another time.');
        fetchAvailability(selectedStaffId, selectedServiceIds);
      } else {
        setBookingError(err.message || 'Failed to confirm booking. Please try again.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Reset booking form
  const handleResetBooking = () => {
    setBookingSuccess(null);
    setSelectedTime('');
    setSelectedStaffId('');
    setSelectedServiceIds([]);
    setCustomerNotes('');
    setBookingError('');
  };

  // Loading Skeleton
  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
          {/* Hero Skeleton */}
          <div className="h-64 sm:h-72 bg-soft-blush rounded-3xl border border-border-color" />
          {/* Main Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="h-8 bg-white rounded-lg w-1/3" />
              <div className="h-28 bg-white rounded-2xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-44 bg-white rounded-2xl border border-border-color" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="h-96 bg-white rounded-3xl border border-border-color" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Error / Not Found State
  if (error || !salon) {
    const isRecoverable = error && !error.toLowerCase().includes('not found');
    return (
      <PublicLayout>
        <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-soft-blush flex items-center justify-center text-primary-rose mb-5 shadow-xs">
            <AlertCircle className="w-8 h-8 opacity-75" />
          </div>
          <h1 className="text-3xl font-serif font-medium text-deep-plum mb-3">
            {isRecoverable ? 'Failed to Load Salon Profile' : 'Salon Not Found'}
          </h1>
          <p className="text-muted max-w-md text-sm mb-8 leading-relaxed">
            {error || "The salon you're looking for doesn't exist or is temporarily unavailable."}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {isRecoverable && (
              <button 
                onClick={fetchData} 
                className="px-6 py-2.5 bg-white border border-border-color text-deep-plum text-sm font-medium rounded-xl shadow-xs hover:bg-soft-blush transition-colors"
              >
                Try Again
              </button>
            )}
            <Link 
              to="/salons" 
              className="px-6 py-2.5 bg-primary-rose text-white text-sm font-medium rounded-xl shadow-xs hover:bg-primary-rose/90 transition-colors"
            >
              Browse All Salons
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const salonLocation = [salon.addressLine, salon.city, salon.state, salon.country].filter(Boolean).join(', ');
  const todayDateStr = new Date().toISOString().split('T')[0];

  return (
    <PublicLayout>
      <div className="bg-ivory min-h-screen pb-20">
        
        {/* ========================================================================= */}
        {/* 1. HERO SECTION                                                          */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-b from-rose-tint/50 via-soft-blush/30 to-ivory border-b border-border-color/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pb-14">
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-xs text-muted mb-6">
              <Link to="/" className="hover:text-primary-rose transition-colors">Home</Link>
              <span className="text-muted/50">/</span>
              <Link to="/salons" className="hover:text-primary-rose transition-colors">Salons</Link>
              <span className="text-muted/50">/</span>
              <span className="text-deep-plum font-medium truncate max-w-[200px] sm:max-w-none">{salon.name}</span>
            </nav>

            {/* Salon Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-border-color shadow-sm relative overflow-hidden">
              {/* Subtle decorative background accent */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-rose-tint/40 to-transparent rounded-bl-full pointer-events-none -mr-16 -mt-16" />

              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                
                {/* Salon Info Left */}
                <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 max-w-3xl">
                  {/* Salon Logo or Monogram */}
                  <div className="shrink-0">
                    {salon.logoUrl ? (
                      <img 
                        src={salon.logoUrl} 
                        alt={salon.name} 
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-soft-blush shadow-xs bg-white"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-soft-blush to-rose-tint border border-dusty-rose/30 flex items-center justify-center shadow-xs">
                        <span className="font-serif text-3xl sm:text-4xl font-bold text-deep-plum">
                          {salon.name?.charAt(0) || 'S'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Salon Details */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {salon.businessType && (
                        <span className="px-3 py-0.5 bg-soft-blush text-primary-rose border border-dusty-rose/40 text-[11px] font-semibold tracking-wider uppercase rounded-full">
                          {salon.businessType}
                        </span>
                      )}
                      {reviewSummary && reviewSummary.totalReviews > 0 ? (
                        <button
                          type="button"
                          onClick={scrollToReviews}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-[11px] font-semibold rounded-full transition-colors cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{reviewSummary.averageRating.toFixed(1)}</span>
                          <span className="text-amber-700/70 font-normal">
                            ({reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? 'review' : 'reviews'})
                          </span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-ivory text-muted border border-border-color text-[11px] font-medium rounded-full">
                          <Star className="w-3.5 h-3.5 text-muted/60" />
                          <span>New on SalonBook</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-medium rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified Partner
                      </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-deep-plum tracking-tight">
                      {salon.name}
                    </h1>

                    {/* Address & Meta */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted">
                      {salonLocation && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-primary-rose shrink-0" />
                          <span>{salonLocation}</span>
                        </div>
                      )}
                      {salon.timeZone && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>{salon.timeZone}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      {salon.phoneNumber && (
                        <a 
                          href={`tel:${salon.phoneNumber}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-ivory hover:bg-soft-blush border border-border-color rounded-lg text-deep-plum transition-colors"
                        >
                          <Phone className="w-3 h-3 text-primary-rose" />
                          <span>{salon.phoneNumber}</span>
                        </a>
                      )}
                      {salon.contactEmail && (
                        <a 
                          href={`mailto:${salon.contactEmail}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-ivory hover:bg-soft-blush border border-border-color rounded-lg text-deep-plum transition-colors"
                        >
                          <Mail className="w-3 h-3 text-primary-rose" />
                          <span>{salon.contactEmail}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Right: Booking Trigger CTA */}
                <div className="lg:text-right shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    onClick={() => scrollToBooking()}
                    className="px-8 py-3.5 bg-primary-rose text-white text-sm font-medium rounded-xl shadow-sm hover:bg-primary-rose/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
                  >
                    <Calendar className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Book an Appointment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAiStylistModal(true)}
                    className="px-6 py-2.5 bg-gradient-to-r from-deep-plum to-primary-rose text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent-gold transition-transform group-hover:rotate-12" />
                    <span>AI Style & Color Match</span>
                  </button>

                  <div className="flex items-center justify-start lg:justify-end gap-2 text-xs text-muted">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>{services.length} services available for instant booking</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN WORKSPACE (2-COLUMN RESPONSIVE LAYOUT)                           */}
        {/* ========================================================================= */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* --------------------------------------------------------------------- */}
            {/* LEFT COLUMN: About & Service Menu                                     */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-10">
              
              {/* About Salon */}
              {salon.description && (
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary-rose" />
                    <h2 className="text-xl sm:text-2xl font-serif font-medium text-deep-plum">
                      About {salon.name}
                    </h2>
                  </div>
                  <p className="text-muted leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                    {salon.description}
                  </p>

                  {/* Highlights Bar */}
                  <div className="mt-6 pt-6 border-t border-border-color/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                      <span>Certified Specialists</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                      <span>Instant Confirmation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-rose shrink-0" />
                      <span>Advance Protection</span>
                    </div>
                  </div>
                </section>
              )}

              {/* Service Menu */}
              <section id="services-menu" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-medium text-deep-plum">
                      Service Menu
                    </h2>
                    <p className="text-xs sm:text-sm text-muted mt-1">
                      Select any treatment below to view real-time available time slots.
                    </p>
                  </div>

                  <span className="text-xs text-muted self-start sm:self-auto bg-white px-3 py-1.5 rounded-full border border-border-color">
                    {filteredServices.length} {filteredServices.length === 1 ? 'treatment' : 'treatments'}
                  </span>
                </div>

                {/* Category Filter Tabs */}
                {categories.length > 2 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                          selectedCategory.toLowerCase() === cat.toLowerCase()
                            ? 'bg-deep-plum text-white shadow-xs'
                            : 'bg-white text-muted hover:text-deep-plum border border-border-color hover:border-dusty-rose'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Service Cards Grid */}
                {filteredServices.length === 0 ? (
                  <div className="bg-white border border-border-color rounded-2xl p-10 text-center">
                    <Scissors className="w-10 h-10 text-dusty-rose mx-auto mb-3 opacity-60" />
                    <p className="font-serif text-lg text-deep-plum mb-1">No services found</p>
                    <p className="text-xs text-muted max-w-sm mx-auto mb-4">
                      {selectedCategory !== 'All' 
                        ? `No services currently listed under "${selectedCategory}".` 
                        : "This salon has not published their service catalog yet."}
                    </p>
                    {selectedCategory !== 'All' && (
                      <button
                        onClick={() => setSelectedCategory('All')}
                        className="text-xs text-primary-rose font-medium hover:underline"
                      >
                        View all services
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredServices.map(service => {
                      const isSelected = selectedServiceIds.includes(service.id);

                      return (
                        <div
                          key={service.id}
                          onClick={() => handleToggleService(service.id)}
                          className={`group rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-soft-blush/40 border-primary-rose ring-2 ring-primary-rose/20 shadow-sm'
                              : 'bg-white border-border-color hover:border-dusty-rose hover:shadow-md'
                          }`}
                        >
                          <div>
                            {/* Service Optional Image */}
                            {service.imageUrl && (
                              <div className="mb-3.5 rounded-xl overflow-hidden aspect-[16/9] bg-soft-blush border border-border-color/50">
                                <img 
                                  src={service.imageUrl} 
                                  alt={service.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}

                            {/* Category Badge & Duration */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              {service.category && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted bg-ivory px-2 py-0.5 rounded-md border border-border-color/60">
                                  {service.category}
                                </span>
                              )}
                              <div className="flex items-center text-xs text-muted ml-auto">
                                <Clock className="w-3.5 h-3.5 mr-1 text-primary-rose shrink-0" />
                                <span>{service.durationMinutes} mins</span>
                              </div>
                            </div>

                            {/* Title */}
                            <h3 className={`font-serif text-lg font-medium transition-colors ${
                              isSelected ? 'text-primary-rose' : 'text-deep-plum group-hover:text-primary-rose'
                            }`}>
                              {service.name}
                            </h3>

                            {/* Description */}
                            {service.description && (
                              <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                                {service.description}
                              </p>
                            )}
                          </div>

                          {/* Price & Action */}
                          <div className="mt-5 pt-4 border-t border-border-color/60 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] text-muted block">Price</span>
                              <span className="font-serif font-bold text-lg text-deep-plum">
                                {formatCurrency(service.price)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleService(service.id);
                              }}
                              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-primary-rose text-white shadow-xs hover:bg-primary-rose/90'
                                  : 'bg-ivory group-hover:bg-soft-blush text-deep-plum border border-border-color hover:border-primary-rose'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>In Package</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5 text-primary-rose" />
                                  <span>Add to Visit</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ========================================================================= */}
              {/* SPECIALISTS / TEAM SHOWCASE SECTION                                       */}
              {/* ========================================================================= */}
              {staffMembers.length > 0 && (
                <section className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-primary-rose" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Our Team
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif font-medium text-deep-plum">
                        Meet Our Specialists
                      </h2>
                    </div>
                    <span className="text-xs text-muted">
                      {staffMembers.length} {staffMembers.length === 1 ? 'Expert Stylist' : 'Expert Stylists'} Available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {staffMembers.map((staff) => {
                      const isPicked = selectedStaffId.toString() === staff.id.toString();
                      const initials = (staff.fullName || 'ST')
                        .split(' ')
                        .filter(Boolean)
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <div
                          key={staff.id}
                          className={`rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                            isPicked
                              ? 'bg-soft-blush/40 border-primary-rose ring-2 ring-primary-rose/20 shadow-xs'
                              : 'bg-ivory/40 hover:bg-white border-border-color hover:border-dusty-rose hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-start gap-3.5 mb-3">
                              {/* Avatar Monogram */}
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-soft-blush to-rose-tint border border-dusty-rose/40 flex items-center justify-center shrink-0 text-deep-plum font-serif font-bold text-base shadow-xs">
                                {initials || 'ST'}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h4 className="font-serif font-medium text-deep-plum text-sm truncate">
                                  {staff.fullName}
                                </h4>
                                <p className="text-[11px] text-muted truncate mt-0.5">
                                  {staff.title || 'Stylist & Specialist'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span className="text-[10px] text-emerald-700 font-medium">Accepting Bookings</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => scrollToBooking(null, staff.id)}
                            className={`w-full mt-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                              isPicked
                                ? 'bg-primary-rose text-white shadow-xs'
                                : 'bg-white hover:bg-soft-blush text-deep-plum border border-border-color hover:border-primary-rose'
                            }`}
                          >
                            {isPicked ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Selected Specialist</span>
                              </>
                            ) : (
                              <>
                                <span>Book with {(staff.fullName || 'Stylist').split(' ')[0]}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* --------------------------------------------------------------------- */}
              {/* SECTION: VERIFIED CLIENT REVIEWS & RATINGS                            */}
              {/* --------------------------------------------------------------------- */}
              <section ref={reviewsSectionRef} className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-color pb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-primary-rose" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Client Feedback
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-medium text-deep-plum">
                      Verified Customer Reviews
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-soft-blush rounded-full text-xs font-medium text-deep-plum">
                      <ShieldCheck className="w-4 h-4 text-primary-rose" />
                      <span>100% Verified Appointments</span>
                    </div>
                  </div>
                </div>

                {/* Overall Score Card + Rating Breakdown Bars */}
                {reviewSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-ivory/50 rounded-2xl p-6 border border-border-color">
                    
                    {/* Left: Overall Big Score */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border-color/80 space-y-2">
                      <div className="font-serif text-5xl font-bold text-deep-plum tracking-tight">
                        {reviewSummary.averageRating.toFixed(1)}
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(reviewSummary.averageRating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted">
                        Based on <strong>{reviewSummary.totalReviews}</strong> {reviewSummary.totalReviews === 1 ? 'verified review' : 'verified reviews'}
                      </p>

                      {/* Detailed attribute pills */}
                      {(reviewSummary.averageCleanliness || reviewSummary.averageStaff || reviewSummary.averageValue) && (
                        <div className="pt-3 w-full space-y-1.5 text-[11px] text-muted">
                          {reviewSummary.averageCleanliness && (
                            <div className="flex justify-between">
                              <span>Cleanliness</span>
                              <span className="font-semibold text-deep-plum">{reviewSummary.averageCleanliness.toFixed(1)} / 5</span>
                            </div>
                          )}
                          {reviewSummary.averageStaff && (
                            <div className="flex justify-between">
                              <span>Specialist Skill</span>
                              <span className="font-semibold text-deep-plum">{reviewSummary.averageStaff.toFixed(1)} / 5</span>
                            </div>
                          )}
                          {reviewSummary.averageValue && (
                            <div className="flex justify-between">
                              <span>Value for Money</span>
                              <span className="font-semibold text-deep-plum">{reviewSummary.averageValue.toFixed(1)} / 5</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Star Distribution Bars */}
                    <div className="md:col-span-8 flex flex-col justify-center space-y-2.5">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = reviewSummary.ratingBreakdown?.[stars] || 0;
                        const pct = reviewSummary.totalReviews > 0 ? (count / reviewSummary.totalReviews) * 100 : 0;

                        return (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => {
                              setReviewRatingFilter(reviewRatingFilter === stars ? 0 : stars);
                              setReviewPage(1);
                            }}
                            className={`flex items-center gap-3 group text-left w-full hover:opacity-90 transition-opacity cursor-pointer ${
                              reviewRatingFilter === stars ? 'font-bold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1 w-16 text-xs text-deep-plum shrink-0">
                              <span>{stars}</span>
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            </div>

                            <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden border border-border-color/60">
                              <div
                                className="h-full bg-primary-rose rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <span className="text-xs text-muted w-10 text-right shrink-0">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setReviewRatingFilter(0); setReviewPhotoFilter(false); setReviewPage(1); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      reviewRatingFilter === 0 && !reviewPhotoFilter
                        ? 'bg-deep-plum text-white shadow-xs'
                        : 'bg-ivory hover:bg-soft-blush text-muted hover:text-deep-plum border border-border-color'
                    }`}
                  >
                    All Reviews ({reviewSummary?.totalReviews || 0})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setReviewRatingFilter(5); setReviewPage(1); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                      reviewRatingFilter === 5
                        ? 'bg-deep-plum text-white shadow-xs'
                        : 'bg-ivory hover:bg-soft-blush text-muted hover:text-deep-plum border border-border-color'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>5 Stars ({reviewSummary?.ratingBreakdown?.[5] || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setReviewPhotoFilter(!reviewPhotoFilter); setReviewPage(1); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      reviewPhotoFilter
                        ? 'bg-primary-rose text-white shadow-xs'
                        : 'bg-ivory hover:bg-soft-blush text-muted hover:text-deep-plum border border-border-color'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>With Photos</span>
                  </button>

                  {(reviewRatingFilter > 0 || reviewPhotoFilter) && (
                    <button
                      type="button"
                      onClick={() => { setReviewRatingFilter(0); setReviewPhotoFilter(false); setReviewPage(1); }}
                      className="text-xs text-primary-rose hover:underline ml-auto cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Reviews List */}
                {reviewsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
                    <div className="w-6 h-6 border-2 border-primary-rose border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Loading client reviews...</span>
                  </div>
                ) : !reviewSummary?.reviews?.items || reviewSummary.reviews.items.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-ivory/40 rounded-2xl border border-dashed border-border-color space-y-3">
                    <MessageSquare className="w-8 h-8 text-dusty-rose mx-auto opacity-70" />
                    <div className="space-y-1">
                      <h4 className="font-serif font-medium text-deep-plum text-base">
                        {reviewRatingFilter > 0 || reviewPhotoFilter ? 'No reviews match your filters' : 'No reviews yet'}
                      </h4>
                      <p className="text-xs text-muted max-w-sm mx-auto">
                        {reviewRatingFilter > 0 || reviewPhotoFilter
                          ? 'Try clearing the selected star or photo filters to see all reviews.'
                          : 'Book an appointment at this salon and be the first verified customer to share your experience!'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviewSummary.reviews.items.map((rev) => {
                      const initials = (rev.customerName || 'Client')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      const formattedDate = new Date(rev.createdAtUtc).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });

                      return (
                        <div
                          key={rev.id}
                          className="p-5 rounded-2xl border border-border-color/80 bg-white hover:border-dusty-rose transition-all space-y-3"
                        >
                          {/* Header: Customer, verified badge, rating, date */}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-soft-blush border border-dusty-rose/40 flex items-center justify-center font-serif font-bold text-xs text-deep-plum shrink-0">
                                {initials || 'C'}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-deep-plum text-sm">
                                    {rev.customerName}
                                  </span>
                                  {rev.isVerifiedVisit && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-medium">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      Verified Visit
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                                  <div className="flex items-center text-amber-500">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3.5 h-3.5 ${
                                          star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span>•</span>
                                  <span>{formattedDate}</span>
                                </div>
                              </div>
                            </div>

                            {/* Service & Specialist Pills */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              {rev.serviceName && (
                                <span className="px-2.5 py-0.5 bg-ivory text-deep-plum border border-border-color rounded-lg font-medium">
                                  {rev.serviceName}
                                </span>
                              )}
                              {rev.staffName && (
                                <span className="px-2.5 py-0.5 bg-soft-blush/60 text-primary-rose border border-dusty-rose/30 rounded-lg font-medium">
                                  Styled by {rev.staffName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Review Title & Comment */}
                          <div className="space-y-1 pl-0 sm:pl-13">
                            {rev.title && (
                              <h4 className="font-serif font-medium text-deep-plum text-sm">
                                {rev.title}
                              </h4>
                            )}
                            <p className="text-xs text-muted leading-relaxed whitespace-pre-line">
                              {rev.comment}
                            </p>
                          </div>

                          {/* Client Uploaded Photos Gallery */}
                          {rev.photoUrls && rev.photoUrls.length > 0 && (
                            <div className="pl-0 sm:pl-13 pt-1">
                              <div className="flex flex-wrap gap-2">
                                {rev.photoUrls.map((url, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedLightboxPhoto(url)}
                                    className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border-color hover:border-primary-rose focus:ring-2 focus:ring-primary-rose/40 transition-all shadow-2xs cursor-pointer"
                                  >
                                    <img
                                      src={url}
                                      alt="Client review photo"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <ImageIcon className="w-4 h-4" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Salon Owner Response */}
                          {rev.ownerReply && (
                            <div className="sm:ml-13 mt-3 p-3.5 bg-soft-blush/35 rounded-xl border border-dusty-rose/25 text-xs space-y-1.5">
                              <div className="flex items-center gap-1.5 text-deep-plum font-semibold">
                                <CornerDownRight className="w-3.5 h-3.5 text-primary-rose shrink-0" />
                                <span>Response from the Owner</span>
                                {rev.ownerRepliedAtUtc && (
                                  <span className="text-[10px] text-muted font-normal ml-auto">
                                    {new Date(rev.ownerRepliedAtUtc).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-muted leading-relaxed pl-5 whitespace-pre-line">
                                {rev.ownerReply}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Pagination controls */}
                    {reviewSummary.reviews.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border-color text-xs">
                        <button
                          type="button"
                          disabled={reviewPage <= 1}
                          onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1.5 border border-border-color rounded-xl hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="text-muted">
                          Page {reviewPage} of {reviewSummary.reviews.totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={reviewPage >= reviewSummary.reviews.totalPages}
                          onClick={() => setReviewPage((p) => p + 1)}
                          className="px-3 py-1.5 border border-border-color rounded-xl hover:bg-ivory disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

            </div>

            {/* --------------------------------------------------------------------- */}
            {/* RIGHT COLUMN: Sticky Booking Panel                                    */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-5 xl:col-span-4" ref={bookingCardRef}>
              <div className="bg-white rounded-3xl border border-border-color shadow-sm overflow-hidden lg:sticky lg:top-24">
                
                {/* Booking Header */}
                <div className="bg-deep-plum text-white p-5 sm:p-6 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-dusty-rose block mb-0.5">
                        Appointment Scheduling
                      </span>
                      <h3 className="font-serif text-xl font-medium">Book Your Visit</h3>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  
                  {/* SUCCESS VIEW */}
                  {bookingSuccess ? (
                    <div className="text-center py-4 space-y-4 animate-in fade-in">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-serif text-xl font-medium text-deep-plum">
                          Appointment Confirmed!
                        </h4>
                        <p className="text-xs text-muted max-w-xs mx-auto">
                          Your appointment for <strong className="text-deep-plum">{bookingSuccess.serviceName}</strong> has been registered.
                        </p>
                        {bookingSuccess.staffName && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-soft-blush rounded-full text-xs text-deep-plum font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-primary-rose" />
                            <span>Specialist: <strong>{bookingSuccess.staffName}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Advance Payment Card */}
                      {bookingSuccess.advanceAmountRequired > 0 && (
                        <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-left space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold">
                            <Info className="w-4 h-4 shrink-0" />
                            <span>Advance Deposit Required</span>
                          </div>
                          <p className="text-xs text-amber-900/90 leading-relaxed">
                            A deposit of <strong>{formatCurrency(bookingSuccess.advanceAmountRequired)}</strong> is required to lock in this appointment.
                          </p>
                          <p className="text-[11px] text-muted">
                            Visit My Bookings to view the salon UPI QR code and submit your payment transaction reference.
                          </p>
                        </div>
                      )}

                      <div className="pt-2 flex flex-col gap-2">
                        <Link
                          to="/my-bookings?tab=appointments"
                          className="w-full py-3 bg-primary-rose text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-primary-rose/90 transition-all text-center"
                        >
                          View in My Bookings →
                        </Link>
                        <button
                          type="button"
                          onClick={handleResetBooking}
                          className="w-full py-2.5 text-xs text-muted hover:text-deep-plum font-medium transition-colors"
                        >
                          Book another appointment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* STEP 1: MULTI-SERVICE TREATMENT CART */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShoppingBag className="w-4 h-4 text-primary-rose" />
                            <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum">
                              1. Treatment Package {selectedServices.length > 0 && `(${selectedServices.length})`}
                            </label>
                          </div>
                          {selectedServices.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedServiceIds([])}
                              className="text-[11px] text-primary-rose hover:underline font-medium"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        {selectedServices.length > 0 ? (
                          <div className="space-y-2">
                            {/* Selected Services Itemized List */}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                              {selectedServices.map(service => (
                                <div
                                  key={service.id}
                                  className="p-2.5 bg-soft-blush/40 border border-border-color rounded-xl flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-deep-plum truncate">
                                      {service.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                                      <span>{service.durationMinutes} mins</span>
                                      <span>•</span>
                                      <span className="font-medium text-deep-plum">{formatCurrency(service.price)}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveService(service.id)}
                                    title="Remove treatment"
                                    className="p-1 text-muted hover:text-rose-600 rounded-lg transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Combo Package Metrics Box */}
                            <div className="p-2.5 bg-ivory rounded-xl border border-border-color flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-deep-plum font-medium">
                                <Clock className="w-3.5 h-3.5 text-primary-rose" />
                                <span>Total Duration: <strong>{totalCartDuration} mins</strong></span>
                              </div>
                              <div className="font-serif font-bold text-sm text-primary-rose">
                                {formatCurrency(totalCartPrice)}
                              </div>
                            </div>

                            {/* Add More Treatments Dropdown */}
                            <div className="relative pt-1">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleToggleService(e.target.value);
                                }}
                                className="w-full px-3 py-1.5 text-[11px] border border-dashed border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/40 outline-none bg-white text-muted hover:text-deep-plum"
                              >
                                <option value="">+ Add another treatment to package...</option>
                                {services.filter(s => !selectedServiceIds.includes(s.id)).map(s => (
                                  <option key={s.id} value={s.id}>
                                    + {s.name} ({s.durationMinutes}m) - {formatCurrency(s.price)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-ivory rounded-2xl border border-border-color text-center space-y-2.5">
                            <Layers className="w-6 h-6 text-dusty-rose mx-auto opacity-70" />
                            <p className="text-xs text-muted">
                              Select treatments from the salon menu to build your personalized visit package.
                            </p>
                            <div className="relative">
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) handleToggleService(e.target.value);
                                }}
                                className="w-full px-3.5 py-2.5 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/40 outline-none bg-white text-deep-plum font-medium"
                              >
                                <option value="">— Choose a treatment to begin —</option>
                                {services.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.durationMinutes}m) - {formatCurrency(s.price)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STEP 2: SPECIALIST SELECTION */}
                      {staffMembers.length > 0 && (
                        <div className="pt-2 border-t border-border-color/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum block">
                              2. Select Specialist
                            </label>
                            {selectedStaff ? (
                              <button
                                type="button"
                                onClick={() => setSelectedStaffId('')}
                                className="text-[10px] text-primary-rose hover:underline font-medium"
                              >
                                Reset to Any
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted">Optional</span>
                            )}
                          </div>

                          {/* Quick Specialist Toggle Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                            {/* Option 1: Any Available Specialist */}
                            <button
                              type="button"
                              onClick={() => setSelectedStaffId('')}
                              className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                !selectedStaffId
                                  ? 'bg-deep-plum text-white border-deep-plum shadow-xs'
                                  : 'bg-ivory hover:bg-soft-blush border-border-color text-deep-plum'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                !selectedStaffId ? 'bg-white/10 text-dusty-rose' : 'bg-white text-primary-rose border border-border-color'
                              }`}>
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-semibold truncate">Any Specialist</span>
                                  {!selectedStaffId && <Check className="w-3.5 h-3.5 shrink-0 text-dusty-rose" />}
                                </div>
                                <span className={`text-[10px] block truncate ${!selectedStaffId ? 'text-dusty-rose/80' : 'text-muted'}`}>
                                  Maximum open slots
                                </span>
                              </div>
                            </button>

                            {/* Option 2+: Specific Staff Members */}
                            {staffMembers.map(staff => {
                              const isPicked = selectedStaffId.toString() === staff.id.toString();
                              const initials = (staff.fullName || 'ST')
                                .split(' ')
                                .filter(Boolean)
                                .map(n => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                              return (
                                <button
                                  key={staff.id}
                                  type="button"
                                  onClick={() => setSelectedStaffId(staff.id.toString())}
                                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                                    isPicked
                                      ? 'bg-deep-plum text-white border-deep-plum shadow-xs'
                                      : 'bg-ivory hover:bg-soft-blush border-border-color text-deep-plum'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-serif font-bold text-xs ${
                                    isPicked
                                      ? 'bg-white/10 text-dusty-rose'
                                      : 'bg-gradient-to-br from-soft-blush to-rose-tint text-deep-plum border border-dusty-rose/30'
                                  }`}>
                                    {initials}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-xs font-semibold truncate">{staff.fullName}</span>
                                      {isPicked && <Check className="w-3.5 h-3.5 shrink-0 text-dusty-rose" />}
                                    </div>
                                    <span className={`text-[10px] block truncate ${isPicked ? 'text-dusty-rose/80' : 'text-muted'}`}>
                                      {staff.title || 'Stylist'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* STEP 3: DATE SELECTION */}
                      <div className="space-y-2 pt-2 border-t border-border-color/80">
                        <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum block">
                          {staffMembers.length > 0 ? '3. Select Date' : '2. Select Date'}
                        </label>

                        {/* Quick 7-Day Date Bar */}
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                          {nextDays.map(item => {
                            const isPicked = selectedDate === item.dateStr;
                            return (
                              <button
                                key={item.dateStr}
                                type="button"
                                onClick={() => setSelectedDate(item.dateStr)}
                                className={`py-2 px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                                  isPicked
                                    ? 'bg-deep-plum text-white border-deep-plum shadow-xs'
                                    : 'bg-ivory hover:bg-soft-blush border-border-color/80 text-deep-plum'
                                }`}
                              >
                                <span className={`text-[10px] uppercase font-medium ${isPicked ? 'text-dusty-rose' : 'text-muted'}`}>
                                  {item.weekday}
                                </span>
                                <span className="text-xs font-bold mt-0.5">
                                  {item.dayNum}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Full native calendar input fallback */}
                        <div className="relative pt-1">
                          <input
                            type="date"
                            min={todayDateStr}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/40 outline-none bg-white text-deep-plum"
                          />
                        </div>
                      </div>

                      {/* STEP 4: LIVE TIME SLOTS */}
                      <div className="pt-2 border-t border-border-color/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum">
                            {staffMembers.length > 0 ? '4. Select Time' : '3. Select Time'}
                          </label>
                          {availability?.timeZone && (
                            <span className="text-[10px] text-muted italic">
                              {availability.timeZone}
                            </span>
                          )}
                        </div>

                        {/* Specialist & Package Context Pill */}
                        {selectedServiceIds.length > 0 && (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 bg-ivory rounded-xl border border-border-color text-[11px] text-deep-plum">
                            <div className="flex items-center gap-1.5 truncate">
                              {selectedStaff ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-primary-rose shrink-0" />
                                  <span className="truncate">Filtered for <strong>{selectedStaff.fullName}</strong></span>
                                </>
                              ) : (
                                <>
                                  <Users className="w-3.5 h-3.5 text-muted shrink-0" />
                                  <span className="text-muted truncate">All salon specialists</span>
                                </>
                              )}
                            </div>
                            <span className="text-[10px] text-primary-rose font-medium shrink-0">
                              Requires {totalCartDuration} min consecutive window
                            </span>
                          </div>
                        )}

                        {selectedServiceIds.length === 0 ? (
                          <div className="p-4 bg-ivory rounded-2xl border border-border-color text-center">
                            <p className="text-xs text-muted">
                              Please select at least one treatment above to reveal available appointment slots.
                            </p>
                          </div>
                        ) : loadingAvailability ? (
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <div key={i} className="h-9 bg-soft-blush/60 rounded-xl animate-pulse" />
                            ))}
                          </div>
                        ) : availabilityError ? (
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{availabilityError}</span>
                          </div>
                        ) : !availability || availability.slots.length === 0 ? (
                          <div className="p-4 bg-ivory rounded-2xl border border-border-color text-center space-y-1">
                            <Clock className="w-6 h-6 text-muted mx-auto opacity-50 mb-1" />
                            <p className="text-xs font-medium text-deep-plum">
                              No slots on {selectedDate}
                            </p>
                            <p className="text-[11px] text-muted">
                              {selectedStaff
                                ? `${selectedStaff.fullName} has no available openings on this day. Try another specialist or date.`
                                : 'The salon has no available openings on this day. Please select another date.'}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Slots Display */}
                            <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5">
                              {/* Morning */}
                              {groupedSlots.morning.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                                    Morning
                                  </span>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {groupedSlots.morning.map((slot, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedTime(slot.startTime)}
                                        className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center relative flex flex-col items-center justify-center gap-0.5 ${
                                          selectedTime === slot.startTime
                                            ? 'bg-primary-rose text-white border-primary-rose shadow-xs'
                                            : slot.hasFlashDiscount
                                            ? 'bg-amber-50/80 border-amber-300 text-deep-plum hover:border-primary-rose'
                                            : slot.isGapOptimized
                                            ? 'bg-rose-50/60 border-dusty-rose/60 text-deep-plum hover:border-primary-rose'
                                            : 'bg-white border-border-color hover:border-primary-rose hover:text-primary-rose text-deep-plum'
                                        }`}
                                        title={slot.optimizationReason || (slot.hasFlashDiscount ? `${slot.discountPercentage}% OFF Flash Discount` : undefined)}
                                      >
                                        <span className="font-semibold">{slot.startTime}</span>
                                        {slot.hasFlashDiscount ? (
                                          <span className={`text-[9px] font-bold px-1 rounded ${selectedTime === slot.startTime ? 'bg-white/20 text-white' : 'text-amber-800 bg-amber-100'}`}>
                                            ⚡ {slot.discountPercentage}%
                                          </span>
                                        ) : slot.isGapOptimized ? (
                                          <span className={`text-[9px] font-bold px-1 rounded ${selectedTime === slot.startTime ? 'bg-white/20 text-white' : 'text-primary-rose bg-soft-blush'}`}>
                                            ✨ Seamless
                                          </span>
                                        ) : null}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Afternoon */}
                              {groupedSlots.afternoon.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                                    Afternoon
                                  </span>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {groupedSlots.afternoon.map((slot, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedTime(slot.startTime)}
                                        className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center relative flex flex-col items-center justify-center gap-0.5 ${
                                          selectedTime === slot.startTime
                                            ? 'bg-primary-rose text-white border-primary-rose shadow-xs'
                                            : slot.hasFlashDiscount
                                            ? 'bg-amber-50/80 border-amber-300 text-deep-plum hover:border-primary-rose'
                                            : slot.isGapOptimized
                                            ? 'bg-rose-50/60 border-dusty-rose/60 text-deep-plum hover:border-primary-rose'
                                            : 'bg-white border-border-color hover:border-primary-rose hover:text-primary-rose text-deep-plum'
                                        }`}
                                        title={slot.optimizationReason || (slot.hasFlashDiscount ? `${slot.discountPercentage}% OFF Flash Discount` : undefined)}
                                      >
                                        <span className="font-semibold">{slot.startTime}</span>
                                        {slot.hasFlashDiscount ? (
                                          <span className={`text-[9px] font-bold px-1 rounded ${selectedTime === slot.startTime ? 'bg-white/20 text-white' : 'text-amber-800 bg-amber-100'}`}>
                                            ⚡ {slot.discountPercentage}%
                                          </span>
                                        ) : slot.isGapOptimized ? (
                                          <span className={`text-[9px] font-bold px-1 rounded ${selectedTime === slot.startTime ? 'bg-white/20 text-white' : 'text-primary-rose bg-soft-blush'}`}>
                                            ✨ Seamless
                                          </span>
                                        ) : null}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Evening */}
                              {groupedSlots.evening.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block mb-1">
                                    Evening
                                  </span>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {groupedSlots.evening.map((slot, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedTime(slot.startTime)}
                                        className={`py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center relative flex flex-col items-center justify-center gap-0.5 ${
                                          selectedTime === slot.startTime
                                            ? 'bg-primary-rose text-white border-primary-rose shadow-xs'
                                            : slot.hasFlashDiscount
                                            ? 'bg-amber-50/80 border-amber-300 text-deep-plum hover:border-primary-rose'
                                            : slot.isGapOptimized
                                            ? 'bg-rose-50/60 border-dusty-rose/60 text-deep-plum hover:border-primary-rose'
                                            : 'bg-white border-border-color hover:border-primary-rose hover:text-primary-rose text-deep-plum'
                                        }`}
                                        title={slot.optimizationReason || (slot.hasFlashDiscount ? `${slot.discountPercentage}% OFF Flash Discount` : undefined)}
                                      >
                                        <span className="font-semibold">{slot.startTime}</span>
                                        {slot.hasFlashDiscount ? (
                                          <span className={`text-[9px] font-bold px-1 rounded ${selectedTime === slot.startTime ? 'bg-white/20 text-white' : 'text-amber-800 bg-amber-100'}`}>
                                            ⚡ {slot.discountPercentage}%
                                          </span>
                                        ) : slot.isGapOptimized ? (
                                          <span className={`text-[9px] font-bold px-1 rounded ${selectedTime === slot.startTime ? 'bg-white/20 text-white' : 'text-primary-rose bg-soft-blush'}`}>
                                            ✨ Seamless
                                          </span>
                                        ) : null}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Slot-specific assigned specialist badge */}
                            {selectedTime && selectedSlot?.availableStaff && selectedSlot.availableStaff.length > 0 && !selectedStaffId && (
                              <div className="p-2.5 bg-ivory rounded-xl border border-border-color text-xs flex items-center justify-between">
                                <div className="flex items-center gap-1.5 truncate">
                                  <User className="w-3.5 h-3.5 text-primary-rose shrink-0" />
                                  <span className="text-[11px] text-muted truncate">
                                    Assigned: <strong className="text-deep-plum">{selectedSlot.availableStaff[0].fullName}</strong>
                                  </span>
                                </div>
                                {selectedSlot.availableStaff.length > 1 && (
                                  <span className="text-[10px] text-dusty-rose font-medium shrink-0 ml-2">
                                    +{selectedSlot.availableStaff.length - 1} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Flash Discount & Smart Gap Notice */}
                            {selectedTime && selectedSlot?.hasFlashDiscount && (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between animate-fade-in">
                                <div className="flex items-center gap-1.5 font-semibold">
                                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{selectedSlot.flashDiscountTitle || 'Off-Peak Flash Sale'}: {selectedSlot.discountPercentage}% OFF!</span>
                                </div>
                                <div className="text-right font-bold text-xs">
                                  <span className="text-[11px] text-muted line-through mr-1">₹{selectedSlot.originalPrice}</span>
                                  <span className="text-amber-800">₹{selectedSlot.discountedPrice}</span>
                                </div>
                              </div>
                            )}

                            {selectedTime && selectedSlot?.isGapOptimized && !selectedSlot?.hasFlashDiscount && (
                              <div className="p-2 rounded-xl bg-soft-blush/60 border border-dusty-rose/40 text-xs text-deep-plum flex items-center gap-1.5 animate-fade-in">
                                <Sparkles className="w-3.5 h-3.5 text-primary-rose shrink-0" />
                                <span className="text-[11px]"><strong>Smart Gap Choice:</strong> {selectedSlot.optimizationReason || 'Seamless scheduling prevents awkward wait times.'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* STEP 5: NOTES & CONFIRMATION */}
                      {selectedTime && (
                        <div className="pt-2 border-t border-border-color/80 space-y-4 animate-in fade-in">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum block mb-1.5">
                              {staffMembers.length > 0 ? '5. Special Notes (Optional)' : '4. Special Notes (Optional)'}
                            </label>
                            <textarea
                              rows={2}
                              maxLength={500}
                              value={customerNotes}
                              onChange={(e) => setCustomerNotes(e.target.value)}
                              placeholder="Any preferences or specific instructions for your stylist..."
                              className="w-full px-3 py-2 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/40 outline-none bg-white resize-none text-deep-plum"
                            />
                          </div>

                          {/* Order Summary Recap */}
                          <div className="p-3.5 bg-ivory rounded-2xl border border-border-color/80 space-y-2.5 text-xs">
                            <div>
                              <div className="flex justify-between text-muted mb-1.5">
                                <span className="font-medium text-deep-plum">
                                  Package Services ({selectedServices.length})
                                </span>
                                <span className="text-[11px] font-semibold text-primary-rose">
                                  {totalCartDuration} mins total
                                </span>
                              </div>
                              <div className="space-y-1 pl-1">
                                {selectedServices.map(s => (
                                  <div key={s.id} className="flex justify-between text-[11px] text-muted">
                                    <span className="truncate pr-2">• {s.name} ({s.durationMinutes}m)</span>
                                    <span className="shrink-0 font-medium text-deep-plum">{formatCurrency(s.price)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border-color/60 flex justify-between text-muted">
                              <span>Specialist</span>
                              <span className="font-medium text-deep-plum">
                                {selectedStaff ? selectedStaff.fullName : (selectedSlot?.availableStaff?.[0]?.fullName ? `${selectedSlot.availableStaff[0].fullName} (Assigned)` : 'Any Available Specialist')}
                              </span>
                            </div>
                            <div className="flex justify-between text-muted">
                              <span>Date & Time</span>
                              <span className="font-medium text-deep-plum">{selectedDate} @ {selectedTime}</span>
                            </div>
                            <div className="pt-2 border-t border-border-color/80 flex justify-between items-center text-sm">
                              <div>
                                <span className="font-medium text-deep-plum">Package Total</span>
                                {selectedSlot?.hasFlashDiscount && (
                                  <span className="block text-[10px] text-amber-700 font-bold">⚡ Flash Discount Applied</span>
                                )}
                              </div>
                              <div className="text-right">
                                {selectedSlot?.hasFlashDiscount && selectedSlot?.discountedPrice != null ? (
                                  <>
                                    <span className="text-xs text-muted line-through mr-1.5">{formatCurrency(selectedSlot.originalPrice || totalCartPrice)}</span>
                                    <span className="font-serif font-bold text-base text-primary-rose">
                                      {formatCurrency(selectedSlot.discountedPrice)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-serif font-bold text-base text-primary-rose">
                                    {formatCurrency(totalCartPrice)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Booking Error Banner */}
                          {bookingError && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{bookingError}</span>
                            </div>
                          )}

                          {/* Action Button */}
                          {!user ? (
                            <button
                              type="button"
                              onClick={handleBookAppointment}
                              className="w-full py-3.5 bg-primary-rose text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-primary-rose/90 transition-all text-center flex items-center justify-center gap-1.5"
                            >
                              <span>Sign In to Complete Booking</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleBookAppointment}
                              disabled={bookingLoading}
                              className="w-full py-3.5 bg-primary-rose text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-primary-rose/90 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {bookingLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Securing Booking...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>Confirm Appointment</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                </div>

                {/* Footer Info Box */}
                <div className="bg-ivory/60 p-4 border-t border-border-color text-xs text-muted space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-deep-plum">
                    <ShieldCheck className="w-4 h-4 text-primary-rose" />
                    <span>Safe & Verified Booking</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    No upfront fee required to choose your slot. Advance deposit details (if any) will be confirmed instantly.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Mobile Sticky Treatment Package Drawer / Bar */}
        {selectedServices.length > 0 && !bookingSuccess && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border-color p-3.5 sm:px-6 shadow-lg lg:hidden animate-in slide-in-from-bottom duration-200">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-primary-rose shrink-0" />
                  <span className="text-xs font-semibold text-deep-plum truncate">
                    {selectedServices.length} {selectedServices.length === 1 ? 'treatment' : 'treatments'} in package
                  </span>
                </div>
                <p className="text-[11px] text-muted truncate mt-0.5">
                  {totalCartDuration} mins • {formatCurrency(totalCartPrice)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => scrollToBooking()}
                className="px-4 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl shadow-xs hover:bg-primary-rose/90 shrink-0 flex items-center gap-1.5 active:scale-[0.98] transition-all"
              >
                <span>Complete Booking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Photo Lightbox Modal */}
        {selectedLightboxPhoto && (
          <div
            className="fixed inset-0 z-50 bg-deep-plum/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setSelectedLightboxPhoto(null)}
          >
            <div
              className="relative max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl p-2 border border-border-color"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedLightboxPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={selectedLightboxPhoto}
                alt="Enlarged review photo"
                className="w-full max-h-[80vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        )}

        {/* AI Stylist Recommendation Modal */}
        <AiStylistModal
          isOpen={showAiStylistModal}
          onClose={() => setShowAiStylistModal(false)}
          salonSlug={slug}
          onSelectService={(serviceId) => {
            handleToggleService(serviceId);
            scrollToBooking();
          }}
        />

      </div>
    </PublicLayout>
  );
}