import AuthLayout from '../../components/layout/AuthLayout';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    navigate('/app/today');
  };

  return (
    <AuthLayout 
      title="Create an account" 
      subtitle="Start managing your salon effortlessly today."
      imageSrc="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-2">Salon Name</label>
          <input 
            type="text" 
            required
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="Bella Salon"
          />
        </div>
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
          <label className="block text-sm font-medium text-deep-plum mb-2">Password</label>
          <input 
            type="password" 
            required
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="Create a strong password"
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm"
        >
          Create account
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="text-primary-rose font-medium hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
