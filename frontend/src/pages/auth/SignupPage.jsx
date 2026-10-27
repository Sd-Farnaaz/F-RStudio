import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';

export default function SignupPage() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await authService.userRegister({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      login(response);
      navigate('/my-bookings', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Create your account" 
      subtitle="Join SalonBook to discover exceptional studios and book your beauty visits."
      imageSrc="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80"
    >
      {error && (
        <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-xs sm:text-sm rounded-2xl border border-rose-100 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Full Name
          </label>
          <input 
            type="text" 
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
            placeholder="e.g. Jane Doe"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Email Address
          </label>
          <input 
            type="email" 
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
            Password
          </label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 pr-10 transition-all" 
              placeholder="Minimum 8 characters"
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
          <p className="text-[11px] text-muted mt-1">Must contain at least 8 characters.</p>
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Client Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-border-color/80 text-center text-xs text-muted space-y-2">
        <p>
          Already have an account?{' '}
          <Link to="/login" className="text-primary-rose font-semibold hover:underline">
            Sign in
          </Link>
        </p>
        <p className="pt-1">
          Are you a salon owner?{' '}
          <Link to="/admin/register" className="text-deep-plum font-semibold hover:text-primary-rose transition-colors">
            Register your salon →
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
