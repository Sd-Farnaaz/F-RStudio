import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield } from 'lucide-react';

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const from = location.state?.from?.pathname || '/superadmin/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await authService.superAdminLogin({ email, password });
      login(response);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-deep-plum via-[#3f2f32] to-[#2e2224] px-4 py-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-rose/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-ivory rounded-3xl shadow-2xl p-8 sm:p-10 border border-border-color relative z-10 space-y-6">
        <div className="flex flex-col items-center text-center">
          <img 
            src="/images/fr-beauty-studio-logo.png" 
            alt="F&R Beauty Studio" 
            className="w-16 h-16 object-contain rounded-full border border-dusty-rose/40 shadow-xs mb-4" 
          />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary-rose bg-soft-blush px-3 py-1 rounded-full border border-dusty-rose/30 mb-2">
            Platform Governance
          </span>
          <h1 className="text-3xl font-serif font-medium text-deep-plum">F&R Beauty Studio</h1>
          <p className="text-muted mt-1 text-xs">Sign in to platform root administrative console</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-800 text-xs rounded-2xl border border-rose-200 leading-relaxed flex items-start gap-2">
            <Shield className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-deep-plum mb-1.5">
              SuperAdmin Email
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="e.g. superadmin@frbeautystudio.com"
              className="w-full px-4 py-2.5 bg-white text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/50 text-deep-plum placeholder:text-muted/60 transition-all" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-deep-plum mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 bg-white text-xs border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/50 text-deep-plum pr-10 transition-all" 
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-deep-plum focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-deep-plum text-white font-semibold text-xs rounded-xl hover:bg-deep-plum/90 transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? 'Verifying Credentials...' : 'Authenticate Platform Console'}
          </button>
        </form>

        <div className="pt-4 border-t border-border-color/80 text-center">
          <a 
            href="/" 
            className="text-xs text-muted hover:text-deep-plum font-medium transition-colors"
          >
            ← Return to F&R Beauty Studio Public Portal
          </a>
        </div>
      </div>
    </div>
  );
}
