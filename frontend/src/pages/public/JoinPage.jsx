import PublicLayout from '../../components/layout/PublicLayout';
import { Link } from 'react-router-dom';
import { Sparkles, Scissors, ArrowRight, ShieldCheck, Check } from 'lucide-react';

export default function JoinPage() {
  return (
    <PublicLayout>
      <div className="bg-ivory min-h-screen pb-20">
        
        {/* Header Hero */}
        <section className="bg-gradient-to-b from-rose-tint/40 via-soft-blush/20 to-ivory border-b border-border-color py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Get Started</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-medium text-deep-plum leading-tight">
              How would you like to use SalonBook?
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-xl mx-auto leading-relaxed">
              Whether you are scheduling your next personal beauty visit or orchestrating operations for your salon team, choose your path below.
            </p>
          </div>
        </section>

        {/* Choice Cards */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Card 1: For Client */}
            <div className="bg-white rounded-3xl border border-border-color shadow-xs hover:shadow-md transition-all group flex flex-col justify-between overflow-hidden">
              <div className="aspect-[16/7] w-full overflow-hidden bg-soft-blush relative">
                <img
                  src="https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=85"
                  alt="Client luxury salon appointment"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 text-white font-serif text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
                  <span>Personal Beauty Appointments</span>
                </div>
              </div>

              <div className="p-8 sm:p-10 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                    I'm a Client
                  </span>
                  <h2 className="font-serif text-3xl font-medium text-deep-plum mb-3">
                    Book Beauty Treatments
                  </h2>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
                    Discover verified salons and studios, book appointments in real time, submit advance payment references, and track your booking ledger.
                  </p>

                  <div className="space-y-2.5 text-xs text-deep-plum mb-8">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary-rose shrink-0" />
                      <span>Real-time calendar slot availability</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary-rose shrink-0" />
                      <span>Transparent treatment durations & pricing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary-rose shrink-0" />
                      <span>Automated notifications and reminders</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Link
                    to="/signup"
                    className="w-full py-3.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Continue as Client</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[11px] text-muted text-center mt-3">
                    Already have an account? <Link to="/login" className="text-primary-rose font-semibold hover:underline">Log in</Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: For Salon Owner */}
            <div className="bg-white rounded-3xl border-2 border-primary-rose shadow-md group flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 z-20 bg-primary-rose text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-xl shadow-xs">
                Free Platform Launch
              </div>

              <div className="aspect-[16/7] w-full overflow-hidden bg-soft-blush relative">
                <img
                  src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=800&q=85"
                  alt="Salon owner workspace"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 text-white font-serif text-sm font-semibold flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-dusty-rose" />
                  <span>Salon Business Management</span>
                </div>
              </div>

              <div className="p-8 sm:p-10 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-rose block mb-1">
                    I'm a Salon Owner
                  </span>
                  <h2 className="font-serif text-3xl font-medium text-deep-plum mb-3">
                    Manage & Grow Your Salon
                  </h2>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
                    Custom salon URL, specialist roster shifts, service catalog, double-booking protection, and UPI advance payment verification.
                  </p>

                  <div className="space-y-2.5 text-xs text-deep-plum mb-8">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Full salon management workspace & catalog</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>UPI QR configuration and deposit ledger</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Zero platform subscription during early launch</span>
                  </div>
                </div>
              </div>

              <div>
                <Link
                  to="/admin/register"
                  className="w-full py-3.5 bg-deep-plum text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-deep-plum/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>Register Your Salon Free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-muted text-center mt-3">
                  Already registered? <Link to="/admin/login" className="text-primary-rose font-semibold hover:underline">Admin Login</Link>
                </p>
              </div>
            </div>
            </div>

          </div>
        </section>

      </div>
    </PublicLayout>
  );
}
