import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDossierDrawer from '../../components/dossier/ClientDossierDrawer';
import { appointmentService } from '../../services/appointmentService';
import { staffService } from '../../services/staffService';
import { 
  ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, 
  Clock, User, CheckCircle2, AlertCircle, X, ShoppingBag, FileText, 
  Move, Plus, Filter, AlertTriangle 
} from 'lucide-react';

export default function AdminCalendarPage() {
  const navigate = useNavigate();

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('staff'); // 'staff' (daily staff columns) | 'week' (7-day grid)
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');
  
  // Data State
  const [appointments, setAppointments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Selected Appointment Modal
  const [selectedApt, setSelectedApt] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Client Consultation Dossier Drawer
  const [dossierCustomerId, setDossierCustomerId] = useState(null);
  const [dossierOpen, setDossierOpen] = useState(false);

  // Drag and Drop tracking
  const [draggedApt, setDraggedApt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null); // { staffId, hour, minute }

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [currentDate, viewMode, selectedStaffFilter]);

  const loadStaff = async () => {
    try {
      const res = await staffService.getStaffList();
      const list = res.items || res || [];
      setStaffList(list.filter(s => s.isActive));
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError('');

      let start, end;
      if (viewMode === 'staff') {
        start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
      } else {
        // Week view: start from Monday of current week
        const curr = new Date(currentDate);
        const day = curr.getDay();
        const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start = new Date(curr.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      }

      const data = await appointmentService.getCalendar(
        start.toISOString(),
        end.toISOString(),
        selectedStaffFilter ? parseInt(selectedStaffFilter) : null
      );
      setAppointments(data.items || data || []);
    } catch (err) {
      setError(err.message || 'Failed to load calendar appointments.');
    } finally {
      setLoading(false);
    }
  };

  const nextDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'staff') {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setCurrentDate(d);
  };

  const prevDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'staff') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Drag and Drop Handlers
  const handleDragStart = (e, apt) => {
    setDraggedApt(apt);
    e.dataTransfer.setData('text/plain', apt.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, staffId, hour, minute) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ staffId, hour, minute });
  };

  const handleDrop = async (e, targetStaffId, targetHour, targetMinute) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedApt) return;

    // Calculate new start time in UTC
    const targetDate = new Date(currentDate);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
    const newStartAtUtc = targetDate.toISOString();

    // Check if slot is actually different
    const currentAptStart = new Date(draggedApt.startAtUtc);
    if (
      currentAptStart.getHours() === targetHour &&
      currentAptStart.getMinutes() === targetMinute &&
      draggedApt.staffId === targetStaffId
    ) {
      setDraggedApt(null);
      return;
    }

    try {
      setNotification(`Rescheduling ${draggedApt.customerName}'s appointment...`);
      await appointmentService.rescheduleAppointment(draggedApt.id, {
        newStartAtUtc,
        newStaffId: targetStaffId,
        reason: 'Drag-and-drop calendar reschedule'
      });
      setNotification('Appointment rescheduled successfully!');
      setTimeout(() => setNotification(''), 3000);
      fetchCalendar();
    } catch (err) {
      setError(err.message || 'Could not reschedule appointment.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setDraggedApt(null);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setUpdatingStatus(true);
      await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
      if (selectedApt) {
        setSelectedApt({ ...selectedApt, status: newStatus });
      }
      fetchCalendar();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openDossier = (customerId) => {
    setDossierCustomerId(customerId);
    setDossierOpen(true);
    setSelectedApt(null);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100/90';
      case 'Completed': return 'bg-indigo-50 border-indigo-300 text-indigo-950 hover:bg-indigo-100/90';
      case 'Pending': return 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100/90';
      case 'Cancelled': return 'bg-rose-50 border-rose-300 text-rose-900 line-through opacity-60';
      case 'NoShow': return 'bg-slate-100 border-slate-300 text-slate-800 opacity-80';
      default: return 'bg-white border-border-color text-deep-plum';
    }
  };

  const getStatusDot = (status) => {
    switch(status) {
      case 'Confirmed': return 'bg-emerald-500';
      case 'Completed': return 'bg-indigo-500';
      case 'Pending': return 'bg-amber-500';
      case 'Cancelled': return 'bg-rose-500';
      case 'NoShow': return 'bg-slate-500';
      default: return 'bg-gray-400';
    }
  };

  // 30-minute intervals from 8 AM to 9 PM (13 hours * 2 = 26 slots)
  const timeSlots = [];
  for (let hour = 8; hour < 21; hour++) {
    timeSlots.push({ hour, minute: 0, label: `${hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}` });
    timeSlots.push({ hour, minute: 30, label: `${hour === 12 ? 12 : hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}` });
  }

  // Display columns in staff view
  const activeStaffColumns = selectedStaffFilter
    ? staffList.filter(s => s.id === parseInt(selectedStaffFilter))
    : staffList;

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto pb-12 flex flex-col h-[calc(100vh-6rem)]">
        
        {/* Top Header Bar */}
        <div className="mb-4 flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-border-color shadow-sm shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-rose/10 text-primary-rose">
                Daily Operations
              </span>
              <span className="text-xs text-muted flex items-center gap-1">
                <Move className="w-3.5 h-3.5" /> Drag & drop cards to reschedule
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-deep-plum mt-0.5">
              Staff Appointments Calendar
            </h1>
          </div>

          {/* Controls: Date, Views, Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-border-color text-xs font-medium">
              <button
                onClick={() => setViewMode('staff')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'staff' ? 'bg-white text-deep-plum shadow-sm font-semibold' : 'text-muted hover:text-deep-plum'
                }`}
              >
                Staff Grid
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'week' ? 'bg-white text-deep-plum shadow-sm font-semibold' : 'text-muted hover:text-deep-plum'
                }`}
              >
                Week View
              </button>
            </div>

            {/* Staff filter */}
            <div className="flex items-center gap-1.5 bg-white border border-border-color px-3 py-1.5 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-deep-plum focus:ring-0 cursor-pointer"
              >
                <option value="">All Stylists ({staffList.length})</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center bg-white border border-border-color rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={prevDate} 
                className="p-2 text-muted hover:text-deep-plum hover:bg-soft-blush transition-colors"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-semibold text-primary-rose hover:bg-rose-tint border-x border-border-color transition-colors"
              >
                Today
              </button>
              <div className="px-3 py-1.5 text-xs font-semibold text-deep-plum min-w-[130px] text-center border-r border-border-color">
                {currentDate.toLocaleDateString(undefined, { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
              <button 
                onClick={nextDate} 
                className="p-2 text-muted hover:text-deep-plum hover:bg-soft-blush transition-colors"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Fast Quick Walk-In Button */}
            <button
              onClick={() => navigate('/admin/pos')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-deep-plum transition-all shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              POS Walk-In
            </button>
          </div>
        </div>

        {/* Floating Notification */}
        {notification && (
          <div className="mb-3 px-4 py-2 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {notification}
          </div>
        )}

        {/* Floating Error Alert */}
        {error && (
          <div className="mb-3 px-4 py-2 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Main Visual Calendar Grid Area */}
        <div className="flex-1 bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
          {loading && (
            <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-xs flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary-rose animate-spin" />
            </div>
          )}

          {/* Staff Headers Row (Staff View) */}
          <div className="flex border-b border-border-color bg-gray-50/80 sticky top-0 z-10">
            {/* Time slot axis corner */}
            <div className="w-24 shrink-0 p-3 text-[11px] font-bold uppercase tracking-wider text-muted border-r border-border-color text-center bg-gray-50">
              Time
            </div>

            {/* Staff Member Column Headers */}
            {activeStaffColumns.length > 0 ? (
              activeStaffColumns.map((staff) => {
                const staffAppointmentsCount = appointments.filter(a => a.staffId === staff.id && a.status !== 'Cancelled').length;
                return (
                  <div 
                    key={staff.id} 
                    className="flex-1 min-w-[200px] p-3 text-center border-r border-border-color last:border-r-0"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-rose/10 text-primary-rose font-bold text-xs flex items-center justify-center">
                        {staff.fullName.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-deep-plum truncate max-w-[140px]">
                          {staff.fullName}
                        </div>
                        <div className="text-[10px] text-muted truncate max-w-[140px]">
                          {staff.title || 'Stylist'} • {staffAppointmentsCount} bookings
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex-1 p-4 text-center text-xs text-muted">
                No active staff members found. Add staff in Staff Management.
              </div>
            )}
          </div>

          {/* Time Slots & Appointments Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {timeSlots.map(({ hour, minute, label }) => {
              const isHourStart = minute === 0;

              return (
                <div 
                  key={`${hour}-${minute}`} 
                  className={`flex min-h-[46px] border-b ${isHourStart ? 'border-border-color' : 'border-gray-100'} hover:bg-gray-50/40 transition-colors`}
                >
                  {/* Time label */}
                  <div className="w-24 shrink-0 text-right pr-3 py-1.5 text-xs font-mono font-medium text-muted border-r border-border-color select-none bg-gray-50/40">
                    {minute === 0 ? label : ''}
                  </div>

                  {/* Staff Slot Droppable Cells */}
                  {activeStaffColumns.map((staff) => {
                    // Check if dragged over this exact cell
                    const isDragOver = dragOverSlot && 
                      dragOverSlot.staffId === staff.id && 
                      dragOverSlot.hour === hour && 
                      dragOverSlot.minute === minute;

                    // Find appointments starting in this 30-minute block
                    const cellAppointments = appointments.filter(a => {
                      if (a.staffId !== staff.id) return false;
                      const d = new Date(a.startAtUtc);
                      return d.getHours() === hour && Math.floor(d.getMinutes() / 30) * 30 === minute;
                    });

                    return (
                      <div
                        key={`${staff.id}-${hour}-${minute}`}
                        onDragOver={(e) => handleDragOver(e, staff.id, hour, minute)}
                        onDrop={(e) => handleDrop(e, staff.id, hour, minute)}
                        className={`flex-1 min-w-[200px] border-r border-border-color last:border-r-0 p-1 relative transition-colors ${
                          isDragOver ? 'bg-primary-rose/10 border-2 border-dashed border-primary-rose' : ''
                        }`}
                      >
                        {cellAppointments.map((apt) => {
                          const duration = apt.durationMinutes || 30;
                          return (
                            <div
                              key={apt.id}
                              draggable={apt.status !== 'Cancelled'}
                              onDragStart={(e) => handleDragStart(e, apt)}
                              onClick={() => setSelectedApt(apt)}
                              className={`p-2 rounded-xl border shadow-xs cursor-pointer select-none transition-all hover:scale-[1.01] hover:shadow-md mb-1 relative group ${getStatusColor(apt.status)}`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(apt.status)}`} />
                                  <span className="text-xs font-bold truncate">
                                    {apt.customerName}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono font-bold shrink-0">
                                  ₹{apt.price}
                                </span>
                              </div>

                              <div className="text-[11px] font-medium text-deep-plum/80 truncate">
                                {apt.serviceName}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-muted mt-1">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {duration} mins
                                </span>
                                <span className="capitalize font-semibold">
                                  {apt.paymentStatus === 'Paid' ? '✓ Paid' : apt.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Appointment Action Modal */}
        {selectedApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-deep-plum/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-border-color animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between pb-4 border-b border-border-color">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot(selectedApt.status)}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Appointment #{selectedApt.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      selectedApt.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedApt.paymentStatus}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-bold text-deep-plum mt-1">
                    {selectedApt.serviceName}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedApt(null)}
                  className="p-1 text-muted hover:text-deep-plum rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted" />
                    <div>
                      <p className="font-semibold text-deep-plum">{selectedApt.customerName}</p>
                      <p className="text-xs text-muted">{selectedApt.customerEmail || 'No email'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openDossier(selectedApt.customerId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-rose-tint text-primary-rose rounded-lg hover:bg-primary-rose hover:text-white transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Open Dossier
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-muted block mb-0.5">Stylist / Staff</span>
                    <span className="font-bold text-deep-plum">{selectedApt.staffName}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-muted block mb-0.5">Total Price</span>
                    <span className="font-bold text-deep-plum text-sm">₹{selectedApt.price}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl text-xs flex items-center justify-between">
                  <div>
                    <span className="text-muted block mb-0.5">Scheduled Slot</span>
                    <span className="font-semibold text-deep-plum">
                      {new Date(selectedApt.startAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedApt.endAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({selectedApt.durationMinutes} mins)
                    </span>
                  </div>
                  <span className="text-muted">
                    {new Date(selectedApt.startAtUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-border-color space-y-2">
                <div className="flex gap-2">
                  {selectedApt.status !== 'Completed' && (
                    <button
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(selectedApt.id, 'Completed')}
                      className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      Mark Completed
                    </button>
                  )}
                  {selectedApt.status === 'Pending' && (
                    <button
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(selectedApt.id, 'Confirmed')}
                      className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  )}
                  {selectedApt.status !== 'Cancelled' && (
                    <button
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(selectedApt.id, 'Cancelled')}
                      className="py-2.5 px-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  onClick={() => navigate('/admin/pos')}
                  className="w-full py-2.5 bg-gray-100 text-deep-plum text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Open Desk Cashier (POS)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slide-over Client Consultation Dossier Drawer */}
        <ClientDossierDrawer
          customerId={dossierCustomerId}
          isOpen={dossierOpen}
          onClose={() => setDossierOpen(false)}
          staffList={staffList}
        />

      </div>
    </DashboardLayout>
  );
}
