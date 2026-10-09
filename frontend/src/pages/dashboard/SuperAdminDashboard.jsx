import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Shield, Building, Users } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Platform Overview</h1>
            <p className="text-sm text-muted">SuperAdmin: {user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm flex items-center">
            <div className="w-12 h-12 bg-rose-tint rounded-full flex items-center justify-center mr-4 shrink-0">
              <Building className="w-6 h-6 text-primary-rose" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted mb-1">Total Salons</h3>
              <p className="text-xs italic text-muted mt-1">API not available</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm flex items-center">
            <div className="w-12 h-12 bg-rose-tint rounded-full flex items-center justify-center mr-4 shrink-0">
              <Users className="w-6 h-6 text-primary-rose" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted mb-1">Active Users</h3>
              <p className="text-xs italic text-muted mt-1">API not available</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm flex items-center">
            <div className="w-12 h-12 bg-rose-tint rounded-full flex items-center justify-center mr-4 shrink-0">
              <Shield className="w-6 h-6 text-primary-rose" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted mb-1">Platform Health</h3>
              <p className="text-xs italic text-muted mt-1">API not available</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border-color rounded-xl shadow-sm p-12 text-center">
          <h2 className="text-xl font-medium text-deep-plum mb-2">SuperAdmin endpoints are pending</h2>
          <p className="text-muted">The backend API for platform-wide analytics and management has not been implemented yet.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
