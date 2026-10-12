import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import { availabilityService } from '../../services/availabilityService';
import { appointmentService, toUtcIso } from '../../services/appointmentService';
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
  CalendarDays 
} from 'lucide-react';

export default function SalonDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();

  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Flow State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const bookingCardRef = useRef(null);

  // Initialize today's date
  useEffect(() => {
    fetchData();
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
  }, [slug]);

  // Fetch live availability whenever service or date changes
  useEffect(() => {
    if (selectedServiceId && selectedDate) {
      setSelectedTime('');
      setSelectedStaffId('');
      setBookingError('');
      fetchAvailability();
    } else {
      setAvailability(null);
    }
  }, [selectedServiceId, selectedDate]);

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
    } catch (err) {
      setError(err.message || 'Failed to load salon details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      setLoadingAvailability(true);
      setAvailabilityError('');
      const data = await availabilityService.getAvailability(slug, {
        serviceId: selectedServiceId,
        date: selectedDate
      });
      setAvailability(data);
    } catch (err) {
      setAvailabilityError(err.message || 'Failed to load availability for this date');
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

  const selectedService = useMemo(() => {
    return services.find(s => s.id.toString() === selectedServiceId.toString());
  }, [services, selectedServiceId]);

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

  const scrollToBooking = (serviceId = null) => {
    if (serviceId) {
      setSelectedServiceId(serviceId.toString());
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
    
    setBookingLoading(true);
    setBookingError('');
    
    try {
      const tz = availability?.timeZone || salon?.timeZone || 'UTC';
      const startAtUtc = toUtcIso(selectedDate, selectedTime, tz);

      const payload = {
        salonId: salon.id,
        serviceId: parseInt(selectedServiceId, 10),
        startAtUtc,
        customerNotes: customerNotes.trim() || null,
        staffId: selectedStaffId ? parseInt(selectedStaffId, 10) : null
      };

      const response = await appointmentService.createAppointment(payload);
      setBookingSuccess(response);
      fetchAvailability(); // Refresh remaining slots
    } catch (err) {
      if (err.status === 409) {
        setBookingError('This time slot is no longer available. Please select another time.');
        fetchAvailability();
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
                      const isSelected = selectedServiceId.toString() === service.id.toString();

                      return (
                        <div
                          key={service.id}
                          onClick={() => scrollToBooking(service.id)}
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
                                scrollToBooking(service.id);
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-primary-rose text-white shadow-xs'
                                  : 'bg-ivory group-hover:bg-soft-blush text-deep-plum border border-border-color hover:border-primary-rose'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <>
                                  <span>Select</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
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
                      {/* STEP 1: SERVICE SELECTION */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum">
                            1. Treatment
                          </label>
                          {selectedService && (
                            <button
                              type="button"
                              onClick={() => setSelectedServiceId('')}
                              className="text-[11px] text-primary-rose hover:underline"
                            >
                              Change
                            </button>
                          )}
                        </div>

                        {selectedService ? (
                          <div className="p-3.5 bg-soft-blush/40 border border-border-color rounded-2xl flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold text-deep-plum truncate">
                                {selectedService.name}
                              </p>
                              <p className="text-[11px] text-muted mt-0.5">
                                {selectedService.durationMinutes} mins • {formatCurrency(selectedService.price)}
                              </p>
                            </div>
                            <span className="shrink-0 w-6 h-6 rounded-full bg-primary-rose/10 text-primary-rose flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={selectedServiceId}
                              onChange={(e) => setSelectedServiceId(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/40 outline-none bg-white text-deep-plum"
                            >
                              <option value="">— Select a service from menu —</option>
                              {services.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.durationMinutes}m) - {formatCurrency(s.price)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* STEP 2: DATE SELECTION */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum block">
                          2. Select Date
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

                      {/* STEP 3: LIVE TIME SLOTS */}
                      <div className="pt-2 border-t border-border-color/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum">
                            3. Select Time
                          </label>
                          {availability?.timeZone && (
                            <span className="text-[10px] text-muted italic">
                              {availability.timeZone}
                            </span>
                          )}
                        </div>

                        {!selectedServiceId ? (
                          <div className="p-4 bg-ivory rounded-2xl border border-border-color text-center">
                            <p className="text-xs text-muted">
                              Please choose a treatment above to reveal available appointment slots.
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
                              The salon has no available openings on this day. Please select another date.
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
                                        className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                                          selectedTime === slot.startTime
                                            ? 'bg-primary-rose text-white border-primary-rose shadow-xs'
                                            : 'bg-white border-border-color hover:border-primary-rose hover:text-primary-rose text-deep-plum'
                                        }`}
                                      >
                                        {slot.startTime}
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
                                        className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                                          selectedTime === slot.startTime
                                            ? 'bg-primary-rose text-white border-primary-rose shadow-xs'
                                            : 'bg-white border-border-color hover:border-primary-rose hover:text-primary-rose text-deep-plum'
                                        }`}
                                      >
                                        {slot.startTime}
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
                                        className={`py-2 px-2 text-xs font-medium rounded-xl border transition-all text-center ${
                                          selectedTime === slot.startTime
                                            ? 'bg-primary-rose text-white border-primary-rose shadow-xs'
                                            : 'bg-white border-border-color hover:border-primary-rose hover:text-primary-rose text-deep-plum'
                                        }`}
                                      >
                                        {slot.startTime}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STEP 4: STAFF MEMBER SELECTION (Optional if slot has specific staff) */}
                      {selectedTime && selectedSlot?.availableStaff && selectedSlot.availableStaff.length > 0 && (
                        <div className="pt-2 border-t border-border-color/80 space-y-2 animate-in fade-in">
                          <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum block">
                            4. Specialist (Optional)
                          </label>
                          <select
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-border-color rounded-xl focus:ring-2 focus:ring-primary-rose/40 outline-none bg-white text-deep-plum"
                          >
                            <option value="">Any Available Specialist</option>
                            {selectedSlot.availableStaff.map(staff => (
                              <option key={staff.id} value={staff.id}>
                                {staff.fullName} {staff.title ? `(${staff.title})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* STEP 5: NOTES & CONFIRMATION */}
                      {selectedTime && (
                        <div className="pt-2 border-t border-border-color/80 space-y-4 animate-in fade-in">
                          <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-deep-plum block mb-1.5">
                              5. Special Notes (Optional)
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
                          <div className="p-3.5 bg-ivory rounded-2xl border border-border-color/80 space-y-2 text-xs">
                            <div className="flex justify-between text-muted">
                              <span>Treatment</span>
                              <span className="font-medium text-deep-plum">{selectedService?.name}</span>
                            </div>
                            <div className="flex justify-between text-muted">
                              <span>Date & Time</span>
                              <span className="font-medium text-deep-plum">{selectedDate} @ {selectedTime}</span>
                            </div>
                            <div className="pt-2 border-t border-border-color/80 flex justify-between items-center text-sm">
                              <span className="font-medium text-deep-plum">Total Due</span>
                              <span className="font-serif font-bold text-base text-primary-rose">
                                {formatCurrency(selectedService?.price)}
                              </span>
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

      </div>
    </PublicLayout>
  );
}
