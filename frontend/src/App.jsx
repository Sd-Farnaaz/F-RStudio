import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public pages
import LandingPage from './pages/public/LandingPage';
import FeaturesPage from './pages/public/FeaturesPage';
import PricingPage from './pages/public/PricingPage';
import ContactPage from './pages/public/ContactPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import JoinPage from './pages/public/JoinPage';
import SalonsListPage from './pages/public/SalonsListPage';
import SalonDetailPage from './pages/public/SalonDetailPage';

// User Auth
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Admin Auth
import AdminLoginPage from './pages/auth/AdminLoginPage';
import AdminRegisterPage from './pages/auth/AdminRegisterPage';

// SuperAdmin Auth
import SuperAdminLoginPage from './pages/auth/SuperAdminLoginPage';

// Dashboards
import AdminDashboard from './pages/dashboard/AdminDashboard';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import SuperAdminSalonsPage from './pages/dashboard/SuperAdminSalonsPage';
import SuperAdminSalonDetailPage from './pages/dashboard/SuperAdminSalonDetailPage';
import SuperAdminKycPage from './pages/dashboard/SuperAdminKycPage';
import SuperAdminUsersPage from './pages/dashboard/SuperAdminUsersPage';
import CustomerDashboard from './pages/dashboard/CustomerDashboard';
import ServicesPage from './pages/dashboard/ServicesPage';
import SalonProfilePage from './pages/dashboard/SalonProfilePage';
import StaffPage from './pages/dashboard/StaffPage';
import StaffSchedulePage from './pages/dashboard/StaffSchedulePage';
import AdminAppointmentsPage from './pages/dashboard/AdminAppointmentsPage';
import AdminCalendarPage from './pages/dashboard/AdminCalendarPage';
import AdminPosPage from './pages/dashboard/AdminPosPage';
import AdminCustomersPage from './pages/dashboard/AdminCustomersPage';
import AdminReviewsPage from './pages/dashboard/AdminReviewsPage';

// Not Found
import NotFoundPage from './pages/public/NotFoundPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory">Loading...</div>;

  if (!user) {
    // Redirect to role-appropriate login
    if (allowedRoles.includes('SuperAdmin')) return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
    if (allowedRoles.includes('Admin')) return <Navigate to="/admin/login" state={{ from: location }} replace />;
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role mismatch
    if (user.role === 'SuperAdmin') return <Navigate to="/superadmin/dashboard" replace />;
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/my-bookings" replace />;
  }

  return children;
}

function PublicAuthRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-ivory">Loading...</div>;

  if (user) {
    if (user.role === 'SuperAdmin') return <Navigate to="/superadmin/dashboard" replace />;
    if (user.role === 'Admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/my-bookings" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Website */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/join" element={<PublicAuthRoute><JoinPage /></PublicAuthRoute>} />

          <Route path="/salons" element={<SalonsListPage />} />
          <Route path="/salons/:slug" element={<SalonDetailPage />} />

          {/* User Auth */}
          <Route path="/login" element={<PublicAuthRoute><LoginPage /></PublicAuthRoute>} />
          <Route path="/signup" element={<PublicAuthRoute><SignupPage /></PublicAuthRoute>} />
          
          {/* Admin Auth */}
          <Route path="/admin/login" element={<PublicAuthRoute><AdminLoginPage /></PublicAuthRoute>} />
          <Route path="/admin/register" element={<PublicAuthRoute><AdminRegisterPage /></PublicAuthRoute>} />
          
          {/* SuperAdmin Auth */}
          <Route path="/superadmin/login" element={<PublicAuthRoute><SuperAdminLoginPage /></PublicAuthRoute>} />

          {/* Shared Auth */}
          <Route path="/forgot-password" element={<PublicAuthRoute><ForgotPasswordPage /></PublicAuthRoute>} />

          {/* SuperAdmin Platform Management */}
          <Route path="/superadmin/dashboard" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminDashboard /></ProtectedRoute>} />
          <Route path="/superadmin/salons" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminSalonsPage /></ProtectedRoute>} />
          <Route path="/superadmin/salons/:id" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminSalonDetailPage /></ProtectedRoute>} />
          <Route path="/superadmin/kyc" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminKycPage /></ProtectedRoute>} />
          <Route path="/superadmin/users" element={<ProtectedRoute allowedRoles={['SuperAdmin']}><SuperAdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={['Admin']}><AdminAppointmentsPage /></ProtectedRoute>} />
          <Route path="/admin/calendar" element={<ProtectedRoute allowedRoles={['Admin']}><AdminCalendarPage /></ProtectedRoute>} />
          <Route path="/admin/pos" element={<ProtectedRoute allowedRoles={['Admin']}><AdminPosPage /></ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute allowedRoles={['Admin']}><ServicesPage /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['Admin']}><StaffPage /></ProtectedRoute>} />
          <Route path="/admin/staff/:id/schedule" element={<ProtectedRoute allowedRoles={['Admin']}><StaffSchedulePage /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['Admin']}><AdminCustomersPage /></ProtectedRoute>} />
          <Route path="/admin/reviews" element={<ProtectedRoute allowedRoles={['Admin']}><AdminReviewsPage /></ProtectedRoute>} />
          <Route path="/admin/settings/salon" element={<ProtectedRoute allowedRoles={['Admin']}><SalonProfilePage /></ProtectedRoute>} />
          <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['User']}><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer/dashboard" element={<ProtectedRoute allowedRoles={['User']}><CustomerDashboard /></ProtectedRoute>} />

          {/* Redirect old routes gracefully */}
          <Route path="/app/today" element={<Navigate to="/admin/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
