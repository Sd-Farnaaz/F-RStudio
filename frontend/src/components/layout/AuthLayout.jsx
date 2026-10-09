import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle, imageSrc }) {
  return (
    <div className="min-h-screen flex bg-ivory">
      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-24 py-12 relative z-10">
        <Link to="/" className="text-2xl font-serif font-semibold text-primary-rose mb-12 inline-block transition-opacity hover:opacity-80">
          SalonBook
        </Link>
        <div className="max-w-md w-full mx-auto lg:mx-0 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-border-color">
          <h1 className="text-3xl font-serif font-semibold text-deep-plum mb-3">{title}</h1>
          {subtitle && <p className="text-muted mb-8 text-sm leading-relaxed">{subtitle}</p>}
          {children}
        </div>
      </div>
      
      {/* Image Section */}
      <div className="hidden lg:block lg:w-1/2 bg-rose-tint relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-rose/30 to-deep-plum/60 mix-blend-multiply z-10" />
        <img 
          src={imageSrc || "https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"} 
          alt="Salon interior" 
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute bottom-12 left-12 right-12 z-20 text-white">
          <h2 className="text-3xl font-serif mb-4">Elevate your salon experience.</h2>
          <p className="text-white/80 max-w-md text-sm leading-relaxed">
            Join thousands of beauty professionals and clients who trust SalonBook for a seamless booking experience.
          </p>
        </div>
      </div>
    </div>
  );
}
