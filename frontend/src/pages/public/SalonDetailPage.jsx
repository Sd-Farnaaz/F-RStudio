import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import { publicService } from '../../services/publicService';
import { availabilityService } from '../../services/availabilityService';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Clock, Phone, Mail, AlertCircle, Calendar, CheckCircle } from 'lucide-react';

export default function SalonDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();

  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking Flow State
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [availability, setAvailability] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  useEffect(() => {
    fetchData();
    // Default to today's date
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, [slug]);

  useEffect(() => {
    if (selectedServiceId && selectedDate) {
      setSelectedTime('');
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
        setServices(servicesData.items || servicesData || []);
      } catch (svcErr) {
        console.warn('Failed to load services for salon', svcErr);
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
      setAvailabilityError(err.message || 'Failed to load availability');
      setAvailability(null);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/salons/${slug}` } });
      return;
    }
    
    setBookingLoading(true);
    setBookingError('');
    
    try {
      // Import missing dependency above in your head: import { appointmentService, toUtcIso } from '../../services/appointmentService';
      // Wait, since I'm replacing content, I should import it at top of file separately if needed.
      // I will do that in another pass.
      const { appointmentService, toUtcIso } = await import('../../services/appointmentService.js');
      
      const startAtUtc = toUtcIso(selectedDate, selectedTime, availability.timeZone);

      const response = await appointmentService.createAppointment({
        salonId: salon.id,
        serviceId: parseInt(selectedServiceId, 10),
        startAtUtc,
        customerNotes: customerNotes || null
      });

      setBookingSuccess(response);
      fetchAvailability(); // Refresh
    } catch (err) {
      if (err.status === 409) {
        setBookingError('This time slot is no longer available. Please select another time.');
        fetchAvailability(); // Refresh slots since conflict
      } else {
        setBookingError(err.message || 'Failed to book appointment.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-8 animate-pulse">
          <div className="h-64 bg-rose-tint rounded-2xl" />
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div className="h-10 bg-white rounded-md w-1/2" />
              <div className="h-32 bg-white rounded-md" />
            </div>
            <div className="w-full md:w-96 h-80 bg-white rounded-xl" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !salon) {
    const isRecoverable = error && error !== 'Not Found' && !error.toLowerCase().includes('not found');
    
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <AlertCircle className="w-16 h-16 text-muted mb-4 opacity-50" />
          <h1 className="text-3xl font-serif font-medium text-deep-plum mb-4">
            {isRecoverable ? 'Failed to Load Salon' : 'Salon Not Found'}
          </h1>
          <p className="text-muted max-w-md mb-8">{error || "The salon you're looking for doesn't exist or is currently unavailable."}</p>
          <div className="flex gap-4">
            {isRecoverable && (
              <button 
                onClick={fetchData} 
                className="px-6 py-3 bg-white border border-border-color text-deep-plum font-medium rounded-md shadow-sm hover:bg-soft-blush"
              >
                Try Again
              </button>
            )}
            <Link to="/salons" className="px-6 py-3 bg-primary-rose text-white font-medium rounded-md shadow-sm hover:bg-primary-rose/90">
              Browse Other Salons
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {});

  const selectedService = services.find(s => s.id.toString() === selectedServiceId);
  const today = new Date().toISOString().split('T')[0];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <div className="bg-rose-tint relative">
        <div className="max-w-6xl mx-auto px-6 py-20 flex items-center min-h-[300px]">
          <div className="bg-white/90 backdrop-blur-md p-8 rounded-xl shadow-sm border border-white max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-primary-rose text-white text-xs font-medium rounded-full uppercase tracking-wide">
                {salon.businessType}
              </span>
            </div>
            <h1 className="text-4xl font-serif font-semibold text-deep-plum mb-4">{salon.name}</h1>
            <div className="flex items-center text-muted">
              <MapPin className="w-5 h-5 mr-2" />
              <span>{[salon.city, salon.state, salon.country].filter(Boolean).join(', ') || 'Location not provided'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        {/* Main Content */}
        <div className="flex-1">
          {salon.description && (
            <div className="mb-12">
              <h2 className="text-2xl font-serif font-medium text-deep-plum mb-4">About Us</h2>
              <p className="text-muted leading-relaxed whitespace-pre-wrap">{salon.description}</p>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-serif font-medium text-deep-plum mb-6">Service Menu</h2>
            
            {services.length === 0 ? (
              <div className="bg-ivory border border-border-color p-8 rounded-xl text-center">
                <p className="text-muted">This salon hasn't listed any services yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                  <div key={category}>
                    <h3 className="text-xl font-medium text-deep-plum mb-4 pb-2 border-b border-border-color">{category}</h3>
                    <div className="space-y-4">
                      {categoryServices.map(service => (
                        <div key={service.id} className="flex justify-between p-4 bg-white border border-border-color rounded-lg shadow-sm hover:shadow-md transition-shadow">
                          <div className="pr-4">
                            <h4 className="font-medium text-deep-plum">{service.name}</h4>
                            {service.description && <p className="text-sm text-muted mt-1">{service.description}</p>}
                            <div className="flex items-center text-xs text-muted mt-2">
                              <Clock className="w-3 h-3 mr-1" /> {service.durationMinutes} minutes
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between">
                            <span className="font-medium text-primary-rose">${service.price.toFixed(2)}</span>
                            <button 
                              onClick={() => {
                                setSelectedServiceId(service.id.toString());
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`text-sm font-medium mt-2 px-4 py-1.5 rounded-md transition-colors ${selectedServiceId === service.id.toString() ? 'bg-primary-rose text-white' : 'text-deep-plum border border-border-color hover:text-primary-rose hover:border-primary-rose'}`}
                            >
                              {selectedServiceId === service.id.toString() ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Booking Flow */}
        <div className="w-full md:w-[380px] shrink-0">
          <div className="bg-white border border-border-color rounded-xl shadow-sm sticky top-24 overflow-hidden">
            <div className="bg-deep-plum text-white p-5">
              <h3 className="font-serif text-lg font-medium">Book Appointment</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-deep-plum mb-2">1. Select Service</label>
                <select 
                  value={selectedServiceId} 
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white"
                >
                  <option value="">-- Choose a service --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - ${s.price.toFixed(2)}</option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-deep-plum mb-2">2. Choose Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                  <input 
                    type="date" 
                    min={today}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Availability Results */}
              <div className="pt-2 border-t border-border-color">
                <h4 className="text-sm font-medium text-deep-plum mb-4">3. Select Time</h4>
                
                {!selectedServiceId ? (
                  <p className="text-sm text-muted italic">Please select a service first.</p>
                ) : loadingAvailability ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-rose-tint animate-pulse rounded-md"></div>)}
                  </div>
                ) : availabilityError ? (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100 flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                    <span>{availabilityError}</span>
                  </div>
                ) : !availability || availability.slots.length === 0 ? (
                  <div className="text-sm text-muted bg-ivory p-4 rounded-md text-center border border-border-color">
                    No availability on {selectedDate}.<br/>Please try another date.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {availability.slots.map((slot, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setSelectedTime(slot.startTime);
                            setBookingError('');
                          }}
                          className={`px-3 py-2 text-sm font-medium border rounded-md transition-colors text-center ${
                            selectedTime === slot.startTime 
                              ? 'bg-primary-rose text-white border-primary-rose' 
                              : 'text-deep-plum border-border-color hover:border-primary-rose hover:text-primary-rose'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted text-center italic">
                      Time slots are shown in {availability.timeZone}
                    </p>
                  </div>
                )}
              </div>

              {/* Step 4 & 5: Notes & Confirm Booking */}
              {selectedTime && (
                <div className="pt-4 border-t border-border-color animate-in fade-in slide-in-from-top-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-deep-plum mb-2">4. Add Notes (Optional)</label>
                    <textarea 
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Any specific requests?"
                      maxLength={500}
                      rows={2}
                      className="w-full px-4 py-2.5 text-sm border border-border-color rounded-lg focus:ring-2 focus:ring-primary-rose/50 outline-none bg-white resize-none"
                    />
                  </div>

                  {bookingError && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100 flex items-start mb-4">
                      <AlertCircle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {bookingSuccess ? (
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                      <h4 className="font-medium text-success mb-1">Booking Confirmed!</h4>
                      <p className="text-sm text-success/80 mb-3">Your appointment has been successfully scheduled.</p>
                      <Link to="/my-bookings" className="text-sm font-medium text-success hover:underline">
                        View My Bookings
                      </Link>
                    </div>
                  ) : (
                    <button 
                      onClick={handleBookAppointment}
                      disabled={bookingLoading}
                      className="w-full py-3 bg-primary-rose text-white font-medium rounded-lg shadow-sm hover:bg-primary-rose/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                      {bookingLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        `Confirm Booking`
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="bg-ivory p-5 border-t border-border-color">
              <h3 className="font-medium text-deep-plum mb-3 text-sm">Contact Info</h3>
              <div className="space-y-3 text-sm text-muted">
                {salon.addressLine && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
                    <span>
                      {salon.addressLine}<br />
                      {[salon.city, salon.state].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {salon.phoneNumber && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 shrink-0" />
                    <a href={`tel:${salon.phoneNumber}`} className="hover:text-primary-rose">{salon.phoneNumber}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
