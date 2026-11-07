import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { automationService } from '../../services/automationService';
import { subscriptionService } from '../../services/subscriptionService';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  Clock, 
  Send, 
  Gift, 
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
  Sparkles,
  Percent,
  X,
  Mail,
  Lock,
  Server,
  Key,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  HelpCircle
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

const PRESETS = [
  {
    name: 'Brevo API (Port 443 - Railway Safe)',
    host: 'api.brevo.com',
    port: 443,
    ssl: true,
    help: 'Recommended for Railway! Uses Port 443 (HTTPS) with Brevo API key (xkeysib-...) to bypass SMTP port blocking.'
  },
  {
    name: 'Brevo SMTP (Port 587)',
    host: 'smtp-relay.brevo.com',
    port: 587,
    ssl: true,
    help: 'Default transactional relay for F&R Studio. (Note: Railway blocks Port 587 on Hobby/Free plans).'
  },
  {
    name: 'Google Gmail SMTP',
    host: 'smtp.gmail.com',
    port: 587,
    ssl: true,
    help: 'Requires Google Account 2-Step Verification and a 16-character App Password.'
  },
  {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    ssl: true,
    help: 'Username is "apikey" and password is your SendGrid Secret API Key.'
  }
];

export default function AdminAutomationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subscription Entitlement & Gating
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  // Active Tab: 'reminders' | 'reengagement' | 'discounts' | 'smtp'
  const [activeTab, setActiveTab] = useState('reminders');

  // Tab 1: Automated Email Reminders Cadence State
  const [messageLogs, setMessageLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Tab 2: Re-Engagement State
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [couponCode, setCouponCode] = useState('MISSYOU10');
  const [discountPercent, setDiscountPercent] = useState(10);
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

  // Tab 4: Email SMTP Configuration State
  const [smtpConfig, setSmtpConfig] = useState({
    isConfigured: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    senderEmail: '',
    senderName: '',
    smtpEnableSsl: true,
    hasPassword: false
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [loadingSmtp, setLoadingSmtp] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testRecipient, setTestRecipient] = useState(user?.email || '');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [feedback, setFeedback] = useState(null);

  // Check subscription entitlement
  const checkSubscription = useCallback(async () => {
    try {
      setLoadingSubscription(true);
      const sub = await subscriptionService.getSalonSubscription();
      setSubscription(sub);
    } catch (err) {
      console.warn('Could not verify subscription limits:', err);
    } finally {
      setLoadingSubscription(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const isStarterTier = subscription && (subscription.currentTier || '').toLowerCase() === 'starter';

  useEffect(() => {
    if (isStarterTier) return; // Do not fetch sub-data if gated

    if (activeTab === 'reminders') loadLogs();
    if (activeTab === 'reengagement') loadCandidates();
    if (activeTab === 'discounts') loadRules();
    if (activeTab === 'smtp') loadSmtp();
  }, [activeTab, isStarterTier]);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await automationService.getMessageLogs(40);
      setMessageLogs(data || []);
    } catch (err) {
      if (err.upgradeRequired) {
        checkSubscription();
      } else {
        setFeedback({ type: 'error', text: err.message || 'Failed to fetch automation message logs.' });
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const data = await automationService.getReEngagementCandidates(6);
      setCandidates(data || []);
      setSelectedCandidates((data || []).map(c => c.customerId));
    } catch (err) {
      if (err.upgradeRequired) {
        checkSubscription();
      } else {
        setFeedback({ type: 'error', text: err.message || 'Failed to fetch lapsed client candidates.' });
      }
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
      if (err.upgradeRequired) {
        checkSubscription();
      } else {
        setFeedback({ type: 'error', text: err.message || 'Failed to fetch off-peak pricing rules.' });
      }
    } finally {
      setLoadingRules(false);
    }
  };

  const loadSmtp = async () => {
    try {
      setLoadingSmtp(true);
      const data = await automationService.getSmtpConfig();
      if (data) {
        setSmtpConfig(prev => ({
          ...prev,
          isConfigured: data.isConfigured,
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          smtpUsername: data.smtpUsername || '',
          smtpPassword: '', // Don't wipe masked server secret unless typed
          senderEmail: data.senderEmail || '',
          senderName: data.senderName || '',
          smtpEnableSsl: data.smtpEnableSsl ?? true,
          hasPassword: data.hasPassword
        }));
        if (!testRecipient && user?.email) {
          setTestRecipient(user.email);
        }
      }
    } catch (err) {
      if (err.upgradeRequired) {
        checkSubscription();
      } else {
        setFeedback({ type: 'error', text: err.message || 'Failed to fetch SMTP configuration.' });
      }
    } finally {
      setLoadingSmtp(false);
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
        channel: 'Email', // Automated Email dispatch
        couponCode: couponCode || 'MISSYOU10',
        discountPercentage: Number(discountPercent),
        customMessage: customMsg
      });

      setDispatchSuccess(res);
      setFeedback({
        type: 'success',
        text: `Successfully queued ${res.successfullySent} automated retention emails with coupon ${res.couponCode}!`
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

  // SMTP Actions
  const handleApplyPreset = (preset) => {
    setSmtpConfig(prev => ({
      ...prev,
      smtpHost: preset.host,
      smtpPort: preset.port,
      smtpEnableSsl: preset.ssl
    }));
    setFeedback({
      type: 'success',
      text: `Applied preset for ${preset.name}. ${preset.help}`
    });
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    if (!smtpConfig.smtpHost.trim()) {
      setFeedback({ type: 'error', text: 'SMTP Server / Host is required.' });
      return;
    }

    let finalUsername = smtpConfig.smtpUsername?.trim() || null;
    let finalSenderEmail = smtpConfig.senderEmail?.trim() || null;

    // Brevo auto-correction: login username is xxxx@smtp-brevo.com, personal email is sender email
    if (smtpConfig.smtpHost.includes('brevo.com')) {
      if (finalUsername && !finalUsername.toLowerCase().endsWith('@smtp-brevo.com')) {
        if (!finalSenderEmail) {
          finalSenderEmail = finalUsername;
        }
        finalUsername = 'c165e2001@smtp-brevo.com';
      }
    }

    try {
      setSavingSmtp(true);
      setFeedback(null);
      const res = await automationService.updateSmtpConfig({
        smtpHost: smtpConfig.smtpHost.trim(),
        smtpPort: Number(smtpConfig.smtpPort) || 587,
        smtpUsername: finalUsername,
        smtpPassword: smtpConfig.smtpPassword?.trim() || null, // Will preserve existing secret if blank
        senderEmail: finalSenderEmail,
        senderName: smtpConfig.senderName?.trim() || null,
        smtpEnableSsl: Boolean(smtpConfig.smtpEnableSsl),
        isConfigured: Boolean(smtpConfig.isConfigured)
      });

      setSmtpConfig(prev => ({
        ...prev,
        smtpUsername: finalUsername || prev.smtpUsername,
        senderEmail: finalSenderEmail || prev.senderEmail,
        isConfigured: res.isConfigured,
        hasPassword: res.hasPassword,
        smtpPassword: '' // Clear input field for security
      }));

      setFeedback({
        type: 'success',
        text: 'Email SMTP configuration saved successfully! You can verify connectivity below.'
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save SMTP configuration.' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async (e) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a recipient email address for the test.' });
      return;
    }

    if (!smtpConfig.hasPassword && !smtpConfig.smtpPassword?.trim()) {
      const msg = 'Please enter your Brevo SMTP Master Key in the "Email Secret / Password" field and click Save SMTP Settings before testing.';
      setFeedback({ type: 'error', text: msg });
      setTestResult({ success: false, message: msg });
      return;
    }

    let finalUsername = smtpConfig.smtpUsername?.trim() || null;
    let finalSenderEmail = smtpConfig.senderEmail?.trim() || 
      (smtpConfig.smtpUsername?.includes('@') ? smtpConfig.smtpUsername.trim() : user?.email || 'rufnixstudio@gmail.com');

    // Brevo auto-correction for test
    if (smtpConfig.smtpHost?.includes('brevo.com')) {
      if (finalUsername && !finalUsername.toLowerCase().endsWith('@smtp-brevo.com')) {
        if (!smtpConfig.senderEmail?.trim()) {
          finalSenderEmail = finalUsername;
        }
        finalUsername = 'c165e2001@smtp-brevo.com';
      }
    }

    try {
      setTestingSmtp(true);
      setTestResult(null);

      const res = await automationService.testSmtpConfig({
        recipientEmail: testRecipient.trim(),
        smtpHost: smtpConfig.smtpHost?.trim() || null,
        smtpPort: Number(smtpConfig.smtpPort) || null,
        smtpUsername: finalUsername,
        smtpPassword: smtpConfig.smtpPassword?.trim() || null,
        senderEmail: finalSenderEmail,
        senderName: smtpConfig.senderName?.trim() || user?.salonName || 'F&R Beauty Studio',
        smtpEnableSsl: smtpConfig.smtpEnableSsl
      });

      setTestResult({ success: true, message: res.message });
      setFeedback({ type: 'success', text: res.message });
    } catch (err) {
      const msg = err.data?.message || err.data?.Message || err.message || 'SMTP Connection test failed.';
      setTestResult({ success: false, message: msg });
      setFeedback({ type: 'error', text: msg });
    } finally {
      setTestingSmtp(false);
    }
  };

  // =========================================================================
  // GATING VIEW: FOR SALONS ON STARTER TRIAL (Plan Access Enforcement)
  // =========================================================================
  if (!loadingSubscription && isStarterTier) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in">
          
          {/* Locked Hero Card */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-border-color shadow-sm text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary-rose/10 flex items-center justify-center text-primary-rose mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Available in Growth Studio & Pro Plans</span>
            </div>

            <h1 className="text-3xl font-serif font-bold text-deep-plum mb-3">
              Unlock Automations & Client Retention
            </h1>

            <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed mb-6">
              Automated 24-hour and 2-hour appointment emails, 1-tap review invitations, 6-week lapsed client re-engagement, dynamic off-peak discounts, and custom Email SMTP relay are available on the <strong>Growth Studio</strong> and <strong>Pro</strong> plans.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/billing')}
                className="w-full sm:w-auto px-7 py-3 bg-primary-rose hover:bg-primary-rose/90 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Upgrade to Growth Studio (₹1,499/mo)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/admin/billing"
                className="w-full sm:w-auto px-5 py-3 bg-ivory text-deep-plum hover:bg-soft-blush border border-border-color text-xs font-semibold rounded-xl transition-colors text-center"
              >
                Compare All Plans
              </Link>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-border-color space-y-2">
              <div className="flex items-center gap-2 text-primary-rose font-bold text-sm">
                <Mail className="w-4 h-4" />
                <span>Automated Email Reminders (24H & 2H)</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Slash no-shows by up to 85% with rich HTML emails including interactive calendar links, directions, and specialist notes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-color space-y-2">
              <div className="flex items-center gap-2 text-primary-rose font-bold text-sm">
                <Gift className="w-4 h-4" />
                <span>"We Miss You" 6-Week Retention Engine</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Automatically identify clients who haven't re-booked in 6+ weeks and dispatch tailored promotional loyalty rewards.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-color space-y-2">
              <div className="flex items-center gap-2 text-primary-rose font-bold text-sm">
                <Percent className="w-4 h-4" />
                <span>Dynamic Flash Discounts & Off-Peak Yield</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Fill slow weekday salon hours with automated dynamic pricing rules to maximize chair occupancy and revenue.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border-color space-y-2">
              <div className="flex items-center gap-2 text-primary-rose font-bold text-sm">
                <Server className="w-4 h-4" />
                <span>Custom Email SMTP Configuration</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Connect your salon's own SMTP provider (Brevo, Gmail, SendGrid, Amazon SES) for dedicated branded email dispatch.
              </p>
            </div>
          </div>

        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-soft-blush border border-dusty-rose/40 text-primary-rose text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Retention Engine & Automated Email Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-deep-plum">
              Automations & Client Retention
            </h1>
            <p className="text-xs sm:text-sm text-muted max-w-2xl">
              Deliver automated multi-step email reminders (24h, 2h, post-visit review link), re-engage 6-week lapsed clients, configure custom Email SMTP, and maximize seat occupancy with dynamic flash discounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activeTab === 'reminders') loadLogs();
                if (activeTab === 'reengagement') loadCandidates();
                if (activeTab === 'discounts') loadRules();
                if (activeTab === 'smtp') loadSmtp();
              }}
              className="px-4 py-2 bg-ivory hover:bg-soft-blush text-deep-plum border border-border-color rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-color pb-3">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reminders'
                ? 'bg-deep-plum text-white shadow-xs'
                : 'bg-white text-muted hover:text-deep-plum border border-border-color'
            }`}
          >
            <Mail className="w-4 h-4 text-rose-300" />
            <span>Automated Email Cadence</span>
          </button>

          <button
            onClick={() => setActiveTab('reengagement')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
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
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'discounts'
                ? 'bg-deep-plum text-white shadow-xs'
                : 'bg-white text-muted hover:text-deep-plum border border-border-color'
            }`}
          >
            <Percent className="w-4 h-4 text-accent-gold" />
            <span>Off-Peak / Flash Discounts</span>
          </button>

          <button
            onClick={() => setActiveTab('smtp')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'smtp'
                ? 'bg-deep-plum text-white shadow-xs'
                : 'bg-white text-muted hover:text-deep-plum border border-border-color'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-500" />
            <span>Email SMTP Configuration</span>
            {smtpConfig.isConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: AUTOMATED EMAIL CADENCE                                            */}
        {/* ========================================================================= */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 animate-fade-in">
            {/* Visual Cadence Flow */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs">
              <div className="mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-rose">
                  Automated Email Notification Cadence
                </span>
                <h3 className="text-lg font-serif font-bold text-deep-plum mt-0.5">
                  High-Touch Appointment Reminders & Review Touchpoints
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {/* 24 Hours */}
                <div className="p-5 rounded-2xl bg-ivory border border-border-color space-y-3 relative hover:border-primary-rose/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Step 1 • 24H Before
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Automated Email
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">Confirmation & Salon Directions</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Sends rich HTML email reminder with interactive calendar confirmation, Google Maps directions, and assigned specialist details.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-border-color/80 text-[11px] font-mono text-muted/90">
                    "Subject: Reminder: Upcoming Appointment Tomorrow at [SalonName]"
                  </div>
                </div>

                {/* 2 Hours */}
                <div className="p-5 rounded-2xl bg-ivory border border-border-color space-y-3 relative hover:border-primary-rose/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Step 2 • 2H Before
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Automated Email
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">Live Directions & Arrival Alert</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Timely arrival email reminder with one-click Google Maps navigation, parking notes, and salon entrance details.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-border-color/80 text-[11px] font-mono text-muted/90">
                    "Subject: See you in 2 hours! Live directions to [SalonName]"
                  </div>
                </div>

                {/* 1 Hour After */}
                <div className="p-5 rounded-2xl bg-ivory border border-border-color space-y-3 relative hover:border-primary-rose/40 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-soft-blush text-primary-rose text-[10px] font-bold uppercase tracking-wider">
                      Step 3 • 1H After Visit
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Automated Email
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-deep-plum">Post-Visit Thank You & Review Invite</h4>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Luxury email inviting 5-star Google & F&R Beauty Studio verified reviews right while client satisfaction is at its peak.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-border-color/80 text-[11px] font-mono text-muted/90">
                    "Subject: Thank you for visiting [SalonName]! Leave a 1-tap review"
                  </div>
                </div>
              </div>
            </div>

            {/* Live Message Dispatch Logs */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-deep-plum">Recent Automated Notification Logs</h3>
                  <p className="text-xs text-muted">Audited automated emails and in-app notifications dispatched to clients.</p>
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
                        <th className="pb-3 px-4">Subject</th>
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
                              log.channel === 'Email' ? 'bg-purple-100 text-purple-800' :
                              log.channel === 'InApp' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-deep-plum">{log.subject || log.type}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === 'Sent' ? 'bg-emerald-100 text-emerald-800' :
                              log.status === 'Skipped' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 pl-4 text-muted font-mono text-[11px]">
                            {log.sentAtUtc ? new Date(log.sentAtUtc).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'}
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
                  6-Week Hair & Skin Cycle Retention
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold">
                  Automated Email "We Miss You" Campaigns
                </h3>
                <p className="text-xs sm:text-sm text-soft-blush/90 leading-relaxed">
                  Acquiring a new client costs 5x more than retaining an existing one. We identify customers who haven't visited in 6+ weeks and dispatch tailored email promotions directly to their inbox.
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
                    className="text-xs text-primary-rose font-bold hover:underline self-start sm:self-auto cursor-pointer"
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
                                <p className="text-[10px] text-muted">{cand.customerEmail || cand.customerPhone}</p>
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
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
                  <div className="flex items-center gap-2.5 p-3 bg-ivory rounded-xl border border-border-color text-xs text-deep-plum font-semibold">
                    <Mail className="w-4 h-4 text-primary-rose shrink-0" />
                    <span>Automated Email Dispatch (Direct to Inbox)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    Email Message Preview
                  </label>
                  <div className="p-3 rounded-2xl bg-ivory border border-border-color/80 text-[11px] text-muted space-y-1 font-mono">
                    <p>❤️ "We miss you! It's been a while since your last visit. Treat yourself with <strong>{discountPercent}% OFF</strong> your next reservation using code <strong>'{couponCode}'</strong>."</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDispatchReEngagement}
                  disabled={dispatching || selectedCandidates.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-deep-plum to-primary-rose text-white text-xs font-bold rounded-2xl shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  {dispatching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Campaign Emails...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch to {selectedCandidates.length} Selected Clients</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: OFF-PEAK DYNAMIC FLASH DISCOUNTS                                   */}
        {/* ========================================================================= */}
        {activeTab === 'discounts' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-border-color shadow-xs">
              <div>
                <h3 className="text-base font-bold text-deep-plum">Off-Peak Dynamic Yield Rules</h3>
                <p className="text-xs text-muted">
                  Automatically apply percentage discounts to client bookings scheduled during slow hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRuleModal(true)}
                className="px-4 py-2 bg-primary-rose text-white text-xs font-bold rounded-2xl hover:bg-primary-rose/90 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Discount Rule</span>
              </button>
            </div>

            {loadingRules ? (
              <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary-rose" />
                <span>Loading discount rules...</span>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-border-color shadow-xs space-y-2">
                <Percent className="w-8 h-8 text-muted mx-auto mb-2" />
                <h4 className="font-serif font-bold text-deep-plum text-base">No Off-Peak Rules Defined</h4>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Create rules to incentivize bookings during slow weekday mornings (e.g., Tuesday & Wednesday 10 AM - 1 PM with 20% off).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rules.map(rule => (
                  <div key={rule.id} className="bg-white p-6 rounded-3xl border border-border-color shadow-xs space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-serif font-bold text-primary-rose">
                        {rule.discountPercentage}% OFF
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleRuleStatus(rule)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          rule.isActive 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-deep-plum">{rule.name}</h4>
                      <p className="text-xs text-muted flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{rule.startTime} - {rule.endTime}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {rule.daysOfWeek.split(',').map((day, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-ivory border border-border-color text-[10px] text-deep-plum">
                          {day.trim().slice(0, 3)}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-border-color/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-xs text-muted hover:text-danger flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Rule</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EMAIL SMTP CONFIGURATION                                           */}
        {/* ========================================================================= */}
        {activeTab === 'smtp' && (
          <div className="space-y-6 animate-fade-in">
            {/* Explainer Banner */}
            <div className="bg-gradient-to-r from-deep-plum via-deep-plum/95 to-primary-rose text-white p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <div className="max-w-2xl space-y-2">
                <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold uppercase tracking-wider text-rose-tint">
                  Custom Salon Email Relay
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold">
                  Email SMTP Relay Settings
                </h3>
                <p className="text-xs sm:text-sm text-soft-blush/90 leading-relaxed">
                  Configure your salon's dedicated SMTP provider to deliver booking confirmations, 24h & 2h reminders, and re-engagement campaigns directly through your trusted email domain.
                </p>
              </div>
            </div>

            {/* Quick Provider Presets */}
            <div className="bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted block">
                Quick Setup Presets (Click to Auto-Fill)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="p-3 rounded-2xl bg-ivory hover:bg-soft-blush/70 border border-border-color text-left transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-deep-plum block group-hover:text-primary-rose">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-muted font-mono block truncate mt-0.5">
                      {preset.host}:{preset.port}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SMTP Settings Form & Live Test Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form (8 cols) */}
              <form onSubmit={handleSaveSmtp} className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-border-color shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-border-color pb-4">
                  <div>
                    <h4 className="text-base font-bold text-deep-plum">SMTP Relay Credentials</h4>
                    <p className="text-xs text-muted">You can provide the email key and secret now or whenever you are ready.</p>
                  </div>
                  
                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-semibold text-deep-plum">Enable Custom SMTP</span>
                    <input
                      type="checkbox"
                      checked={smtpConfig.isConfigured}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, isConfigured: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary-rose border-border-color focus:ring-primary-rose"
                    />
                  </label>
                </div>

                {loadingSmtp ? (
                  <div className="py-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-rose" />
                    <span>Loading SMTP settings...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Host */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block">
                          SMTP Server / Host <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={smtpConfig.smtpHost}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                          placeholder="e.g. smtp-relay.brevo.com or smtp.gmail.com"
                          className="w-full px-3.5 py-2.5 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum font-mono focus:bg-white focus:ring-1 focus:ring-primary-rose"
                        />
                      </div>

                      {/* Port */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block">
                          Port <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          value={smtpConfig.smtpPort}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtpPort: Number(e.target.value) }))}
                          placeholder="587"
                          className="w-full px-3.5 py-2.5 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum font-mono focus:bg-white focus:ring-1 focus:ring-primary-rose"
                        />
                      </div>
                    </div>

                    {/* Brevo Quick Setup Helper */}
                    <div className="flex items-center justify-between p-3 bg-soft-blush/60 rounded-xl border border-dusty-rose/40">
                      <div>
                        <span className="text-xs font-semibold text-deep-plum block">F&R Platform Brevo Relay Helper</span>
                        <span className="text-[11px] text-muted block">Pre-fill Brevo relay host, port, username, and verified sender.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSmtpConfig(prev => ({
                            ...prev,
                            smtpHost: 'api.brevo.com',
                            smtpPort: 443,
                            smtpUsername: 'c165e2001@smtp-brevo.com',
                            senderEmail: 'rufnixstudio@gmail.com',
                            senderName: 'F&R Beauty Studio',
                            smtpEnableSsl: true,
                            isConfigured: true
                          }));
                          setFeedback({ type: 'success', text: 'Pre-filled Brevo API (Port 443 HTTPS)! Enter your Brevo API Key (xkeysib-...) in the password field.' });
                        }}
                        className="px-3 py-1.5 bg-primary-rose hover:bg-primary-rose/90 text-white text-xs font-medium rounded-lg transition-colors shrink-0 shadow-2xs"
                      >
                        Auto-Fill Brevo (Port 443)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Username / Key */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block">
                            Email Key / Username
                          </label>
                          <span className="text-[10px] text-muted">For Brevo: SMTP login</span>
                        </div>
                        <input
                          type="text"
                          value={smtpConfig.smtpUsername}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtpUsername: e.target.value }))}
                          placeholder="e.g. c165e2001@smtp-brevo.com"
                          className="w-full px-3.5 py-2.5 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum font-mono focus:bg-white focus:ring-1 focus:ring-primary-rose"
                        />
                        {smtpConfig.smtpHost?.includes('brevo') && smtpConfig.smtpUsername?.includes('@') && !smtpConfig.smtpUsername.toLowerCase().endsWith('@smtp-brevo.com') && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-0.5">
                            <span className="font-bold block">Brevo Login Notice:</span>
                            <span>Brevo requires your relay login username (<strong>c165e2001@smtp-brevo.com</strong>). Your email (<strong>{smtpConfig.smtpUsername}</strong>) will automatically be used as the Sender Address below.</span>
                          </div>
                        )}
                        <p className="text-[10px] text-muted">Use Brevo SMTP login (not your personal Gmail)</p>
                      </div>

                      {/* Password / Secret */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block">
                            Email Secret / Password
                          </label>
                          {smtpConfig.hasPassword && !smtpConfig.smtpPassword && (
                            <span className="text-[10px] text-emerald-700 font-semibold">Secret configured</span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showSmtpPassword ? 'text' : 'password'}
                            value={smtpConfig.smtpPassword}
                            onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                            placeholder={smtpConfig.hasPassword ? '•••••••• (leave blank to keep)' : 'Brevo API Key (xkeysib-...) or SMTP Key'}
                            className="w-full px-3.5 py-2.5 pr-10 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum font-mono focus:bg-white focus:ring-1 focus:ring-primary-rose"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-deep-plum p-1"
                          >
                            {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {smtpConfig.smtpPassword?.startsWith('xsmtpsib-') && (
                          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-0.5">
                            <span className="font-bold block">Railway Notice:</span>
                            <span>You entered an SMTP key (<code>xsmtpsib-...</code>). Railway firewall blocks outbound SMTP ports 587/465. To bypass this, generate a <strong>Brevo API Key</strong> (starts with <code>xkeysib-...</code>) in Brevo &gt; SMTP &amp; API &gt; API Keys.</span>
                          </div>
                        )}
                        <p className="text-[10px] text-muted">For Railway: Use Brevo API Key (xkeysib-...) to avoid SMTP port blocks</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sender Email */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block">
                          Sender Email Address
                        </label>
                        <input
                          type="email"
                          value={smtpConfig.senderEmail}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, senderEmail: e.target.value }))}
                          placeholder="notifications@yourdomain.com"
                          className="w-full px-3.5 py-2.5 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum focus:bg-white focus:ring-1 focus:ring-primary-rose"
                        />
                      </div>

                      {/* Sender Display Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block">
                          Sender Display Name
                        </label>
                        <input
                          type="text"
                          value={smtpConfig.senderName}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, senderName: e.target.value }))}
                          placeholder="F&R Beauty Studio"
                          className="w-full px-3.5 py-2.5 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum focus:bg-white focus:ring-1 focus:ring-primary-rose"
                        />
                      </div>
                    </div>

                    {/* Enable SSL / TLS Checkbox */}
                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={smtpConfig.smtpEnableSsl}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtpEnableSsl: e.target.checked }))}
                          className="w-4 h-4 rounded text-primary-rose border-border-color focus:ring-primary-rose"
                        />
                        <span className="text-xs font-semibold text-deep-plum">Enable SSL / TLS Security (Recommended for Port 587/465)</span>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-border-color flex justify-end">
                      <button
                        type="submit"
                        disabled={savingSmtp}
                        className="px-6 py-2.5 bg-primary-rose text-white text-xs font-bold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {savingSmtp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Settings...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save SMTP Settings</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>

              {/* Live Test Panel & Information (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* Send Test Email Card */}
                <div className="bg-white rounded-3xl p-6 border border-border-color shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-deep-plum">
                    <Mail className="w-4 h-4 text-primary-rose" />
                    <h4 className="text-sm font-bold">Verify Connection</h4>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Send a test confirmation email to verify that your host and credentials can authenticate and deliver successfully.
                  </p>

                  <form onSubmit={handleTestSmtp} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-deep-plum block mb-1">
                        Test Recipient Email
                      </label>
                      <input
                        type="email"
                        required
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 bg-ivory border border-border-color rounded-xl text-xs text-deep-plum focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={testingSmtp || !smtpConfig.smtpHost}
                      className="w-full py-2.5 bg-deep-plum hover:bg-deep-plum/90 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {testingSmtp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing SMTP Relay...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Test Email</span>
                        </>
                      )}
                    </button>
                  </form>

                  {testResult && (
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      testResult.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Information Card */}
                <div className="bg-ivory rounded-3xl p-6 border border-border-color/80 space-y-2.5 text-xs text-muted">
                  <div className="flex items-center gap-1.5 font-bold text-deep-plum">
                    <HelpCircle className="w-4 h-4 text-primary-rose" />
                    <span>Providing Keys Later</span>
                  </div>
                  <p className="leading-relaxed">
                    You can save your host and sender details right now. When you obtain your Email API key and secret, simply paste them into this panel and click Save.
                  </p>
                  <p className="leading-relaxed text-[11px] text-muted/90 pt-1 border-t border-border-color/50">
                    If custom SMTP is disabled, the platform will automatically use standard fallback notification queues.
                  </p>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* Modal: Create Dynamic Discount Rule */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-deep-plum/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-border-color shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-color pb-3">
              <h3 className="font-serif font-bold text-deep-plum text-lg">New Dynamic Yield Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="p-1 text-muted hover:text-deep-plum">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuesday Morning Flash 20%"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 bg-ivory border border-border-color rounded-xl text-xs font-semibold text-deep-plum"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                  Active Days of Week
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => {
                    const active = ruleDays.includes(day.key);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => handleToggleDay(day.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          active 
                            ? 'bg-deep-plum text-white border-deep-plum' 
                            : 'bg-ivory border-border-color text-muted hover:text-deep-plum'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={ruleStartTime}
                    onChange={(e) => setRuleStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-ivory border border-border-color rounded-xl text-xs font-mono font-bold text-deep-plum"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={ruleEndTime}
                    onChange={(e) => setRuleEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-ivory border border-border-color rounded-xl text-xs font-mono font-bold text-deep-plum"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-deep-plum mb-1">
                  Discount Percentage ({ruleDiscount}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={ruleDiscount}
                  onChange={(e) => setRuleDiscount(Number(e.target.value))}
                  className="w-full accent-primary-rose cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-deep-plum"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="px-5 py-2 bg-primary-rose text-white text-xs font-bold rounded-xl hover:bg-primary-rose/90 transition-all shadow-xs disabled:opacity-50"
                >
                  {savingRule ? 'Saving...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
