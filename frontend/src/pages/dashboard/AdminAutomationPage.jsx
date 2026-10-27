import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { automationService } from '../../services/automationService';
import { 
  Zap, 
  MessageSquare, 
  Clock, 
  Send, 
  Gift, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Star, 
  Users, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  Smartphone, 
  Sparkles,
  Percent,
  X,
  ExternalLink
} from 'lucide-react';

const DAYS = [
  { key: 'Monday', label: 'Mon' },
  { key: 'Tuesday', label: 'Tue' },
  { key: 'Wednesday', label: 'Wed' },
  { key: 'Thursday', label: 'Thu' },
  { key: 'Friday', label: 'Fri' },
  { key: 'Saturday', label: 'Sat' },
  { key: 'Sunday', label: 'Sun' }
];

export default function AdminAutomationPage() {
  const [activeTab, setActiveTab] = useState('reminders'); // 'reminders' | 'reengagement' | 'discounts'

  // Tab 1: WhatsApp & SMS Reminders State
  const [messageLogs, setMessageLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Tab 2: Re-Engagement State
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [couponCode, setCouponCode] = useState('MISSYOU10');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [channel, setChannel] = useState('WhatsApp');
  const [customMsg, setCustomMsg] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(null);

  // Tab 3: Off-Peak Dynamic Pricing State
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDays, setRuleDays] = useState(['Tuesday', 'Wednesday']);
  const [ruleStartTime, setRuleStartTime] = useState('10:00');
  const [ruleEndTime, setRuleEndTime] = useState('13:00');
  const [ruleDiscount, setRuleDiscount] = useState(20);
  const [savingRule, setSavingRule] = useState(false);

  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (activeTab === 'reminders') loadLogs();
    if (activeTab === 'reengagement') loadCandidates();
    if (activeTab === 'discounts') loadRules();
  }, [activeTab]);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await automationService.getMessageLogs(40);
      setMessageLogs(data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to fetch automation message logs.' });
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const data = await automationService.getReEngagementCandidates(6);
      setCandidates(data || []);
      // Pre-select all candidates
      setSelectedCandidates((data || []).map(c => c.customerId));
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to fetch lapsed client candidates.' });
    } finally {
      setLoadingCandidates(false);
    }
  };

  const loadRules = async () => {
    try {
      setLoadingRules(true);
      const data = await automationService.getOffPeakRules();
      setRules(data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to fetch off-peak pricing rules.' });
    } finally {
      setLoadingRules(false);
    }
  };

  const handleToggleCandidate = (id) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCandidates = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(c => c.customerId));
    }
  };

  const handleDispatchReEngagement = async () => {
    if (selectedCandidates.length === 0) {
      setFeedback({ type: 'error', text: 'Please select at least one client to re-engage.' });
      return;
    }

    try {
      setDispatching(true);
      setFeedback(null);
      const res = await automationService.dispatchReEngagement({
        customerIds: selectedCandidates,
        channel,
        couponCode: couponCode || 'MISSYOU10',
        discountPercentage: Number(discountPercent),
        customMessage: customMsg
      });

      setDispatchSuccess(res);
      setFeedback({
        type: 'success',
        text: `Successfully queued ${res.successfullySent} retention messages with coupon ${res.couponCode}!`
      });
      loadCandidates();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to dispatch re-engagement campaign.' });
    } finally {
      setDispatching(false);
    }
  };

  const handleToggleDay = (dayKey) => {
    setRuleDays(prev => 
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      setFeedback({ type: 'error', text: 'Rule name is required.' });
      return;
    }
    if (ruleDays.length === 0) {
      setFeedback({ type: 'error', text: 'Please select at least one active day of the week.' });
      return;
    }

    try {
      setSavingRule(true);
      await automationService.createOffPeakRule({
        name: ruleName.trim(),
        daysOfWeek: ruleDays.join(','),
        startTime: ruleStartTime,
        endTime: ruleEndTime,
        discountPercentage: Number(ruleDiscount),
        isActive: true
      });

      setFeedback({ type: 'success', text: 'Off-peak dynamic discount rule created successfully!' });
      setShowRuleModal(false);
      setRuleName('');
      loadRules();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create off-peak discount rule.' });
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to remove this dynamic discount rule?')) return;
    try {
      await automationService.deleteOffPeakRule(id);
      setFeedback({ type: 'success', text: 'Discount rule deleted.' });
      loadRules();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete rule.' });
    }
  };

  const handleToggleRuleStatus = async (rule) => {
    try {
      await automationService.updateOffPeakRule(rule.id, {
        name: rule.name,
        daysOfWeek: rule.daysOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        discountPercentage: rule.discountPercentage,
        isActive: !rule.isActive
      });
      loadRules();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to update rule status.' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Retention Engine & Dynamic Yield</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-deep-plum">
              Automations & Client Retention
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl">
              Deliver automated multi-channel reminders (24h, 2h, 1h review link), re-engage 6-week lapsed clients, and maximize seat occupancy with dynamic flash discounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'reminders') loadLogs();
                if (activeTab === 'reengagement') loadCandidates();
                if (activeTab === 'discounts') loadRules();
              }}
              className="px-4 py-2 bg-ivory hover:bg-soft-blush text-deep-plum border border-border-color rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between animate-fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-color pb-3">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'reminders'
                ? 'bg-deep-plum text-white shadow-xs'
                : 'bg-white text-muted hover:text-deep-plum border border-border-color'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp & SMS Cadence</span>
          </button>

          <button
            onClick={() => setActiveTab('reengagement')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'reengagement'
                ? 'bg-deep-plum text-white shadow-xs'
                : 'bg-white text-muted hover:text-deep-plum border border-border-color'
            }`}
          >
            <Gift className="w-4 h-4 text-primary-rose" />
            <span>"We Miss You" Campaigns</span>
            {candidates.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary-rose text-white text-[10px]">
                {candidates.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'discounts'
                ? 'bg-deep-plum text-white shadow-xs'
                : 'bg-white text-muted hover:text-deep-plum border border-border-color'
            }`}
          >
            <Percent className="w-4 h-4 text-accent-gold" />
            <span>Off-Peak / Flash Discounts</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: WHATSAPP & SMS CADENCE                                             */}
        {/* ========================================================================= */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 animate-fade-in">
            {/* Visual Cadence Flow */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs">
              <div className="mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-rose">
                  Multi-Channel Notification Cadence
                </span>
                <h3 className="text-lg font-serif font-bold text-deep-plum mt-0.5">
                  High-Conversion Appointment Touchpoints (98% Open Rate)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {/* 24 Hours */}
                <div className="p-5 rounded-2xl bg-ivory border border-border-color space-y-3 relative hover:border-primary-rose/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Step 1 • 24H Before
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      WhatsApp & SMS
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">Confirmation & Address Link</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Sends interactive calendar reminder with salon location, assigned specialist, and 1-tap confirmation button.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-border-color/80 text-[11px] font-mono text-muted/90">
                    "Reminder: Your appointment at [Salon] is tomorrow at 2:00 PM. Tap to confirm: [Link]"
                  </div>
                </div>

                {/* 2 Hours */}
                <div className="p-5 rounded-2xl bg-ivory border border-border-color space-y-3 relative hover:border-primary-rose/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Step 2 • 2H Before
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      SMS & WhatsApp
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">Live Directions & Arrival Alert</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Instant reminder with one-click Google Maps navigation and salon entrance/parking details.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-border-color/80 text-[11px] font-mono text-muted/90">
                    "See you in 2 hours! Get live directions: https://maps.google.com/?q=[SalonAddress]"
                  </div>
                </div>

                {/* 1 Hour After */}
                <div className="p-5 rounded-2xl bg-ivory border border-border-color space-y-3 relative hover:border-primary-rose/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Step 3 • 1H After Visit
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      WhatsApp Review
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">Thank You & 1-Tap Review</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Warm thank-you message inviting 5-star Google & SalonBook reviews while satisfaction is at its peak.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-border-color/80 text-[11px] font-mono text-muted/90">
                    "Thank you for visiting today! How was your service? Leave a quick review: [ReviewLink]"
                  </div>
                </div>
              </div>
            </div>

            {/* Live Message Dispatch Logs */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-deep-plum">Recent Automated Message Logs</h3>
                  <p className="text-xs text-muted">Audited messages dispatched via WhatsApp, SMS, and Email.</p>
                </div>
                <span className="text-xs text-muted font-medium">Showing latest {messageLogs.length} logs</span>
              </div>

              {loadingLogs ? (
                <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary-rose" />
                  <span>Loading automated message history...</span>
                </div>
              ) : messageLogs.length === 0 ? (
                <div className="p-8 text-center bg-ivory rounded-2xl border border-border-color text-xs text-muted">
                  No automated reminder messages logged yet. Messages trigger automatically when appointments are created or completed.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border-color text-muted font-semibold">
                        <th className="pb-3 pr-4">Recipient</th>
                        <th className="pb-3 px-4">Channel</th>
                        <th className="pb-3 px-4">Trigger / Subject</th>
                        <th className="pb-3 px-4">Message Snippet</th>
                        <th className="pb-3 px-4">Status</th>
                        <th className="pb-3 pl-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/50">
                      {messageLogs.map(log => (
                        <tr key={log.id} className="hover:bg-soft-blush/30 transition-colors">
                          <td className="py-3 pr-4">
                            <p className="font-bold text-deep-plum">{log.recipientName || 'Client'}</p>
                            <p className="text-[11px] text-muted font-mono">{log.recipientContact}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.channel === 'WhatsApp' ? 'bg-emerald-100 text-emerald-800' :
                              log.channel === 'SMS' ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-deep-plum">{log.subject || log.type}</span>
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-muted font-mono text-[11px]">
                            {log.message}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                              {log.status || 'Sent'}
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-muted whitespace-nowrap text-[11px]">
                            {new Date(log.createdAtUtc).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: "WE MISS YOU" RE-ENGAGEMENT CAMPAIGNS                              */}
        {/* ========================================================================= */}
        {activeTab === 'reengagement' && (
          <div className="space-y-6 animate-fade-in">
            {/* Explainer Banner */}
            <div className="bg-gradient-to-r from-deep-plum via-deep-plum/95 to-primary-rose text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="max-w-2xl space-y-2">
                <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold uppercase tracking-wider text-rose-tint">
                  6-Week Hair Cycle Retention
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold">
                  Automated "We Miss You" Campaigns
                </h3>
                <p className="text-xs sm:text-sm text-soft-blush/90 leading-relaxed">
                  Acquiring a new client costs 5x more than retaining an existing one. We monitor your client roster and flag any customer who hasn't re-booked in 6+ weeks (average hair regrowth cycle).
                </p>
              </div>
            </div>

            {/* Campaign Config & Candidates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Candidates Table (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-color pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">
                      Lapsed Clients ({candidates.length} Detected)
                    </h4>
                    <p className="text-[11px] text-muted">
                      Clients whose last completed appointment was &gt; 6 weeks ago.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllCandidates}
                    className="text-xs text-primary-rose font-bold hover:underline self-start sm:self-auto"
                  >
                    {selectedCandidates.length === candidates.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {loadingCandidates ? (
                  <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-rose" />
                    <span>Scanning client history for lapsed appointments...</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-8 text-center bg-ivory rounded-2xl border border-border-color text-xs text-muted space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                    <p className="font-semibold text-deep-plum">Outstanding Retention!</p>
                    <p>No clients have been inactive for more than 6 weeks.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border-color text-muted font-semibold">
                          <th className="pb-2 pr-3 w-8"></th>
                          <th className="pb-2 px-3">Client</th>
                          <th className="pb-2 px-3">Last Visit</th>
                          <th className="pb-2 px-3">Lapsed Time</th>
                          <th className="pb-2 px-3">Last Treatment</th>
                          <th className="pb-2 pl-3">Visits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color/50">
                        {candidates.map(cand => {
                          const isSelected = selectedCandidates.includes(cand.customerId);
                          return (
                            <tr 
                              key={cand.customerId} 
                              onClick={() => handleToggleCandidate(cand.customerId)}
                              className={`cursor-pointer transition-colors ${isSelected ? 'bg-soft-blush/40' : 'hover:bg-ivory'}`}
                            >
                              <td className="py-3 pr-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-primary-rose border-border-color focus:ring-primary-rose"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <p className="font-bold text-deep-plum">{cand.customerName}</p>
                                <p className="text-[10px] text-muted">{cand.customerPhone || cand.customerEmail}</p>
                              </td>
                              <td className="py-3 px-3 text-muted">
                                {new Date(cand.lastVisitDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                  {cand.weeksSinceLastVisit} weeks ago
                                </span>
                              </td>
                              <td className="py-3 px-3 text-muted max-w-[120px] truncate">
                                {cand.lastServiceName || 'Hair Styling'}
                              </td>
                              <td className="py-3 pl-3 font-semibold text-deep-plum">
                                {cand.totalPastVisits} visits
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: Campaign Dispatch Configuration (4 cols) */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-deep-plum">Campaign Configuration</h4>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    Loyalty Promo Code
                  </label>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-ivory border border-border-color rounded-xl text-xs font-mono font-bold text-deep-plum uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    Discount Percentage
                  </label>
                  <div className="flex items-center gap-2">
                    {[10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountPercent(pct)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          discountPercent === pct
                            ? 'bg-primary-rose text-white border-primary-rose'
                            : 'bg-ivory border-border-color text-deep-plum'
                        }`}
                      >
                        {pct}% OFF
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    Delivery Channel
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-ivory border border-border-color rounded-xl text-xs font-medium text-deep-plum"
                  >
                    <option value="WhatsApp">WhatsApp (Recommended • 98% Open Rate)</option>
                    <option value="SMS">SMS Text Message</option>
                    <option value="Email">Email Newsletter</option>
                    <option value="MultiChannel">Multi-Channel (WhatsApp + SMS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    Message Copy Preview
                  </label>
                  <div className="p-3 rounded-2xl bg-ivory border border-border-color/80 text-[11px] text-muted space-y-1 font-mono">
                    <p>✨ "We miss having you in our chair! It's been over 6 weeks since your last visit. Enjoy <strong>{discountPercent}% OFF</strong> your next reservation with code <strong>{couponCode}</strong>."</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDispatchReEngagement}
                  disabled={dispatching || selectedCandidates.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-deep-plum to-primary-rose text-white text-xs font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {dispatching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Campaign...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch to {selectedCandidates.length} Selected Clients</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: OFF-PEAK / FLASH DISCOUNTS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'discounts' && (
          <div className="space-y-6 animate-fade-in">
            {/* Yield Management Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent-gold">
                  Seat Occupancy Optimizer
                </span>
                <h3 className="text-lg font-serif font-bold text-deep-plum">
                  Dynamic Off-Peak Pricing Rules
                </h3>
                <p className="text-xs text-muted max-w-xl">
                  Salons typically sit at 25-35% occupancy on Tuesday and Wednesday mornings. Configure automated discounts during slow periods to drive bookings and maximize seat utilization.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRuleModal(true)}
                className="px-4 py-2.5 bg-deep-plum text-white text-xs font-bold rounded-2xl hover:bg-deep-plum/90 shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Flash Discount Rule</span>
              </button>
            </div>

            {/* Rules Grid */}
            {loadingRules ? (
              <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary-rose" />
                <span>Loading active dynamic pricing rules...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-border-color text-xs text-muted space-y-2">
                <Tag className="w-8 h-8 text-muted mx-auto opacity-50" />
                <p className="font-bold text-deep-plum text-sm">No Off-Peak Rules Configured</p>
                <p className="max-w-md mx-auto">
                  Add your first dynamic pricing rule (e.g. 20% off all Tuesday & Wednesday slots between 10:00 AM - 1:00 PM).
                </p>
                <button
                  type="button"
                  onClick={() => setShowRuleModal(true)}
                  className="mt-3 px-4 py-2 bg-primary-rose text-white rounded-xl text-xs font-semibold"
                >
                  Create First Rule
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rules.map(rule => (
                  <div 
                    key={rule.id}
                    className="bg-white rounded-3xl p-5 border border-border-color shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rule.isActive 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {rule.isActive ? 'Active Rule' : 'Paused'}
                        </span>

                        <span className="text-sm font-bold text-primary-rose">
                          {rule.discountPercentage}% OFF
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-deep-plum mt-2">
                        {rule.name}
                      </h4>

                      <div className="mt-3 space-y-1.5 text-xs text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-rose" />
                          <span>{rule.daysOfWeek.split(',').join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary-rose" />
                          <span>{rule.startTime} - {rule.endTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border-color/60">
                      <button
                        type="button"
                        onClick={() => handleToggleRuleStatus(rule)}
                        className={`text-xs font-semibold transition-colors ${
                          rule.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        {rule.isActive ? 'Pause Rule' : 'Activate Rule'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-muted hover:text-rose-600 rounded-lg transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Rule Modal */}
            {showRuleModal && (
              <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-border-color shadow-2xl relative">
                  <button
                    onClick={() => setShowRuleModal(false)}
                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-soft-blush text-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="mb-5">
                    <span className="px-3 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Dynamic Pricing Rule
                    </span>
                    <h3 className="text-xl font-serif font-bold text-deep-plum mt-1">
                      New Off-Peak Discount Rule
                    </h3>
                  </div>

                  <form onSubmit={handleCreateRule} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-1">
                        Rule Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Weekday Midday Flash Sale"
                        value={ruleName}
                        onChange={(e) => setRuleName(e.target.value)}
                        className="w-full px-3 py-2.5 bg-ivory border border-border-color rounded-2xl text-xs text-deep-plum"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-1.5">
                        Active Days of Week
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS.map(d => {
                          const isSelected = ruleDays.includes(d.key);
                          return (
                            <button
                              key={d.key}
                              type="button"
                              onClick={() => handleToggleDay(d.key)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isSelected 
                                  ? 'bg-deep-plum text-white border-deep-plum' 
                                  : 'bg-ivory text-muted border-border-color hover:border-dusty-rose'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={ruleStartTime}
                          onChange={(e) => setRuleStartTime(e.target.value)}
                          className="w-full px-3 py-2 bg-ivory border border-border-color rounded-2xl text-xs font-mono text-deep-plum"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={ruleEndTime}
                          onChange={(e) => setRuleEndTime(e.target.value)}
                          className="w-full px-3 py-2 bg-ivory border border-border-color rounded-2xl text-xs font-mono text-deep-plum"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-deep-plum mb-1">
                        Discount Percentage (% OFF)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="80"
                        value={ruleDiscount}
                        onChange={(e) => setRuleDiscount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-ivory border border-border-color rounded-2xl text-xs font-bold text-deep-plum"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowRuleModal(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-deep-plum"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingRule}
                        className="px-6 py-2.5 bg-primary-rose text-white text-xs font-bold rounded-2xl shadow-xs hover:bg-primary-rose/90 transition-all flex items-center gap-1.5"
                      >
                        {savingRule && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Discount Rule</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

