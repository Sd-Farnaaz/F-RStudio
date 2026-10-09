import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { staffService } from '../../services/staffService';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';

const DAYS = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' }
];

const DEFAULT_SCHEDULE = DAYS.map(day => ({
  dayOfWeek: day.id,
  isWorkingDay: day.id !== 0 && day.id !== 6, // Mon-Fri default
  startTime: '09:00',
  endTime: '18:00',
  breaks: []
}));

export default function StaffSchedulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const staffData = await staffService.getStaffById(id);
      setStaff(staffData);

      // If staff has schedules directly in staffResponse, use it. 
      // Or fetch from the dedicated schedule endpoint.
      let schedData = null;
      try {
        schedData = await staffService.getStaffSchedule(id);
      } catch (e) {
        // Fallback to staffData if it embeds it or if not initialized
        schedData = staffData.schedules;
      }

      // Map backend data or use defaults
      const loadedSchedule = DAYS.map(day => {
        const existing = (schedData || []).find(s => s.dayOfWeek === day.id);
        if (existing) {
          return {
            dayOfWeek: day.id,
            isWorkingDay: existing.isWorkingDay,
            startTime: existing.startTime.substring(0, 5), // '09:00:00' -> '09:00'
            endTime: existing.endTime.substring(0, 5),
            breaks: (existing.breaks || []).map(b => ({
              startTime: b.startTime.substring(0, 5),
              endTime: b.endTime.substring(0, 5),
              title: b.title || 'Break'
            }))
          };
        }
        return DEFAULT_SCHEDULE[day.id];
      });

      setSchedule(loadedSchedule);
      setIsDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load staff details.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = (dayId) => {
    setSchedule(prev => prev.map(d => 
      d.dayOfWeek === dayId ? { ...d, isWorkingDay: !d.isWorkingDay } : d
    ));
    setIsDirty(true);
  };

  const handleChangeTime = (dayId, field, value) => {
    setSchedule(prev => prev.map(d => 
      d.dayOfWeek === dayId ? { ...d, [field]: value } : d
    ));
    setIsDirty(true);
  };

  const handleAddBreak = (dayId) => {
    setSchedule(prev => prev.map(d => {
      if (d.dayOfWeek === dayId) {
        return {
          ...d,
          breaks: [...d.breaks, { startTime: '12:00', endTime: '13:00', title: 'Lunch Break' }]
        };
      }
      return d;
    }));
    setIsDirty(true);
  };

  const handleRemoveBreak = (dayId, breakIndex) => {
    setSchedule(prev => prev.map(d => {
      if (d.dayOfWeek === dayId) {
        return {
          ...d,
          breaks: d.breaks.filter((_, idx) => idx !== breakIndex)
        };
      }
      return d;
    }));
    setIsDirty(true);
  };

  const handleChangeBreak = (dayId, breakIndex, field, value) => {
    setSchedule(prev => prev.map(d => {
      if (d.dayOfWeek === dayId) {
        const newBreaks = [...d.breaks];
        newBreaks[breakIndex] = { ...newBreaks[breakIndex], [field]: value };
        return { ...d, breaks: newBreaks };
      }
      return d;
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    // Basic client-side validation
    for (const d of schedule) {
      if (d.isWorkingDay) {
        if (d.startTime >= d.endTime) {
          setError(`Invalid times on ${DAYS[d.dayOfWeek].name}: End time must be after start time.`);
          return;
        }
        for (const b of d.breaks) {
          if (b.startTime >= b.endTime) {
            setError(`Invalid break times on ${DAYS[d.dayOfWeek].name}.`);
            return;
          }
          if (b.startTime < d.startTime || b.endTime > d.endTime) {
            setError(`Break on ${DAYS[d.dayOfWeek].name} must be within working hours.`);
            return;
          }
        }
      }
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await staffService.updateStaffSchedule(id, { weeklySchedule: schedule });
      
      setSuccess('Schedule updated successfully!');
      setIsDirty(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleGoBack = (e) => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard?')) {
      e.preventDefault();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-border-color rounded animate-pulse" />
          <div className="h-[600px] bg-white rounded-xl border border-border-color animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!staff) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 bg-white border border-border-color rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-xl font-serif text-deep-plum mb-2">Staff member not found</h2>
          <Link to="/admin/staff" className="text-primary-rose hover:underline">Return to Staff List</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <Link onClick={handleGoBack} to="/admin/staff" className="inline-flex items-center text-sm font-medium text-muted hover:text-primary-rose mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Staff
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-deep-plum mb-1">Weekly Schedule</h1>
            <p className="text-sm text-muted">Manage regular working hours and breaks for <strong className="text-deep-plum">{staff.fullName}</strong>.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-6 py-2.5 bg-primary-rose text-white text-sm font-medium rounded-lg hover:bg-primary-rose/90 transition-all shadow-sm disabled:opacity-50 flex items-center shrink-0"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-center">
            <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" /> {success}
          </div>
        )}

        <div className="bg-white border border-border-color rounded-2xl shadow-sm overflow-hidden divide-y divide-border-color">
          {schedule.map((day, idx) => {
            const dayName = DAYS[day.dayOfWeek].name;
            return (
              <div key={day.dayOfWeek} className={`p-6 transition-colors ${!day.isWorkingDay ? 'bg-ivory/50' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={day.isWorkingDay} 
                        onChange={() => handleToggleDay(day.dayOfWeek)} 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-rose/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                    </label>
                    <span className={`font-medium w-24 ${day.isWorkingDay ? 'text-deep-plum' : 'text-muted'}`}>{dayName}</span>
                  </div>
                  {!day.isWorkingDay && <span className="text-sm text-muted">Off</span>}
                </div>

                {day.isWorkingDay && (
                  <div className="pl-14 space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted" />
                        <input 
                          type="time" 
                          required
                          value={day.startTime}
                          onChange={(e) => handleChangeTime(day.dayOfWeek, 'startTime', e.target.value)}
                          className="px-3 py-1.5 border border-border-color rounded-md text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/50 outline-none"
                        />
                      </div>
                      <span className="text-muted text-sm">to</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          required
                          value={day.endTime}
                          onChange={(e) => handleChangeTime(day.dayOfWeek, 'endTime', e.target.value)}
                          className="px-3 py-1.5 border border-border-color rounded-md text-sm text-deep-plum focus:ring-2 focus:ring-primary-rose/50 outline-none"
                        />
                      </div>
                    </div>

                    {/* Breaks */}
                    {day.breaks.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <p className="text-xs font-medium text-muted uppercase tracking-wider">Breaks</p>
                        {day.breaks.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-3 flex-wrap bg-soft-blush/30 p-2 rounded-md border border-border-color">
                            <input 
                              type="text" 
                              value={b.title}
                              onChange={(e) => handleChangeBreak(day.dayOfWeek, bIdx, 'title', e.target.value)}
                              placeholder="Break Title"
                              className="w-32 px-2 py-1 text-sm border border-border-color rounded focus:outline-none bg-white"
                            />
                            <input 
                              type="time" 
                              required
                              value={b.startTime}
                              onChange={(e) => handleChangeBreak(day.dayOfWeek, bIdx, 'startTime', e.target.value)}
                              className="px-2 py-1 text-sm border border-border-color rounded focus:outline-none bg-white"
                            />
                            <span className="text-muted text-sm">-</span>
                            <input 
                              type="time" 
                              required
                              value={b.endTime}
                              onChange={(e) => handleChangeBreak(day.dayOfWeek, bIdx, 'endTime', e.target.value)}
                              className="px-2 py-1 text-sm border border-border-color rounded focus:outline-none bg-white"
                            />
                            <button 
                              onClick={() => handleRemoveBreak(day.dayOfWeek, bIdx)}
                              className="p-1.5 text-danger hover:bg-red-50 rounded"
                              title="Remove break"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleAddBreak(day.dayOfWeek)}
                      className="text-xs font-medium text-primary-rose hover:text-deep-plum transition-colors flex items-center mt-2"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Break
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
