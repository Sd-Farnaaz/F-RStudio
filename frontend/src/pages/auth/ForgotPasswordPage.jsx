import AuthLayout from '../../components/layout/AuthLayout';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const handleReset = (e) => {
    e.preventDefault();
    alert("Password reset link sent (demo)");
  };

  return (
    <AuthLayout 
      title="Reset password" 
      subtitle="Enter your email and we'll send you a link to reset your password."
      imageSrc="https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    >
      <form onSubmit={handleReset} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-2">Email</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="you@example.com"
          />
        </div>
        <button 
          type="submit" 
          className="w-full py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm"
        >
          Send reset link
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Remember your password? <Link to="/login" className="text-primary-rose font-medium hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
