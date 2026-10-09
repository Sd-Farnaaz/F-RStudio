import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle, imageSrc }) {
  return (
    <div className="min-h-screen flex bg-ivory">
      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <Link to="/" className="text-2xl font-serif font-semibold text-primary-rose mb-12 inline-block">
          SalonBook
        </Link>
        <div className="max-w-md w-full mx-auto lg:mx-0">
          <h1 className="text-3xl font-serif font-semibold text-deep-plum mb-2">{title}</h1>
          {subtitle && <p className="text-muted mb-8">{subtitle}</p>}
          {children}
        </div>
      </div>
      
      {/* Image Section */}
      <div className="hidden lg:block lg:w-1/2 bg-rose-tint relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-rose/20 to-deep-plum/20 mix-blend-multiply z-10" />
        <img 
          src={imageSrc || "https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"} 
          alt="Salon interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
