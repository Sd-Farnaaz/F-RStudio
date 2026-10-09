import DashboardLayout from '../../components/layout/DashboardLayout';
import { Clock, Scissors, User, ChevronRight } from 'lucide-react';

const MOCK_APPOINTMENTS = [
  { id: 1, client: "Emma Thompson", service: "Balayage & Cut", time: "09:00 AM", duration: "2h 30m", status: "completed" },
  { id: 2, client: "Sarah Jenkins", service: "Root Touch-up", time: "11:30 AM", duration: "1h 15m", status: "in-progress" },
  { id: 3, client: "Michael Chen", service: "Men's Haircut", time: "01:00 PM", duration: "45m", status: "upcoming" },
  { id: 4, client: "Jessica Alba", service: "Full Highlights", time: "02:00 PM", duration: "3h", status: "upcoming" },
];

export default function DashboardToday() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Today's Schedule</h1>
            <p className="text-sm text-muted">Thursday, Oct 9th, 2026</p>
          </div>
          <button className="px-4 py-2 bg-primary-rose text-white text-sm font-medium rounded-md hover:bg-primary-rose/90 transition-all shadow-sm">
            + New Booking
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm">
            <h3 className="text-sm font-medium text-muted mb-1">Total Appointments</h3>
            <p className="text-3xl font-serif font-semibold text-deep-plum">8</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm">
            <h3 className="text-sm font-medium text-muted mb-1">Estimated Revenue</h3>
            <p className="text-3xl font-serif font-semibold text-deep-plum">$845</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-border-color shadow-sm">
            <h3 className="text-sm font-medium text-muted mb-1">New Clients</h3>
            <p className="text-3xl font-serif font-semibold text-deep-plum">2</p>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white border border-border-color rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-ivory/50">
            <h2 className="font-medium text-deep-plum">Upcoming Appointments</h2>
            <button className="text-sm text-primary-rose font-medium hover:underline flex items-center">
              View Calendar <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="divide-y divide-border-color">
            {MOCK_APPOINTMENTS.map((apt) => (
              <div key={apt.id} className="p-6 flex flex-col sm:flex-row sm:items-center hover:bg-soft-blush transition-colors group cursor-pointer">
                <div className="sm:w-32 flex items-center mb-3 sm:mb-0">
                  <Clock className="w-4 h-4 text-muted mr-2" />
                  <span className="text-sm font-medium text-deep-plum">{apt.time}</span>
                </div>
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-rose-tint flex items-center justify-center text-primary-rose mr-3">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-deep-plum">{apt.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted">
                    <Scissors className="w-4 h-4 mr-2" />
                    {apt.service}
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end sm:w-48 gap-4">
                  <span className="text-xs font-medium text-muted px-2 py-1 bg-ivory rounded-md border border-border-color">
                    {apt.duration}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {apt.status === 'completed' ? 'Completed' : apt.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
