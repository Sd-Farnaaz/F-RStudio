import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle, imageSrc }) {
  return (
    <div className="min-h-screen flex bg-ivory text-deep-plum antialiased selection:bg-rose-tint selection:text-deep-plum">
      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 sm:px-12 md:px-16 lg:px-20 py-10 relative z-10">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <Link to="/" className="group flex items-center gap-2.5 focus:outline-none">
            <img 
              src="/images/fr-beauty-studio-logo.png" 
              alt="F&R Beauty Studio" 
              className="w-9 h-9 object-contain rounded-full border border-border-color shadow-2xs group-hover:scale-105 transition-transform" 
            />
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-deep-plum">
              F&R <span className="text-primary-rose">Beauty Studio</span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-deep-plum transition-colors font-medium p-1.5 rounded-lg hover:bg-soft-blush"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Card Body */}
        <div className="max-w-md w-full mx-auto lg:mx-0 my-auto">
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-border-color">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-serif font-medium text-deep-plum mb-2 tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>
        </div>

        {/* Footer Sub-note */}
        <div className="mt-8 pt-4 text-xs text-muted/80 text-center lg:text-left flex items-center justify-center lg:justify-start gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-primary-rose" />
          <span>Multi-tenant encrypted secure session</span>
        </div>
      </div>
      
      {/* Editorial Imagery Section */}
      <div className="hidden lg:block lg:w-1/2 bg-rose-tint relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-deep-plum/80 via-deep-plum/20 to-transparent z-10" />
        <img 
          src={imageSrc || "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1200&q=85"} 
          alt="Luxury salon styling studio" 
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        <div className="absolute bottom-12 left-12 right-12 z-20 text-white space-y-3">
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-soft-blush">
            <Sparkles className="w-3 h-3 text-dusty-rose" />
            <span>The Luxury Beauty Standard</span>
          </div>
          <h2 className="text-3xl font-serif font-medium leading-snug">
            Elevate your salon experience.
          </h2>
          <p className="text-soft-blush/90 max-w-md text-xs sm:text-sm leading-relaxed">
            The unified platform where clients discover exceptional studios and beauty professionals orchestrate appointments seamlessly.
          </p>
        </div>
      </div>
    </div>
  );
}
