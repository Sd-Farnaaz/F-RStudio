import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, ChevronRight, Store, Phone, Clock } from 'lucide-react';

export default function SalonCard({ salon }) {
  if (!salon) return null;

  const locationText = [salon.addressLine, salon.city, salon.state]
    .filter(Boolean)
    .join(', ') || salon.city || salon.country || 'Location available upon booking';

  return (
    <Link
      to={`/salons/${salon.slug}`}
      className="group bg-white rounded-3xl p-6 border border-border-color/90 hover:border-dusty-rose shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between relative overflow-hidden"
    >
      {/* Decorative subtle hover accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-soft-blush/40 to-transparent rounded-bl-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Salon Header with Avatar/Logo & Badges */}
        <div className="flex items-start gap-4 mb-4">
          {salon.logoUrl ? (
            <img
              src={salon.logoUrl}
              alt={salon.name}
              className="w-16 h-16 rounded-2xl object-cover border border-border-color bg-white shrink-0 shadow-2xs group-hover:scale-102 transition-transform"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-soft-blush to-rose-tint border border-dusty-rose/30 flex items-center justify-center text-deep-plum font-serif text-2xl font-bold shrink-0 shadow-2xs">
              {salon.name?.charAt(0) || 'S'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {salon.businessType && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-rose bg-soft-blush px-2.5 py-0.5 rounded-full border border-dusty-rose/40 inline-block">
                  {salon.businessType}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>

            <h3 className="font-serif text-xl font-medium text-deep-plum truncate group-hover:text-primary-rose transition-colors">
              {salon.name}
            </h3>
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="space-y-2 text-xs text-muted mb-5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary-rose shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>

          {salon.phoneNumber && (
            <div className="flex items-center gap-1.5 text-muted/80">
              <Phone className="w-3.5 h-3.5 text-muted/60 shrink-0" />
              <span>{salon.phoneNumber}</span>
            </div>
          )}

          {salon.description && (
            <p className="line-clamp-2 text-muted leading-relaxed pt-1 text-xs">
              {salon.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="pt-4 border-t border-border-color/60 flex items-center justify-between">
        <span className="text-xs font-medium text-muted group-hover:text-deep-plum transition-colors">
          Instant Calendar Booking
        </span>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-rose group-hover:translate-x-0.5 transition-transform">
          <span>View Salon</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
