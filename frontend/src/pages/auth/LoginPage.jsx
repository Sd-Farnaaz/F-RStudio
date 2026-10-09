import AuthLayout from '../../components/layout/AuthLayout';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // In a real app, handle authentication here
    navigate('/app/today');
  };

  return (
    <AuthLayout 
      title="Welcome back" 
      subtitle="Enter your details to access your dashboard."
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-2">Email</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-deep-plum">Password</label>
            <Link to="/forgot-password" className="text-sm text-primary-rose hover:underline">Forgot password?</Link>
          </div>
          <input 
            type="password" 
            required
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="••••••••"
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm"
        >
          Log in
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Don't have an account? <Link to="/signup" className="text-primary-rose font-medium hover:underline">Sign up</Link>
      </p>
    </AuthLayout>
  );
}
