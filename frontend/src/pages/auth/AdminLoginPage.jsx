import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await authService.adminLogin({ email: email.trim(), password });
      login(response);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Salon Administrator" 
      subtitle="Sign in to your salon workspace to manage appointments, specialists, and revenue."
      imageSrc="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1200&q=85"
    >
      {error && (
        <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs sm:text-sm rounded-2xl border border-rose-100 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Administrator Email
          </label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
            placeholder="admin@yoursalon.com"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-primary-rose hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 pr-10 transition-all" 
              placeholder="••••••••"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-deep-plum focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3.5 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs hover:shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in to workspace...</span>
              </>
            ) : (
              <>
                <span>Sign in as Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-border-color/80 text-center text-xs text-muted space-y-2">
        <p>
          New salon owner?{' '}
          <Link to="/admin/register" className="text-primary-rose font-semibold hover:underline">
            Register your salon free
          </Link>
        </p>
        <p className="pt-1">
          Are you a booking client?{' '}
          <Link to="/login" className="text-deep-plum font-semibold hover:text-primary-rose transition-colors">
            Client Sign In →
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
