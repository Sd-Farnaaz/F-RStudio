import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { authService } from '../../services/authService';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setServerMessage('');
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword(email.trim());
      setServerMessage(response.message || 'If your email is registered in our system, you will receive password reset instructions.');
    } catch (err) {
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Reset your password" 
      subtitle="Enter your registered email address and we will dispatch password recovery instructions."
      imageSrc="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85"
    >
      {serverMessage ? (
        <div className="space-y-6 text-center py-2 animate-in fade-in">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl font-medium text-deep-plum">
              Check Your Inbox
            </h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {serverMessage}
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 bg-primary-rose text-white text-xs sm:text-sm font-semibold rounded-2xl hover:bg-primary-rose/90 shadow-2xs transition-all"
            >
              Return to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 text-xs sm:text-sm rounded-2xl border border-rose-100 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-deep-plum mb-1.5">
              Email Address
            </label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-ivory text-xs sm:text-sm text-deep-plum border border-border-color rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-rose/40 placeholder:text-muted/60 transition-all" 
              placeholder="you@example.com"
            />
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
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Instructions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-border-color/80 text-center text-xs text-muted">
            Remember your password?{' '}
            <Link to="/login" className="text-primary-rose font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
