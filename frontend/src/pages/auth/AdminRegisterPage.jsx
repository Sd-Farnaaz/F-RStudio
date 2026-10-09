import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminRegisterPage() {
  const [formData, setFormData] = useState({ 
    salonName: '', 
    businessType: 'Hair Salon', 
    fullName: '', 
    email: '', 
    password: '',
    timeZone: 'Asia/Kolkata',
    currencyCode: 'INR'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const response = await authService.adminRegister(formData);
      login(response);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to register salon');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Partner with SalonBook" 
      subtitle="Register your salon and start managing your business effortlessly."
      imageSrc="https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-1">Salon Name</label>
          <input 
            type="text" 
            name="salonName"
            required
            value={formData.salonName}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="Bella Beauty Bar"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-1">Business Type</label>
          <select
            name="businessType"
            required
            value={formData.businessType}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white"
          >
            <option value="Hair Salon">Hair Salon</option>
            <option value="Nail Salon">Nail Salon</option>
            <option value="Spa">Spa & Wellness</option>
            <option value="Barbershop">Barbershop</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-1">Your Full Name</label>
          <input 
            type="text" 
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-1">Work Email</label>
          <input 
            type="email" 
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white" 
            placeholder="admin@yoursalon.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-deep-plum mb-1">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary-rose/50 bg-white pr-10" 
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-deep-plum focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full mt-2 py-2.5 bg-primary-rose text-white font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Create Salon Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already registered? <Link to="/admin/login" className="text-primary-rose font-medium hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
